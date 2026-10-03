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
 * each side. Unmeasured items count as `DEFAULT_ITEM_SIZE`.
 */
export function computeRenderWindow({
  itemCount,
  sizes,
  scrollOffset,
  viewportSize,
}: ComputeRenderWindowParams): RenderWindow {
  // This is the viewport, visible part of the list
  const viewportStart = scrollOffset;
  const viewportEnd = scrollOffset + viewportSize;

  // Let's add some extra buffer before and after to reduce flickering during scroll
  const bufferSize = viewportSize;
  const windowStartOffset = viewportStart - bufferSize;
  const windowEndOffset = viewportEnd + bufferSize;

  let itemIndex = 0;
  let itemOffset = 0;

  // Find and measure items before the viewport
  for (; itemIndex < itemCount; itemIndex += 1) {
    const itemEnd = itemOffset + (sizes[itemIndex] ?? DEFAULT_ITEM_SIZE);
    if (itemEnd > windowStartOffset) break;
    itemOffset = itemEnd;
  }
  const startIndex = itemIndex;
  const sizerBefore = itemOffset;

  // Find items in the viewport
  for (; itemIndex < itemCount; itemIndex += 1) {
    if (itemOffset >= windowEndOffset) break;
    itemOffset += sizes[itemIndex] ?? DEFAULT_ITEM_SIZE;
  }
  const endIndex = itemIndex;

  // Measure the items after the viewport
  let sizerAfter = 0;
  for (; itemIndex < itemCount; itemIndex += 1) {
    sizerAfter += sizes[itemIndex] ?? DEFAULT_ITEM_SIZE;
  }

  return { startIndex, endIndex, sizerBefore, sizerAfter };
}
