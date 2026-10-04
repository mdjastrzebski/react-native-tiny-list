# NaiveList

`NaiveList` is the simplest virtualized list we could write that still works. It exists to show the core idea behind React Native's `FlatList` with as little machinery as possible.

```tsx
<NaiveList
  data={items}
  renderItem={({ item, index }) => <Row item={item} />}
/>
```

## The problem

Rendering 10,000 rows in a `ScrollView` mounts 10,000 views, even though only about 10 are visible. That's slow to mount and wastes memory.

A virtualized list renders only the rows near the screen. Everything else is replaced with empty space of the right height, so the scroll bar and scroll position still behave as if every row were there.

## The core idea

The content of the `ScrollView` is always three parts:

```
┌──────────────────────────┐
│  spacer (sizerBefore)    │  empty View, as tall as all items above the window
├──────────────────────────┤
│  item 30                 │
│  item 31                 │  ← render window: the only real items
│  ...                     │
│  item 59                 │
├──────────────────────────┤
│  spacer (sizerAfter)     │  empty View, as tall as all items below the window
└──────────────────────────┘
```

As you scroll, the window moves: items that leave it unmount, items that enter it mount, and the two spacers grow or shrink to keep the total height the same.

## How it works, step by step

1. **Measure the viewport.** The `ScrollView`'s `onLayout` gives the visible height (`viewportSize`).
2. **Track the scroll position.** `onScroll` gives the current offset (`scrollOffset`). The final position after a drag or fling arrives only in `onScrollEndDrag` / `onMomentumScrollEnd`, so those are handled too.
3. **Pick the render window.** `computeRenderWindow` (in `render-window.ts`) takes the visible area and adds one viewport of buffer above and one below, so items mount a little before they scroll into view. It then walks the items from the top, adding up their heights:
   - items that end above the window go into `sizerBefore`,
   - items that start below the window go into `sizerAfter`,
   - everything in between is rendered.
4. **Guess unknown sizes.** An item that has never been rendered has no known height, so it counts as `DEFAULT_ITEM_SIZE` (50 px).
5. **Measure rendered items.** Each rendered item is wrapped in a `View` whose `onLayout` reports its real height. Heights are cached by index. When one differs from the cached value, the list re-renders, and the spacers and window are recomputed with the better number.

That's the whole algorithm: measure, track, pick a window, guess, correct.

## Known flaws

These are expected, and left in on purpose to keep the code readable:

- **Blank areas when scrolling fast.** If you scroll more than one viewport between renders, you see empty spacer until the new items mount.
- **Jumps.** When an item's real height differs from the 50 px guess, the spacer above it changes size and the content shifts.
- **The first frame is empty.** Nothing renders until the viewport has been measured.
- **Sizes are cached by index, not by item.** After inserting, removing or reordering items, the cached heights belong to the wrong items until they are measured again.
- **Every scroll event re-renders the list.** Each scroll event (up to about one every 16 ms) recomputes the window and re-renders every visible item.
- **Finding the window is a linear scan.** It walks every item on each render, which is O(n).

## Compared with React Native's `FlatList`

### Implemented

- `data` and `renderItem({ item, index })`.
- Windowing: only items near the viewport are mounted, with spacer views standing in for the rest.
- Measuring each item's height with `onLayout`.
- A buffer around the viewport. `NaiveList` uses one viewport above and one below. `FlatList`'s `windowSize` defaults to 21 viewports: 10 above, 10 below.

### Not implemented

**Data and rendering**
- `keyExtractor`. Items are keyed by index.
- `extraData`. Not needed, because `NaiveList` doesn't memoize items.
- `ListHeaderComponent`, `ListFooterComponent`, `ListEmptyComponent`.
- `ItemSeparatorComponent`.
- `numColumns`, `columnWrapperStyle` (grids).
- `horizontal`, `inverted`.

**Sizing and windowing**
- `getItemLayout` (known item sizes, which skip measuring).
- `initialNumToRender`, `windowSize`, `maxToRenderPerBatch`, `updateCellsBatchingPeriod`. `FlatList` adds cells in batches and spreads that work over time. `NaiveList` renders the whole window on every update.
- `removeClippedSubviews`.

**Scrolling**
- Ref methods: `scrollToIndex`, `scrollToOffset`, `scrollToEnd`, `scrollToItem`.
- `initialScrollIndex`.
- `maintainVisibleContentPosition` (keeping content still when items are added above).
- `stickyHeaderIndices`.
- `ScrollView` props passed through, such as `style`, `contentContainerStyle`, `refreshControl` and `onScroll`.

**Callbacks**
- `onEndReached` / `onStartReached` (infinite scroll).
- `onViewableItemsChanged`, `viewabilityConfig`.
- `onRefresh` / `refreshing` (pull to refresh).
