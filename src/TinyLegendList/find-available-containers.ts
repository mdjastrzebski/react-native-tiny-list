import type { IndexRange } from './buffered-range';

/**
 * Legend List: the arguments of `findAvailableContainers`, which reads each
 * container's item from its `containerItemKey` signal instead.
 */
export interface FindAvailableContainersParams {
  /** Item index shown by each container; `undefined` for an unused one. */
  containerItems: ReadonlyArray<number | undefined>;
  /**
   * Legend List: `needNewContainers`.
   *
   * Items in the range that have no container yet.
   */
  neededItems: ReadonlyArray<number>;
  /**
   * Legend List: `startBuffered` and `endBuffered`.
   *
   * Items in this range keep their containers.
   */
  range: IndexRange;
}

/**
 * Legend List: `findAvailableContainers`, which also keeps sticky and
 * protected containers apart and returns `{ containerIndex, itemIndex }` pairs.
 *
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
