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
export function computeRenderWindow(
  itemCount: number,
  sizes: ReadonlyArray<number | undefined>,
  scrollOffset: number,
  viewportSize: number
): RenderWindow {
  const windowStart = scrollOffset - viewportSize;
  const windowEnd = scrollOffset + viewportSize * 2;

  let start = itemCount;
  let end = itemCount;
  let leadingSize = 0;
  let offset = 0;
  for (let index = 0; index < itemCount; index++) {
    const size = sizes[index] ?? DEFAULT_ITEM_SIZE;
    if (start === itemCount && offset + size > windowStart) {
      start = index;
      leadingSize = offset;
    }
    if (start !== itemCount && offset >= windowEnd) {
      end = index;
      break;
    }
    offset += size;
  }

  let trailingSize = 0;
  for (let index = end; index < itemCount; index++) {
    trailingSize += sizes[index] ?? DEFAULT_ITEM_SIZE;
  }

  if (start === itemCount) {
    // Scrolled past all content (e.g. data shrank): render nothing.
    leadingSize = offset;
  }

  return { start, end, leadingSize, trailingSize };
}
