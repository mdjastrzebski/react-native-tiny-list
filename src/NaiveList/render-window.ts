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

  let startIndex = -1;
  let endIndex = itemCount;
  let sizerBefore = 0;
  let itemOffset = 0;

  for (let index = 0; index < itemCount; index++) {
    const size = sizes[index] ?? DEFAULT_ITEM_SIZE;
    if (startIndex === -1 && itemOffset + size > windowStartOffset) {
      startIndex = index;
      sizerBefore = itemOffset;
    }
    if (startIndex !== -1 && itemOffset >= windowEndOffset) {
      endIndex = index;
      break;
    }
    itemOffset += size;
  }

  let sizerAfter = 0;
  for (let index = endIndex; index < itemCount; index++) {
    sizerAfter += sizes[index] ?? DEFAULT_ITEM_SIZE;
  }

  if (startIndex === -1) {
    // Scrolled past all content (e.g. data shrank): render nothing.
    startIndex = itemCount;
    sizerBefore = itemOffset;
  }

  return { startIndex, endIndex, sizerBefore, sizerAfter };
}
