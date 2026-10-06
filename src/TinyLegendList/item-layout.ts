/**
 * Legend List: the default of the `estimatedItemSize` prop.
 *
 * Size assumed for every item until the first one is measured.
 */
export const DEFAULT_ESTIMATED_ITEM_SIZE = 100;

/**
 * Legend List: the layout fields of `InternalState`, which also keys `sizes`
 * by item key.
 *
 * Size and position of every item, rendered or not. Measured sizes are kept by
 * item key, so they follow their item when items are inserted or reordered.
 *
 * Invariant: `positions[i + 1] === positions[i] + sizes[i]` for every index
 * before `invalidFromIndex`.
 */
export interface ItemLayout {
  /**
   * Legend List: `idCache`.
   *
   * Key of each item, from `keyExtractor`.
   */
  keys: string[];
  indexByKey: Map<string, number>;
  /**
   * Legend List: `sizesKnown`.
   *
   * Measured size of each item, by key; missing until it has been rendered.
   */
  knownSizes: Map<string, number>;
  /** Size each item takes in `positions`: measured, or estimated if not yet. */
  sizes: number[];
  /** Offset of each item from the top of the content. */
  positions: number[];
  /** Height of the content: the bottom of the last item. */
  totalSize: number;
  /**
   * Legend List: `averageSizes`, one `{ avg, num }` per item type.
   *
   * Running average of the measured sizes, used as the estimate.
   */
  averageSize: { value: number; count: number };
  /**
   * Legend List: `positionRecalculationStartIndex`.
   *
   * First index whose position is stale, or `undefined` if all are current.
   */
  invalidFromIndex: number | undefined;
}

export function createItemLayout(): ItemLayout {
  return {
    keys: [],
    indexByKey: new Map(),
    knownSizes: new Map(),
    sizes: [],
    positions: [],
    totalSize: 0,
    averageSize: { value: 0, count: 0 },
    invalidFromIndex: undefined,
  };
}

/**
 * Legend List: `resetLayoutCachesForDataChange` and the `indexByKey` update in
 * `updateItemPositions`. Legend List drops all positions instead of only
 * those after the first changed key, and keeps the sizes of removed items.
 *
 * Adapts the layout to new data, given the key of each item. Items keep their
 * measured size wherever they move; removed items are forgotten.
 */
export function setItemKeys(layout: ItemLayout, keys: ReadonlyArray<string>) {
  // Items above the first changed key keep their positions.
  const firstChangedIndex = findFirstChangedIndex(layout.keys, keys);
  if (firstChangedIndex === undefined) {
    return;
  }
  invalidateFrom(layout, firstChangedIndex);

  layout.keys = [...keys];
  layout.indexByKey = new Map(keys.map((key, index) => [key, index]));
  layout.sizes.length = Math.min(layout.sizes.length, keys.length);
  layout.positions.length = Math.min(layout.positions.length, keys.length);

  // Forget removed items, so they no longer count in the average.
  layout.knownSizes.forEach((size, key) => {
    if (!layout.indexByKey.has(key)) {
      layout.knownSizes.delete(key);
      if (size > 0) {
        removeFromAverage(layout.averageSize, size);
      }
    }
  });
}

/**
 * Legend List: none. It recomputes every position after a data change.
 *
 * First index where the two key lists differ, or `undefined` if they are equal.
 */
function findFirstChangedIndex(
  oldKeys: ReadonlyArray<string>,
  newKeys: ReadonlyArray<string>
): number | undefined {
  const commonLength = Math.min(oldKeys.length, newKeys.length);
  for (let index = 0; index < commonLength; index++) {
    if (oldKeys[index] !== newKeys[index]) {
      return index;
    }
  }
  return oldKeys.length === newKeys.length ? undefined : commonLength;
}

/**
 * Legend List: `updateOneItemSize`.
 *
 * Stores a measured item size. Returns `true` if the layout must be updated,
 * i.e. the item takes a different size than the one it was laid out with.
 */
export function recordItemSize(
  layout: ItemLayout,
  key: string,
  size: number
): boolean {
  // A removed item can still report its size: its container unmounts later.
  const index = layout.indexByKey.get(key);
  const previousSize = layout.knownSizes.get(key);
  if (index === undefined || previousSize === size) {
    return false;
  }

  // Fold the size into the average used for estimates. Sizes of 0 stay out:
  // a row whose `renderItem` returns null says nothing about other rows.
  // Like Legend List, a row that shrinks to 0 keeps its old size in the average.
  if (size > 0) {
    if (previousSize !== undefined && previousSize > 0) {
      removeFromAverage(layout.averageSize, previousSize);
    }
    addToAverage(layout.averageSize, size);
  }
  layout.knownSizes.set(key, size);

  // Only a different size moves the items below this one.
  if (layout.sizes[index] === size) {
    return false;
  }
  invalidateFrom(layout, index);
  return true;
}

/** Legend List: the average update in `updateOneItemSize`. */
function addToAverage(average: ItemLayout['averageSize'], size: number) {
  average.value = (average.value * average.count + size) / (average.count + 1);
  average.count += 1;
}

/**
 * Legend List: none. It never removes a size, so a removed item keeps its
 * size in the average.
 *
 * Removes one previously added size from a running average.
 */
function removeFromAverage(average: ItemLayout['averageSize'], size: number) {
  average.count -= 1;
  average.value =
    average.count > 0
      ? (average.value * (average.count + 1) - size) / average.count
      : 0;
}

/**
 * Legend List: the estimate fallback in `getItemSize`.
 *
 * Estimated size of an item that has not been measured yet: the average of
 * the measured items, or `estimatedItemSize` before the first measurement.
 */
export function estimateItemSize(
  layout: ItemLayout,
  estimatedItemSize: number
): number {
  return layout.averageSize.count > 0
    ? layout.averageSize.value
    : estimatedItemSize;
}

/**
 * Legend List: `updateItemPositions`, which also handles columns and keeps
 * the visible content in place (MVCP).
 *
 * Recomputes sizes and positions from `invalidFromIndex` to the end. Items
 * above it keep their positions, so a measurement never moves earlier items.
 * Returns `true` if anything was recomputed.
 */
export function updateItemPositions(
  layout: ItemLayout,
  estimatedItemSize: number
): boolean {
  const startIndex = layout.invalidFromIndex;
  if (startIndex === undefined) {
    return false;
  }

  const { keys, knownSizes, sizes, positions } = layout;
  const estimate = estimateItemSize(layout, estimatedItemSize);

  // Continue from the bottom of the last item that is still valid.
  let top =
    startIndex > 0 ? positions[startIndex - 1]! + sizes[startIndex - 1]! : 0;
  for (let index = startIndex; index < keys.length; index++) {
    const size = knownSizes.get(keys[index]!) ?? estimate;
    sizes[index] = size;
    positions[index] = top;
    top += size;
  }

  layout.totalSize = top;
  layout.invalidFromIndex = undefined;
  return true;
}

/**
 * Legend List: the `positionRecalculationStartIndex` update in
 * `updateItemSizesBatch`.
 *
 * Marks the positions from `index` on as stale.
 */
function invalidateFrom(layout: ItemLayout, index: number) {
  layout.invalidFromIndex = Math.min(layout.invalidFromIndex ?? index, index);
}
