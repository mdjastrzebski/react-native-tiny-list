# MiniFlashList

`MiniFlashList` is a minimal version of [FlashList v2](https://github.com/Shopify/flash-list)
(`@shopify/flash-list`). It keeps FlashList's core mechanisms and drops
everything else, so each idea fits in a short file.

```tsx
import { MiniFlashList } from 'react-native-simple-list';

<MiniFlashList
  data={items}
  renderItem={renderRow} // keep it stable, e.g. defined outside the component
  getItemType={(item) => (item.isHeader ? 'header' : 'row')}
/>;
```

Read [`NaiveList`](../NaiveList) first. `MiniFlashList` fixes its main flaws:

| NaiveList | MiniFlashList |
|---|---|
| Spacer views above and below the rendered items | Every cell is absolutely positioned inside one view as tall as the content |
| Items are keyed by index, so scrolling unmounts old rows and mounts new ones | Cells are **recycled**: a row that scrolls out is reused for a row that scrolls in |
| Sizes come from `onLayout`, a frame after paint, so items jump | Sizes are measured **synchronously before paint** |
| Unmeasured items count as a fixed 50 px | Unmeasured items use the **average** of the measured ones |
| Re-renders on every scroll event | Re-renders only when the set of rendered items changes |
| Linear scan over all items | Binary search |

## The mechanisms

### 1. A layout for every item ([`layout-manager.ts`](layout-manager.ts))

`LinearLayoutManager` stores `{ offset, size, isMeasured }` for every item,
rendered or not. Items are stacked one after another. Before an item is
measured, its size is the average of all measurements so far (100 px before
the first one). The list content is a single view whose height is
`getContentSize()`, and each cell is placed at `top: offset`.

Because offsets only grow, finding the items in an offset range is a binary
search (`findFirstIndex`).

FlashList: `src/recyclerview/layout-managers/LayoutManager.ts` and
`LinearLayoutManager.ts`. FlashList also has grid and masonry managers, and
keeps the average per item type (`MultiTypeAverageWindow`).

### 2. Engaged indices ([`engaged-indices.ts`](engaged-indices.ts))

The "engaged" items are the ones that get rendered: those overlapping the
viewport plus `drawDistance` (250 px) above and below it. The scroll handler
recomputes this range and re-renders only if it changed.

FlashList: `src/recyclerview/helpers/EngagedIndicesTracker.ts`.

### 3. Recycling with a render stack ([`render-stack.ts`](render-stack.ts))

This is the core idea of FlashList. React keys are **recycle keys** ("0",
"1", …), not item ids. The render stack maps each key to the item it renders
right now. On every render, `RenderStack.sync`:

1. lets engaged items keep their key and frees every other key;
2. gives each engaged item without a key a free key of the **same item type**,
   or a new key if there is none;
3. keeps unused free keys mounted off screen, ready for the next scroll.

When a key moves to another item, React sees the same `ViewHolder` with new
props. It re-runs `renderItem` and updates the existing native views instead
of destroying them and creating new ones. Keys move only within an item type
(`getItemType`), because a header cell would have to be rebuilt from scratch
to show a row anyway.

So a list of 10,000 rows mounts only about as many cells as fit in the
window, however far the user scrolls.

FlashList: `src/recyclerview/RenderStackManager.ts`, rendered by
`ViewHolderCollection.tsx` and `ViewHolder.tsx`.

### 4. Measure before paint ([`MiniFlashList.tsx`](MiniFlashList.tsx), [`measure-layout.ts`](measure-layout.ts))

A `useLayoutEffect` with no dependency array runs after every commit, before
the frame is painted. It:

1. measures the viewport and every mounted cell with `measureLayout`, which
   is synchronous on the new architecture (Fabric);
2. passes the sizes to the layout manager;
3. if anything moved, triggers another render, which React also runs before
   paint.

The loop stops once nothing changes, so the user never sees a cell at its
estimated position. A cap of 10 renders guards against a layout that never
settles. Each `ViewHolder` also has an `onLayout` handler. It catches size
changes the list did not cause, such as a row that expands on tap, and
triggers a new measurement pass.

FlashList: the two layout effects and `validateItemSize` in
`src/recyclerview/RecyclerView.tsx`, and `src/recyclerview/utils/measureLayout.ts`.

### 5. Mutable state, React as a trigger

The layout manager, render stack and cell refs are plain mutable objects
created once per list. React state is only a counter that means "render
again". This lets the scroll handler and the layout effect update the list
synchronously, without waiting for React state to flow through.

FlashList: `RecyclerViewManager.ts` and `setRenderId` in `RecyclerView.tsx`.

## What is left out

FlashList does much more. These parts are missing on purpose, to keep the
core ideas easy to see:

- **Scroll direction and velocity.** FlashList puts 70% of the buffer in the
  scroll direction and shifts the window by `velocity × render time`.
- **Progressive first render.** FlashList mounts the first screen in growing
  batches, hides the list (`opacity: 0`) until the first layout settles, and
  adds the buffer only after the first paint.
- **Bounded relayout.** Every measurement here recomputes all offsets (O(n)).
  FlashList recomputes only the items near the change and finishes the rest
  later.
- **`keyExtractor` and scroll anchoring.** Layouts and keys follow the item's
  index, so inserting items above the viewport makes the content jump.
  FlashList uses `keyExtractor` and `maintainVisibleContentPosition` to keep
  the visible items in place.
- **A recycle pool limit** (`maxItemsInRecyclePool`), headers and footers,
  separators, horizontal, grid and masonry layouts, sticky headers,
  `scrollToIndex`, viewability callbacks, `onEndReached`, nested lists.

## Known limitations

- New architecture only, like FlashList v2. On the old architecture
  `measureLayout` calls back asynchronously, so `measure-layout.ts` would read
  zero sizes. Web has the same problem and uses `measure-layout.web.ts`, which
  reads DOM sizes directly.
- `renderItem` must be stable. An inline arrow re-renders every cell on every
  list render, because `ViewHolder` is memoized on its props.
- Component state inside a row survives recycling: a recycled cell keeps the
  state of the item it showed before. FlashList offers `useRecyclingState` to
  reset it.
- Blank areas can still appear during very fast scrolling.
