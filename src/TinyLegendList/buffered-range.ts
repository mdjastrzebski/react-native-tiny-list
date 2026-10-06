/** Extra pixels rendered around the viewport, split by scroll direction. */
export const DEFAULT_DRAW_DISTANCE = 250;

/** `1` while scrolling down, `-1` while scrolling up, `0` before any scroll. */
export type ScrollDirection = 1 | -1 | 0;

/** A vertical span of the content, in pixels from its top. */
export interface Area {
  top: number;
  bottom: number;
}

/** First and last item index, both inclusive. */
export interface IndexRange {
  startIndex: number;
  endIndex: number;
}

export interface ComputeBufferedAreaParams {
  scroll: number;
  scrollLength: number;
  totalSize: number;
  drawDistance: number;
  scrollDirection: ScrollDirection;
}

/**
 * The part of the content that should be rendered: the viewport plus a buffer
 * that leans towards the scroll direction (Legend List renders 1.5 ×
 * `drawDistance` ahead and 0.5 × behind).
 */
export function computeBufferedArea({
  scroll,
  scrollLength,
  totalSize,
  drawDistance,
  scrollDirection,
}: ComputeBufferedAreaParams): Area {
  const isScrollingUp = scrollDirection === -1;
  const bufferAbove = drawDistance * (isScrollingUp ? 1.5 : 0.5);
  const bufferBelow = drawDistance * (isScrollingUp ? 0.5 : 1.5);

  // Ignore overscroll ("bounce") past either end of the content, so the
  // items at the edge stay rendered.
  const maxScroll = Math.max(0, totalSize - scrollLength);
  const viewportTop = Math.min(Math.max(scroll, 0), maxScroll);

  return {
    top: viewportTop - bufferAbove,
    bottom: viewportTop + scrollLength + bufferBelow,
  };
}

export interface FindItemsInAreaParams {
  positions: ReadonlyArray<number>;
  sizes: ReadonlyArray<number>;
  area: Area;
  /** Where to start looking, usually the previous first rendered item. */
  searchFromIndex: number;
}

/**
 * Finds the items that overlap `area`, or `null` if there are none.
 *
 * Scrolling moves the area only a little between two calls, so the search
 * walks from the previous first item instead of starting at index 0.
 */
export function findItemsInArea({
  positions,
  sizes,
  area,
  searchFromIndex,
}: FindItemsInAreaParams): IndexRange | null {
  const itemCount = positions.length;
  if (itemCount === 0) {
    return null;
  }

  const itemBottom = (index: number) => positions[index]! + sizes[index]!;

  // 1. Walk up while the item above still reaches into the area.
  let startIndex = Math.min(Math.max(searchFromIndex, 0), itemCount - 1);
  while (startIndex > 0 && itemBottom(startIndex - 1) > area.top) {
    startIndex -= 1;
  }

  // 2. Walk down past items that end above the area.
  while (startIndex < itemCount - 1 && itemBottom(startIndex) <= area.top) {
    startIndex += 1;
  }

  // 3. Walk down to the last item that starts above the area's bottom.
  let endIndex = startIndex;
  while (endIndex < itemCount - 1 && positions[endIndex + 1]! < area.bottom) {
    endIndex += 1;
  }

  return { startIndex, endIndex };
}

/**
 * The area covered by the items in `range`. While the buffered area stays
 * inside it, scrolling needs no new items, so the next pass can be skipped.
 * The first and last item cover everything beyond them.
 */
export function getCoveredArea(
  positions: ReadonlyArray<number>,
  sizes: ReadonlyArray<number>,
  { startIndex, endIndex }: IndexRange
): Area {
  const isLastItem = endIndex === positions.length - 1;
  return {
    top: startIndex === 0 ? -Infinity : positions[startIndex]!,
    bottom: isLastItem ? Infinity : positions[endIndex]! + sizes[endIndex]!,
  };
}

export function containsArea(outer: Area, inner: Area): boolean {
  return inner.top >= outer.top && inner.bottom <= outer.bottom;
}
