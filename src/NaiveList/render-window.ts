/** Size used for items that have not been measured yet. */
export const DEFAULT_ITEM_SIZE = 50;

export interface RenderWindow {
  /** First rendered index (inclusive). */
  startIndex: number;
  /** Last rendered index (exclusive). */
  endIndex: number;
  /** Size of the sizer standing in for items before `startIndex`. */
  sizerBefore: number;
  /** Size of the sizer standing in for items from `endIndex` on. */
  sizerAfter: number;
}

export interface ComputeRenderWindowParams {
  itemCount: number;
  /** Measured item sizes, indexed by item; `undefined` when not measured yet. */
  sizes: ReadonlyArray<number | undefined>;
  scrollOffset: number;
  viewportSize: number;
}

/**
 * Picks the items that overlap the viewport plus one viewport of buffer on
 * each side. Items outside that window are replaced by sizers. Unmeasured items
 * count as `DEFAULT_ITEM_SIZE`.
 */
export function computeRenderWindow({
  itemCount,
  sizes,
  scrollOffset,
  viewportSize,
}: ComputeRenderWindowParams): RenderWindow {
  const bufferSize = viewportSize;
  const windowStart = scrollOffset - bufferSize;
  const windowEnd = scrollOffset + viewportSize + bufferSize;

  let itemsBefore = 0;
  let itemsAfter = 0;
  let sizerBefore = 0;
  let sizerAfter = 0;

  let itemStart = 0;
  for (let itemIndex = 0; itemIndex < itemCount; itemIndex += 1) {
    const itemSize = sizes[itemIndex] ?? DEFAULT_ITEM_SIZE;
    const itemEnd = itemStart + itemSize;
    if (itemEnd <= windowStart) {
      itemsBefore += 1;
      sizerBefore += itemSize;
    } else if (itemStart >= windowEnd) {
      itemsAfter += 1;
      sizerAfter += itemSize;
    }
    itemStart = itemEnd;
  }

  return {
    startIndex: itemsBefore,
    endIndex: itemCount - itemsAfter,
    sizerBefore,
    sizerAfter,
  };
}
