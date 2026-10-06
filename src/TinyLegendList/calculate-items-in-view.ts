import {
  computeBufferedArea,
  containsArea,
  DEFAULT_DRAW_DISTANCE,
  findItemsInArea,
  getCoveredArea,
  type Area,
  type IndexRange,
  type ScrollDirection,
} from './buffered-range';
import { findAvailableContainers } from './find-available-containers';
import {
  createItemLayout,
  DEFAULT_ESTIMATED_ITEM_SIZE,
  setItemCount,
  updateItemPositions,
  type ItemLayout,
} from './item-layout';
import type { SignalStore } from './signals';

/**
 * Everything the list knows, in one mutable object like Legend List's
 * `InternalState`. Components never read it; they read signals instead.
 */
export interface ListState {
  estimatedItemSize: number;
  drawDistance: number;
  layout: ItemLayout;
  /** Scroll offset and viewport height. */
  scroll: number;
  scrollLength: number;
  scrollDirection: ScrollDirection;
  /** Items to render, from the last pass. */
  range: IndexRange | null;
  /** Area covered by `range`; while the buffered area stays inside, skip. */
  coveredArea: Area | undefined;
  /** Item index shown by each container; `undefined` for an unused one. */
  containerItems: Array<number | undefined>;
}

export function createListState(): ListState {
  return {
    estimatedItemSize: DEFAULT_ESTIMATED_ITEM_SIZE,
    drawDistance: DEFAULT_DRAW_DISTANCE,
    layout: createItemLayout(),
    scroll: 0,
    scrollLength: 0,
    scrollDirection: 0,
    range: null,
    coveredArea: undefined,
    containerItems: [],
  };
}

/** Adapts the list to new data and frees containers of removed items. */
export function setListItemCount(state: ListState, itemCount: number) {
  setItemCount(state.layout, itemCount);
  state.containerItems = state.containerItems.map((itemIndex) =>
    itemIndex !== undefined && itemIndex < itemCount ? itemIndex : undefined
  );
  state.coveredArea = undefined;
}

/**
 * The core of Legend List. Runs after every scroll event, measurement and
 * data change, and publishes the result through signals:
 *
 * 1. recompute positions if a size changed;
 * 2. skip the rest if the rendered items still cover the buffered area;
 * 3. find the items in the buffered area;
 * 4. give each new item a container, reusing far-away ones;
 * 5. move every container to its item's position.
 */
export function calculateItemsInView(state: ListState, store: SignalStore) {
  const { layout } = state;

  // 1. Positions change only after a measurement or a data change.
  if (updateItemPositions(layout, state.estimatedItemSize)) {
    state.coveredArea = undefined;
    store.set('totalSize', layout.totalSize);
  }

  if (state.scrollLength === 0) {
    // Not laid out yet: nothing is visible.
    return;
  }

  // 2. Most scroll events land here: no item enters the buffered area.
  const bufferedArea = computeBufferedArea({
    scroll: state.scroll,
    scrollLength: state.scrollLength,
    totalSize: layout.totalSize,
    drawDistance: state.drawDistance,
    scrollDirection: state.scrollDirection,
  });
  if (state.coveredArea && containsArea(state.coveredArea, bufferedArea)) {
    return;
  }

  // 3. Find the items to render, starting from the previous first item.
  const range = findItemsInArea({
    positions: layout.positions,
    sizes: layout.sizes,
    area: bufferedArea,
    searchFromIndex: state.range?.startIndex ?? 0,
  });
  state.range = range;
  state.coveredArea = range
    ? getCoveredArea(layout.positions, layout.sizes, range)
    : undefined;

  // 4. Items without a container get one. Containers that are not reused
  // keep showing their old item off screen, ready if it scrolls back in.
  if (range) {
    const renderedItems = new Set(state.containerItems);
    const neededItems: number[] = [];
    for (let index = range.startIndex; index <= range.endIndex; index++) {
      if (!renderedItems.has(index)) {
        neededItems.push(index);
      }
    }

    const containers = findAvailableContainers({
      containerItems: state.containerItems,
      neededItems,
      range,
    });
    containers.forEach((container, order) => {
      state.containerItems[container] = neededItems[order];
    });
  }

  // 5. Publish. `set` notifies only on change, so only containers that got a
  // new item or moved re-render.
  store.set('numContainers', state.containerItems.length);
  state.containerItems.forEach((itemIndex, container) => {
    store.set(`containerItemIndex${container}`, itemIndex);
    store.set(
      `containerPosition${container}`,
      itemIndex === undefined ? undefined : layout.positions[itemIndex]
    );
  });
}
