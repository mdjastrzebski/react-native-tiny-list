import type { IndexRange } from './buffered-range';

export interface FindAvailableContainersParams {
  /** Item index shown by each container; `undefined` for an unused one. */
  containerItems: ReadonlyArray<number | undefined>;
  /** Items in the range that have no container yet. */
  neededItems: ReadonlyArray<number>;
  /** Items in this range keep their containers. */
  range: IndexRange;
}

/**
 * Picks a container for each needed item, in the same order:
 *
 * 1. unused containers first;
 * 2. then containers showing items outside `range`, farthest first, because
 *    the nearest ones are the most likely to scroll back in;
 * 3. new containers once nothing else is left.
 */
export function findAvailableContainers({
  containerItems,
  neededItems,
  range,
}: FindAvailableContainersParams): number[] {
  const candidates: Array<{ container: number; distance: number }> = [];
  containerItems.forEach((itemIndex, container) => {
    if (itemIndex === undefined) {
      candidates.push({ container, distance: Infinity });
    } else if (itemIndex < range.startIndex) {
      candidates.push({ container, distance: range.startIndex - itemIndex });
    } else if (itemIndex > range.endIndex) {
      candidates.push({ container, distance: itemIndex - range.endIndex });
    }
  });
  candidates.sort((a, b) => b.distance - a.distance);

  let nextNewContainer = containerItems.length;
  return neededItems.map(
    (_, order) => candidates[order]?.container ?? nextNewContainer++
  );
}
