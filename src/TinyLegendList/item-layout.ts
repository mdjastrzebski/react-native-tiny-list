/** Size assumed for every item until the first one is measured. */
export const DEFAULT_ESTIMATED_ITEM_SIZE = 100;

/**
 * Size and position of every item, rendered or not.
 *
 * Invariant: `positions[i + 1] === positions[i] + sizes[i]` for every index
 * before `invalidFromIndex`.
 */
export interface ItemLayout {
  itemCount: number;
  /** Measured size of each item; `undefined` until it has been rendered. */
  knownSizes: Array<number | undefined>;
  /** Size each item takes in `positions`: measured, or estimated if not yet. */
  sizes: number[];
  /** Offset of each item from the top of the content. */
  positions: number[];
  /** Height of the content: the bottom of the last item. */
  totalSize: number;
  /** Running average of the measured sizes, used as the estimate. */
  averageSize: { value: number; count: number };
  /** First index whose position is stale, or `undefined` if all are current. */
  invalidFromIndex: number | undefined;
}

export function createItemLayout(): ItemLayout {
  return {
    itemCount: 0,
    knownSizes: [],
    sizes: [],
    positions: [],
    totalSize: 0,
    averageSize: { value: 0, count: 0 },
    invalidFromIndex: undefined,
  };
}

/**
 * Adapts the layout to a new item count. Measured sizes stay attached to their
 * index, so a changed item keeps its old size until it is measured again.
 */
export function setItemCount(layout: ItemLayout, itemCount: number) {
  if (itemCount === layout.itemCount) {
    return;
  }
  invalidateFrom(layout, Math.min(itemCount, layout.itemCount));
  layout.itemCount = itemCount;
  layout.knownSizes.length = Math.min(layout.knownSizes.length, itemCount);
  layout.sizes.length = Math.min(layout.sizes.length, itemCount);
  layout.positions.length = Math.min(layout.positions.length, itemCount);
}

/**
 * Stores a measured item size. Returns `true` if the layout must be updated,
 * i.e. the item takes a different size than the one it was laid out with.
 */
export function recordItemSize(
  layout: ItemLayout,
  index: number,
  size: number
): boolean {
  if (index >= layout.itemCount || layout.knownSizes[index] === size) {
    return false;
  }

  // Fold the measurement into the average used to estimate unmeasured items.
  const average = layout.averageSize;
  const previousSize = layout.knownSizes[index];
  if (previousSize === undefined) {
    average.value =
      (average.value * average.count + size) / (average.count + 1);
    average.count += 1;
  } else {
    average.value += (size - previousSize) / average.count;
  }
  layout.knownSizes[index] = size;

  // Only a different size moves the items below this one.
  if (layout.sizes[index] === size) {
    return false;
  }
  invalidateFrom(layout, index);
  return true;
}

/**
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

  const { knownSizes, sizes, positions, itemCount } = layout;
  const estimate = estimateItemSize(layout, estimatedItemSize);

  // Continue from the bottom of the last item that is still valid.
  let top =
    startIndex > 0 ? positions[startIndex - 1]! + sizes[startIndex - 1]! : 0;
  for (let index = startIndex; index < itemCount; index++) {
    const size = knownSizes[index] ?? estimate;
    sizes[index] = size;
    positions[index] = top;
    top += size;
  }

  layout.totalSize = top;
  layout.invalidFromIndex = undefined;
  return true;
}

function invalidateFrom(layout: ItemLayout, index: number) {
  layout.invalidFromIndex = Math.min(layout.invalidFromIndex ?? index, index);
}
