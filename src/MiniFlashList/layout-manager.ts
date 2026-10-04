import { EMPTY_RANGE, type IndexRange } from './index-range';

/** Size used for every item until the first one has been measured. */
export const DEFAULT_ESTIMATED_ITEM_SIZE = 100;

/** Size changes smaller than this are float jitter, not real changes. */
const SIZE_TOLERANCE = 0.5;

/** Position and size of one item along the scroll axis. */
export interface ItemLayout {
  /** Distance from the top of the list content. */
  offset: number;
  size: number;
  /** `false` while `size` is only an estimate. */
  isMeasured: boolean;
}

export interface ItemMeasurement {
  index: number;
  size: number;
}

/**
 * Knows where every item goes, like FlashList's `RVLinearLayoutManagerImpl`.
 *
 * It keeps one layout per item. Unmeasured items get the average of all sizes
 * measured so far, so estimates improve as the user scrolls. Items are
 * stacked one after another, so their offsets only grow, which lets
 * `findItemsInRange` use binary search.
 */
export class LinearLayoutManager {
  private layouts: ItemLayout[] = [];
  private measuredSizeTotal = 0;
  private measurementCount = 0;

  getItemCount(): number {
    return this.layouts.length;
  }

  getLayout(index: number): ItemLayout {
    const layout = this.layouts[index];
    if (!layout) {
      throw new Error(`No layout for index ${index}`);
    }
    return layout;
  }

  /** Total height of the list content: where the last item ends. */
  getContentSize(): number {
    const last = this.layouts[this.layouts.length - 1];
    return last ? last.offset + last.size : 0;
  }

  /** Average of every size measured so far. */
  getEstimatedItemSize(): number {
    return this.measurementCount > 0
      ? this.measuredSizeTotal / this.measurementCount
      : DEFAULT_ESTIMATED_ITEM_SIZE;
  }

  /** Grows or shrinks the layouts to match the data. Returns `true` on change. */
  setItemCount(itemCount: number): boolean {
    const oldCount = this.layouts.length;
    if (oldCount === itemCount) {
      return false;
    }

    // Layouts are kept by index, so surviving items keep their old sizes.
    this.layouts.length = Math.min(oldCount, itemCount);
    for (let index = oldCount; index < itemCount; index++) {
      this.layouts.push({ offset: 0, size: 0, isMeasured: false });
    }
    this.recomputeLayouts();
    return true;
  }

  /** Stores real sizes of rendered items. Returns `true` if anything moved. */
  applyMeasurements(measurements: ReadonlyArray<ItemMeasurement>): boolean {
    let hasChanged = false;
    for (const { index, size } of measurements) {
      const layout = this.layouts[index];
      // Skip unknown indices and sizes that did not really change.
      if (
        !layout ||
        (layout.isMeasured && Math.abs(layout.size - size) < SIZE_TOLERANCE)
      ) {
        continue;
      }

      layout.size = size;
      layout.isMeasured = true;
      this.measuredSizeTotal += size;
      this.measurementCount += 1;
      hasChanged = true;
    }

    if (hasChanged) {
      this.recomputeLayouts();
    }
    return hasChanged;
  }

  /** Items that overlap `[startOffset, endOffset)`. */
  findItemsInRange(startOffset: number, endOffset: number): IndexRange {
    // First item that ends below the range start.
    const startIndex = findFirstIndex(
      this.layouts.length,
      (index) =>
        this.getLayout(index).offset + this.getLayout(index).size > startOffset
    );
    // First item that starts at or after the range end.
    const endIndex = findFirstIndex(
      this.layouts.length,
      (index) => this.getLayout(index).offset >= endOffset
    );
    return startIndex < endIndex ? { startIndex, endIndex } : EMPTY_RANGE;
  }

  /**
   * Stacks items one after another, re-estimating unmeasured ones.
   *
   * This is O(n) on every change. FlashList caps each pass to the items near
   * the change and finishes the rest later, which is faster but harder to follow.
   */
  private recomputeLayouts() {
    const estimatedSize = this.getEstimatedItemSize();
    let offset = 0;
    for (const layout of this.layouts) {
      if (!layout.isMeasured) {
        layout.size = estimatedSize;
      }
      layout.offset = offset;
      offset += layout.size;
    }
  }
}

/**
 * Binary search: the first index in `[0, count)` for which `predicate` is
 * true, or `count` if there is none. `predicate` must be false for a prefix
 * of the indices and true for the rest.
 */
export function findFirstIndex(
  count: number,
  predicate: (index: number) => boolean
): number {
  let low = 0;
  let high = count;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (predicate(middle)) {
      // The answer is `middle` or an earlier index.
      high = middle;
    } else {
      // The answer is after `middle`.
      low = middle + 1;
    }
  }
  return low;
}
