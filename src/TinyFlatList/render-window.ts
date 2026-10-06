import { findItemsInArea, type ItemRange } from './item-offsets';

export interface ComputeRenderWindowParams {
  /** Item start offsets from `computeItemOffsets`. */
  offsets: ReadonlyArray<number>;
  scrollOffset: number;
  viewportSize: number;
  /** Area to render, in viewports, centered on the visible one. */
  windowSize: number;
  /** Most items to add in one update. */
  maxToRenderPerBatch: number;
  /** Items to render before the viewport has been measured. */
  initialNumToRender: number;
  /** Currently rendered items. */
  previous: ItemRange;
}

/**
 * Picks the items to render next. It always renders every visible item, then
 * grows toward `windowSize` viewports of items, adding at most
 * `maxToRenderPerBatch` items that are not rendered yet. Calling it again with
 * the result as `previous` renders the next batch, until the result stops
 * changing.
 */
export function computeRenderWindow({
  offsets,
  scrollOffset,
  viewportSize,
  windowSize,
  maxToRenderPerBatch,
  initialNumToRender,
  previous,
}: ComputeRenderWindowParams): ItemRange {
  const itemCount = offsets.length - 1;

  // Viewport not measured yet: render the first few items.
  if (viewportSize === 0) {
    return { start: 0, end: Math.min(initialNumToRender, itemCount) };
  }

  // 1. Items on screen right now. They are always rendered.
  const visible = findItemsInArea(
    offsets,
    scrollOffset,
    scrollOffset + viewportSize
  );

  // 2. Items we would like to render: `windowSize` viewports in total.
  const overscan = ((Math.max(windowSize, 1) - 1) / 2) * viewportSize;
  const target = findItemsInArea(
    offsets,
    scrollOffset - overscan,
    scrollOffset + viewportSize + overscan
  );

  // 3. Grow from the visible items toward the target, one batch at a time.
  return growTowardTarget(visible, target, previous, maxToRenderPerBatch);
}

/**
 * Grows `visible` one item at a time on each side until it covers `target`
 * or `maxNewItems` new items have been added. Items already in `previous` are
 * free: keeping them mounted costs no rendering.
 */
export function growTowardTarget(
  visible: ItemRange,
  target: ItemRange,
  previous: ItemRange,
  maxNewItems: number
): ItemRange {
  const isRendered = (index: number) =>
    index >= previous.start && index < previous.end;

  let { start, end } = visible;
  let newItems = countNewItems(visible, previous);

  let grew = true;
  while (grew) {
    grew = false;

    // Add the item before the window, if it is free or within budget.
    if (start > target.start) {
      const isNew = !isRendered(start - 1);
      if (!isNew || newItems < maxNewItems) {
        start -= 1;
        newItems += isNew ? 1 : 0;
        grew = true;
      }
    }

    // Same for the item after the window.
    if (end < target.end) {
      const isNew = !isRendered(end);
      if (!isNew || newItems < maxNewItems) {
        end += 1;
        newItems += isNew ? 1 : 0;
        grew = true;
      }
    }
  }

  return { start, end };
}

export interface RenderedItems {
  /** The first `initialNumToRender` items. Always rendered. */
  initial: ItemRange;
  /** The render window, minus any items already in `initial`. */
  window: ItemRange;
}

/**
 * Like FlatList, keeps the first `initialNumToRender` items rendered so that
 * scrolling back to the top shows them instantly. A spacer goes between them
 * and the window when the two do not touch.
 */
export function addInitialItems(
  window: ItemRange,
  initialNumToRender: number,
  itemCount: number
): RenderedItems {
  const initialEnd = Math.min(initialNumToRender, itemCount);

  // `data` may have shrunk since the window was computed, so clamp it too.
  const start = Math.min(Math.max(window.start, initialEnd), itemCount);
  const end = Math.min(Math.max(window.end, start), itemCount);

  return {
    initial: { start: 0, end: initialEnd },
    window: { start, end },
  };
}

/** Number of items in `range` that are not in `previous`. */
function countNewItems(range: ItemRange, previous: ItemRange): number {
  const overlap = Math.max(
    0,
    Math.min(range.end, previous.end) - Math.max(range.start, previous.start)
  );
  return range.end - range.start - overlap;
}

export function isRangeInside(inner: ItemRange, outer: ItemRange): boolean {
  return inner.start >= outer.start && inner.end <= outer.end;
}

export function isSameRange(a: ItemRange, b: ItemRange): boolean {
  return a.start === b.start && a.end === b.end;
}
