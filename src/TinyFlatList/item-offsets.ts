/** Size used for unmeasured items until at least one item has been measured. */
export const DEFAULT_ITEM_SIZE = 50;

/** A run of items from `start` (inclusive) to `end` (exclusive). */
export interface ItemRange {
  start: number;
  end: number;
}

/**
 * Computes where each item starts. `offsets[i]` is the start of item `i` and
 * `offsets[itemCount]` is the total content size.
 *
 * Unmeasured items count as the average measured size, like in FlatList.
 */
export function computeItemOffsets(
  keys: ReadonlyArray<string>,
  sizes: ReadonlyMap<string, number>
): number[] {
  const estimatedSize = averageSize(sizes) ?? DEFAULT_ITEM_SIZE;

  const offsets = [0];
  for (let index = 0; index < keys.length; index += 1) {
    const size = sizes.get(keys[index]!) ?? estimatedSize;
    offsets.push(offsets[index]! + size);
  }
  return offsets;
}

function averageSize(sizes: ReadonlyMap<string, number>): number | undefined {
  if (sizes.size === 0) {
    return undefined;
  }

  let total = 0;
  for (const size of sizes.values()) {
    total += size;
  }
  return total / sizes.size;
}

/** Items that overlap the `[startOffset, endOffset)` area. */
export function findItemsInArea(
  offsets: ReadonlyArray<number>,
  startOffset: number,
  endOffset: number
): ItemRange {
  return {
    start: findFirstItemEndingAfter(offsets, startOffset),
    end: findFirstItemStartingAtOrAfter(offsets, endOffset),
  };
}

/** The first item that ends after `offset`, i.e. the item at `offset`. */
export function findFirstItemEndingAfter(
  offsets: ReadonlyArray<number>,
  offset: number
): number {
  return findFirstItem(offsets.length - 1, (index) => {
    return offsets[index + 1]! > offset;
  });
}

/** The first item that starts at or after `offset`. */
export function findFirstItemStartingAtOrAfter(
  offsets: ReadonlyArray<number>,
  offset: number
): number {
  return findFirstItem(offsets.length - 1, (index) => {
    return offsets[index]! >= offset;
  });
}

/**
 * Binary search for the first index in `[0, itemCount)` that matches
 * `predicate`, or `itemCount` when none does. `predicate` must be false for
 * every index before the first match and true for every index after it.
 */
function findFirstItem(
  itemCount: number,
  predicate: (index: number) => boolean
): number {
  let low = 0;
  let high = itemCount;

  // The answer is always in [low, high]. Halve that range until it is a single index.
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (predicate(middle)) {
      // Match: the first match is `middle` or earlier.
      high = middle;
    } else {
      // No match: the first match is after `middle`.
      low = middle + 1;
    }
  }

  return low;
}
