# MiniFlashList

`MiniFlashList` is a small, readable version of
[FlashList v2](https://github.com/Shopify/flash-list) (`@shopify/flash-list`).
It keeps the ideas that make FlashList fast and leaves out everything else, so
you can read the whole engine in a few short files.

```tsx
import { MiniFlashList } from 'react-native-tiny-list';

<MiniFlashList
  data={items}
  renderItem={renderRow} // keep it stable, e.g. defined outside the component
  getItemType={(item) => (item.isHeader ? 'header' : 'row')}
/>;
```

If you are new to virtualized lists, read [`TinyList`](../TinyList) first.

## The big idea: reuse the cells

A list of 10,000 rows never shows more than a screenful at once. `TinyList`
already renders only the rows near the screen. But as you scroll, it throws
away the rows that leave and builds new ones from scratch for the rows that
arrive. Building native views is expensive, and it happens many times a second.

FlashList's answer is to **recycle**. It keeps a small set of cells, about one
screenful plus a margin. When a cell scrolls off the top, it isn't destroyed.
It moves to the bottom and shows the next row instead. Picture a team of
painters on a very long wall: they don't hire new painters as the wall goes
on, they repaint the same few boards.

```
  before scrolling                     after scrolling one row down

  cell A ─ row 0   ← leaves the window
  cell B ─ row 1                       cell B ─ row 1
  cell C ─ row 2                       cell C ─ row 2
  cell D ─ row 3                       cell D ─ row 3
                                       cell A ─ row 4   ← same cell, new row
```

In React terms, a "cell" is a React key. MiniFlashList gives its cells keys
like `"0"`, `"1"`, `"2"` that have nothing to do with the rows. When a key
moves to a new row, React sees the same component with new props. It updates
the existing views (new text, new position) instead of unmounting and
remounting them.

## How it works, step by step

Every render goes through four steps. Each step lives in its own file.

### Step 1: know where every row is ([`layout-manager.ts`](layout-manager.ts))

The list keeps a small record for **every** row, rendered or not: where it
starts (`offset`) and how tall it is (`size`). Rows are stacked one after
another, so a row's offset is the sum of the sizes above it.

What about rows that have never been on screen? Their height is a guess: the
average height of the rows measured so far, each counted once at its latest
height, or 100 px before the first measurement. The guesses get better as you
scroll.

Every cell is placed with `position: 'absolute'` at its row's offset, inside
one tall view whose height is the sum of all rows. That tall view is what
gives the scroll bar its length.

### Step 2: decide which rows to show ([`engaged-indices.ts`](engaged-indices.ts))

The rows to render, called the "engaged" rows, are those within the screen
plus 250 px above and below it (`drawDistance`). The margin hides the moment
when a new row is drawn.

Offsets only grow from top to bottom, so finding the first and last engaged
row is a binary search (`findFirstIndex`), not a scan through 10,000 rows.

The scroll handler runs this check on every scroll event, but it re-renders
only when the set of engaged rows has changed. Scrolling within a row's height
costs almost nothing.

### Step 3: hand out the cells ([`render-stack.ts`](render-stack.ts))

The render stack is a map from cell key to the row that cell shows. Each
render it is updated in three moves:

1. **Keep.** A cell whose row is still engaged keeps it. Every other cell
   becomes free.
2. **Reuse.** Each engaged row that has no cell takes a free cell of the
   **same type**, or a brand-new cell if none is free.
3. **Park.** Free cells that nobody took stay mounted off screen at their old
   position, ready for the next scroll.

Why "same type"? A header and a row are different trees of views. Turning a
header cell into a row means rebuilding it, so nothing is saved. `getItemType`
tells the list which rows can share cells.

### Step 4: measure and fix before anyone sees ([`MiniFlashList.tsx`](MiniFlashList.tsx), [`measure-layout.ts`](measure-layout.ts))

New rows are first placed using guessed heights. The real heights are only
known after React has created the views. If those wrong positions reached the
screen, rows would visibly jump.

FlashList avoids this with `useLayoutEffect`. It runs after React has
updated the views but **before** the frame is painted:

1. Measure the screen and every mounted cell. On React Native's new
   architecture, `measureLayout` answers immediately, so this works.
2. Hand the real heights to the layout manager, which moves the rows below.
3. If anything moved, render again. React runs that render before painting
   too.

The loop usually settles in two or three passes. A cap of 10 passes stops a
layout that never settles (FlashList allows 40). A cell's own `onLayout` also
catches size changes the list didn't cause, such as a row that expands when
tapped, and starts a new round of measuring.

### Where the state lives

The layout records, the render stack and the cell refs are plain JavaScript
objects that live as long as the list. React state is only a counter that
means "render again". This lets the scroll handler and the layout effect
change things immediately, without waiting for state updates to flow through
React. FlashList is built the same way.

## Compared to TinyList

| TinyList | MiniFlashList |
|---|---|
| Spacer views above and below the rendered rows | Absolutely positioned cells inside one tall view |
| Rows keyed by index: scrolling destroys old rows and builds new ones | Cells are recycled |
| Heights arrive from `onLayout` after paint, so rows jump | Heights are measured before paint |
| Unmeasured rows count as a fixed 50 px | Unmeasured rows use the average measured height |
| Scans every row to find the window | Binary search |

## Implemented from FlashList

Each line names the FlashList source it follows (paths under
`refs/flash-list/src/recyclerview/`).

- **Cell recycling with recycle keys.** React keys are cell ids, not row ids.
  Rows that stay engaged keep their key, and the rest reuse free keys
  (`RenderStackManager.sync`).
- **Recycling only within an item type** (`getItemType`, per-type pools in
  `RenderStackManager`).
- **Off-screen free cells stay mounted**, ready for reuse (`RenderStackManager`).
- **Keys of deleted rows are reused** for rows of the same type
  (`RenderStackManager.cleanup`).
- **A layout for every row**, with absolute positioning inside a container
  sized to the whole list (`LinearLayoutManager`, `ViewHolder`,
  `ViewHolderCollection`).
- **No size estimate from the user.** Unmeasured rows use a running average
  (`MultiTypeAverageWindow`, simplified, see below).
- **Binary search** for the rows in an offset range (`utils/findVisibleIndex.ts`).
- **`drawDistance`** buffer around the screen, default 250 px
  (`EngagedIndicesTracker`).
- **Re-rendering only when the engaged range changes** (`updateScrollOffset`
  returns a new range only on change).
- **Synchronous measurement in `useLayoutEffect`** and re-rendering before
  paint until the layout settles, with a cap (`RecyclerView.tsx` layout
  effects, `utils/measureLayout.ts`, `RenderTimeTracker`). The cap is 10
  passes here and 40 in FlashList.
- **`onLayout` fallback** for size changes the list didn't cause
  (`validateItemSize`).
- **Viewport resize handling** through the outer container's `onLayout`.
- **Tolerance for sub-pixel jitter**, so float noise doesn't trigger endless
  re-layouts (`areDimensionsEqual`, simplified to a fixed 0.5 px).
- **Mutable engine state, with React state only as a re-render trigger**
  (`RecyclerViewManager`, `setRenderId`).
- **Memoized cells**, so unchanged cells skip re-rendering (`ViewHolder`).
- **Web support** by reading DOM sizes directly (`utils/measureLayout.web.ts`).

## Not implemented

### Rendering engine

- **Velocity-based offset projection.** FlashList moves the window ahead by
  `velocity × render time` to reduce blank areas during flings.
- **Buffer skewed towards the scroll direction.** FlashList puts 70% of the
  buffer ahead of the scroll and 30% behind. When one end of the list leaves
  buffer unused, it moves that buffer to the other end.
- **Progressive first render.** FlashList mounts the first screen in growing
  batches, hides the list (`opacity: 0`) until the first layout settles, and
  adds the buffer only after the first paint. It also fires `onLoad`.
- **Bounded relayout.** Here every measurement recomputes all offsets (O(n)).
  FlashList recomputes only the rows near the change and finishes the rest
  later.
- **Per-type size estimates.** FlashList averages the last 5 measurements per
  item type. MiniFlashList averages all measured rows across all types.
- **Recycle pool limit** (`maxItemsInRecyclePool`).
- **Nested list coordination.** A parent FlashList waits for child FlashLists
  to settle before it commits (`LayoutCommitObserver`, pending children).

### Layouts

- `horizontal`, `inverted` and RTL support.
- Grid (`numColumns`) and `masonry` layouts, `overrideItemLayout` spans,
  `optimizeItemArrangement`.

### Data and scrolling

- `keyExtractor`. Here rows are identified by index, so layouts and keys follow
  the index.
- `maintainVisibleContentPosition` (scroll anchoring). Without it, inserting
  rows above the screen makes the content jump.
- `initialScrollIndex` and the ref API: `scrollToIndex`, `scrollToItem`,
  `scrollToOffset`, `scrollToEnd`, `scrollToTop`, `getFirstVisibleIndex`,
  `getLayout` and the rest of `FlashListRef`.
- `onEndReached` / `onStartReached` and their thresholds.
- `onViewableItemsChanged` and `viewabilityConfig`.
- Sticky headers (`stickyHeaderIndices`, `stickyHeaderConfig`).
- Pull to refresh (`refreshing`, `onRefresh`).

### Composition and API surface

- `ListHeaderComponent`, `ListFooterComponent`, `ListEmptyComponent`,
  `ItemSeparatorComponent`, `CellRendererComponent`, `renderScrollComponent`.
- `extraData`, `style`, `overrideProps`, and passing other props through to
  the `ScrollView`.
- Hooks and helpers: `useRecyclingState`, `useLayoutState`, `useMappingHelper`,
  `LayoutCommitObserver`, `onCommitLayoutEffect`, `AnimatedFlashList`, and the
  benchmark utilities.

## Known limitations

- **New architecture only**, like FlashList v2. On the old architecture
  `measureLayout` answers asynchronously, so the list would read zero
  heights. Web has the same problem and uses `measure-layout.web.ts`.
- **`renderItem` must be stable.** An inline arrow function re-renders every
  cell on every list render.
- **Row state survives recycling.** A recycled cell keeps the component state
  of the row it showed before. FlashList offers `useRecyclingState` to reset it.
- **Blank areas** can still appear when scrolling very fast.
