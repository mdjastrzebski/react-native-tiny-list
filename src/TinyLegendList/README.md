# TinyLegendList

`TinyLegendList` is a minimal version of [Legend List](https://github.com/LegendApp/legend-list)
(`@legendapp/list`). It keeps Legend List's core algorithm and drops
everything else, so the whole idea fits in a few short files.

```tsx
import { TinyLegendList } from 'react-native-tiny-list';

<TinyLegendList
  data={items}
  renderItem={renderRow} // keep it stable, e.g. defined outside the component
  keyExtractor={(item) => item.id}
  estimatedItemSize={60}
/>;
```

Read [`TinyList`](../TinyList) first. It shows the basic idea of a
virtualized list. This README explains what Legend List does differently.

## The big idea

A list of 10,000 rows can't render 10,000 views. It has to render only the
rows near the screen and pretend the rest are there. Legend List does this
with three tricks:

1. **A fixed set of containers.** Instead of mounting and unmounting rows,
   the list renders a small, stable set of empty wrapper views, called
   containers (about one screen's worth plus a buffer). Each container shows
   one row at a time and is placed with `position: absolute` at that row's
   offset. When a row scrolls far away, its container is handed to a row
   that is scrolling in.

2. **Guess first, then correct.** The list must know where every row is,
   even rows it has never rendered, to size the scroll content. So it
   guesses: every unrendered row is as tall as the average row seen so far.
   When a row renders and reports its real height, the list fixes the
   positions of the rows below it.

3. **Only the containers re-render.** The list itself never re-renders
   while you scroll. Each container listens to just two values, "which row
   do I show" and "where am I", and re-renders on its own when one of them
   changes. A container that only moves doesn't even re-run `renderItem`.

## One scroll, step by step

Say the viewport is 500 px tall, rows are about 100 px, and you scroll from
0 to 300 px. On each scroll event, `calculateItemsInView` runs:

1. **Update positions, if needed.** If a row reported a new height since the
   last pass, recompute the positions of the rows below it. Otherwise the
   cached positions are still good, so do nothing.
2. **Compute the buffered area.** That's the viewport plus some extra above
   and below, so rows are ready before they scroll in. The extra leans
   towards the scroll direction: scrolling down, it is 125 px above and
   375 px below (0.5 × and 1.5 × `drawDistance`). At 300 px that is
   175–1175 px.
3. **Quit early if nothing new is needed.** The list remembers the area its
   rendered rows cover. If the buffered area still fits inside it, every row
   needed is already on screen and the pass ends here. Most scroll events
   stop at this step.
4. **Find the rows in the area.** Start at the first row from the last pass
   and walk up or down until you reach the area's edges. A small scroll
   moves only a few rows, so this takes a few steps.
5. **Give each new row a container.** Rows without a container take, in
   order: an unused container; or the container of the row farthest outside
   the area (the nearest ones may scroll back soon); or a brand new
   container.
6. **Tell the containers.** Publish each container's row and position. Only
   the containers whose values changed re-render.

Rows that leave the area are not unmounted. They stay in their container,
off screen, until the container is needed. Scroll back a little and they are
still there, with nothing to render.

## Where each step lives

| File                                                           | What it does                                                          | Legend List equivalent                                                                        |
| -------------------------------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| [`item-layout.ts`](item-layout.ts)                             | Measured and estimated sizes, cached positions, the running average   | `src/core/updateItemPositions.ts`, `src/core/updateItemSizes.ts`, `src/utils/getItemSize.ts`  |
| [`buffered-range.ts`](buffered-range.ts)                       | Buffered area, finding the rows in it, the "nothing new needed" check | The window loop and `scrollForNextCalculateItemsInView` in `src/core/calculateItemsInView.ts` |
| [`find-available-containers.ts`](find-available-containers.ts) | Picks a container for each new row                                    | `src/utils/findAvailableContainers.ts`                                                        |
| [`list-state.ts`](list-state.ts)                               | The list's mutable state, and adapting it to new data                 | `InternalState` in `src/types.internal.ts`                                                    |
| [`calculate-items-in-view.ts`](calculate-items-in-view.ts)     | The pass that ties the steps together                                 | `src/core/calculateItemsInView.ts`                                                            |
| [`signals.ts`](signals.ts)                                     | A tiny store that lets each container listen to its own values        | `set$` / `peek$` / `useArr$` in `src/state/state.tsx`                                         |
| [`Containers.tsx`](Containers.tsx)                             | The content view and the containers                                   | `src/components/Containers.tsx`, `ContainerSlot.tsx`, `Container.tsx`, `PositionView.tsx`     |
| [`TinyLegendList.tsx`](TinyLegendList.tsx)                     | Wires scroll, viewport and row measurements to the pass               | `src/components/LegendList.tsx`                                                               |

## What is implemented

Each item is a simplified version of the Legend List mechanism named after
the colon.

- **Container pool with absolute positioning:** containers keyed by id
  inside one view as tall as the content (`Containers`, `ContainerSlot`,
  `PositionView`).
- **Container reuse:** unused containers first, then containers out of
  range, farthest first, then new containers (`findAvailableContainers`).
- **Remount on reuse:** a reused container remounts its row's views, so no
  state leaks from the previous row. This is Legend List's default,
  `recycleItems={false}`.
- **Out-of-range rows stay mounted:** a row leaves only when its container
  is reused.
- **Estimate-first sizing:** `estimatedItemSize` (default 100) before any
  measurement, then the running average of measured rows (`getItemSize`,
  `averageSizes`). Rows measured at 0 don't count towards it.
- **Measured vs. counted sizes:** `knownSizes` and `sizes`, like
  `sizesKnown` and `sizes`.
- **Item keys:** `keyExtractor` (default: the index). Measured sizes are
  stored by key and containers hold keys, so inserting or reordering rows
  keeps their sizes and mounted views (`idCache`, `indexByKey`).
- **Incremental position updates:** positions recompute only from the first
  changed row (`positionRecalculationStartIndex`).
- **Direction-biased buffer:** 1.5 × `drawDistance` ahead, 0.5 × behind
  (default `drawDistance` 250).
- **Overscroll clamp:** bounce past either end doesn't empty the screen.
- **Window search from the previous start:** walks from the last first row
  instead of scanning (`startBufferedId`).
- **Skip the pass while covered:** `scrollForNextCalculateItemsInView`.
- **Signals:** per-container item key, index, data and position, plus
  `totalSize` and `numContainers`. The list component subscribes to nothing,
  and new data re-renders only the containers whose item changed.
- **Memoized row content:** moving a container doesn't re-run `renderItem`
  (`renderedItemInfo` in `Container`).
- **Data changes:** positions recompute from the first changed key, and
  containers of removed rows are freed.

## What is not implemented

These Legend List features are left out on purpose, to keep the core easy to
see.

**Scroll stability**

- `maintainVisibleContentPosition`: when a row above the viewport changes
  height, Legend List shifts the scroll offset so the visible rows don't
  jump. Here they jump.
- `maintainScrollAtEnd`, `alignItemsAtEnd`, `anchoredEndSpace` (chat UIs).

**Sizing and measurement**

- Measuring all changed containers in one layout-effect pass after each
  commit (new architecture). Here each container reports through its own
  `onLayout`, a frame after paint.
- `getFixedItemSize`, and per-type averages via `getItemType`.
- Filtering out sub-pixel measurement noise.
- `experimental_hideItemsUntilMeasured`.

**Rendering window**

- Velocity projection: shifting the buffer further ahead when scrolling
  fast.
- A smaller first-render draw distance and the `"visible-first"` mode for
  big jumps.
- Pre-allocating and pre-rendering spare containers on mount
  (`numContainersPooled`).
- Stopping the position sweep early while scrolling fast.

**Containers**

- `recycleItems={true}`, with `useRecyclingState` and `useRecyclingEffect`.
- Matching containers by `getItemType`.
- `alwaysRender`.

**Data and identity**

- `dataKey`, `dataVersion`, `extraData`, `itemsAreEqual`, children mode.

**Initial scroll and imperative API**

- `initialScrollIndex`, `initialScrollOffset`, `initialScrollAtEnd`, and the
  hidden "bootstrap" pass that settles them before showing the list.
- `onReady`, `onLoad`, and keeping the list invisible until the first
  layout.
- The ref API: `scrollToIndex`, `scrollToOffset`, `scrollToEnd`,
  `scrollToItem`, `getState`, `setItemSize`, `clearCaches` and the rest.

**Callbacks**

- `onEndReached`, `onStartReached`, `onViewableItemsChanged`,
  `onFirstVisibleItemChanged`, `onItemSizeChanged`, `onMetricsChange`,
  `onStickyHeaderChange`, and viewability hooks.

**Layout**

- Grids (`numColumns`, `columnWrapperStyle`, `overrideItemLayout`),
  horizontal lists, RTL.
- `ListHeaderComponent`, `ListFooterComponent`, `ListEmptyComponent`,
  `ItemSeparatorComponent`.
- Sticky headers, `snapToIndices`, `onRefresh` / `refreshing`.

**Platforms and integrations**

- The web (React DOM) implementation and `useWindowScroll`.
- Reanimated, keyboard, Animated and SectionList integrations.
- `experimental_adaptiveRender`.

## Known limitations

- `renderItem` must be stable. An inline arrow re-renders every container on
  every list render, because containers are memoized on their props.
- New rows can briefly appear at their estimated positions, because their
  heights arrive in `onLayout` after paint.
- Scrolling up into rows that were never measured (after a fast fling)
  moves the content when they measure, because there is no scroll
  anchoring.
- Changing `drawDistance` after mount takes effect on the next scroll.
  Changing `estimatedItemSize` affects only rows laid out after the change,
  and only until the first row is measured.
- Blank areas can appear during very fast scrolling.
