/** Size used for items that have not been measured yet. */
export const DEFAULT_ITEM_SIZE = 50;

export interface RenderWindow {
  /** First rendered index (inclusive). */
  start: number;
  /** Last rendered index (exclusive). */
  end: number;
  /** Size of the spacer standing in for items before `start`. */
  leadingSize: number;
  /** Size of the spacer standing in for items from `end` on. */
  trailingSize: number;
}

/**
 * Picks the items that overlap the viewport plus one viewport of buffer on
 * each side. Unmeasured items count as `DEFAULT_ITEM_SIZE`.
 */
export interface ComputeRenderWindowParams {
  itemCount: number;
  /** Measured item sizes, indexed by item; `undefined` when not measured yet. */
  sizes: ReadonlyArray<number | undefined>;
  scrollOffset: number;
  viewportSize: number;
}

export function computeRenderWindow({
  itemCount,
  sizes,
  scrollOffset,
  viewportSize,
}: ComputeRenderWindowParams): RenderWindow {
  const windowStartOffset = scrollOffset - viewportSize;
  const windowEndOffset = scrollOffset + viewportSize * 2;

  let startIndex = itemCount;
  let endIndex = itemCount;
  let leadingSize = 0;
  let itemOffset = 0;
  for (let index = 0; index < itemCount; index++) {
    const size = sizes[index] ?? DEFAULT_ITEM_SIZE;
    if (startIndex === itemCount && itemOffset + size > windowStartOffset) {
      startIndex = index;
      leadingSize = itemOffset;
    }
    if (startIndex !== itemCount && itemOffset >= windowEndOffset) {
      endIndex = index;
      break;
    }
    itemOffset += size;
  }

  let trailingSize = 0;
  for (let index = endIndex; index < itemCount; index++) {
    trailingSize += sizes[index] ?? DEFAULT_ITEM_SIZE;
  }

  if (startIndex === itemCount) {
    // Scrolled past all content (e.g. data shrank): render nothing.
    leadingSize = itemOffset;
  }

  return { start: startIndex, end: endIndex, leadingSize, trailingSize };
}
