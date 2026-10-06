import {
  computeBufferedArea,
  containsArea,
  findItemsInArea,
  getCoveredArea,
} from './buffered-range';
import { findAvailableContainers } from './find-available-containers';
import { updateItemPositions } from './item-layout';
import type { ListState } from './list-state';
import type { SignalStore } from './signals';

/**
 * Legend List: `calculateItemsInView`.
 *
 * The core of the list. Runs after every scroll event, measurement and
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
      if (!renderedItems.has(layout.keys[index])) {
        neededItems.push(index);
      }
    }

    const containers = findAvailableContainers({
      containerItems: state.containerItems,
      indexByKey: layout.indexByKey,
      neededItems,
      range,
    });
    containers.forEach((container, order) => {
      state.containerItems[container] = layout.keys[neededItems[order]!];
    });
  }

  // 5. Publish. `set` notifies only on change, so only containers whose item,
  // index or position changed re-render.
  store.set('numContainers', state.containerItems.length);
  state.containerItems.forEach((itemKey, container) => {
    const itemIndex =
      itemKey === undefined ? undefined : layout.indexByKey.get(itemKey);
    store.set(`containerItemKey${container}`, itemKey);
    store.set(`containerItemIndex${container}`, itemIndex);
    store.set(
      `containerItemData${container}`,
      itemIndex === undefined ? undefined : state.data[itemIndex]
    );
    store.set(
      `containerPosition${container}`,
      itemIndex === undefined ? undefined : layout.positions[itemIndex]
    );
  });
}
