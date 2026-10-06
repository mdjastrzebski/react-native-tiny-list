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
 * Grows `visible` toward `target`, adding at most `maxNewItems` items that are
 * not in `previous`. Items already in `previous` are free: keeping them
 * mounted costs no rendering.
 */
export function growTowardTarget(
  visible: ItemRange,
  target: ItemRange,
  previous: ItemRange,
  maxNewItems: number
): ItemRange {
  // 1. Keep the rendered items that are still in the target, if they touch
  //    the visible ones. Every item outside this range is new.
  const kept = intersectRanges(previous, target);
  let { start, end } = rangesTouch(kept, visible)
    ? joinRanges(kept, visible)
    : visible;

  // 2. New visible items use up the budget first.
  let budget = maxNewItems - countNewItems(visible, previous);

  // 3. Spend the rest on new items, one on each side in turn.
  while (budget > 0 && (start > target.start || end < target.end)) {
    if (start > target.start) {
      start -= 1;
      budget -= 1;
    }
    if (budget > 0 && end < target.end) {
      end += 1;
      budget -= 1;
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

function intersectRanges(a: ItemRange, b: ItemRange): ItemRange {
  const start = Math.max(a.start, b.start);
  return { start, end: Math.max(start, Math.min(a.end, b.end)) };
}

/** True when `a` is not empty and overlaps or sits right next to `b`. */
function rangesTouch(a: ItemRange, b: ItemRange): boolean {
  return a.start < a.end && a.start <= b.end && a.end >= b.start;
}

/** The smallest range covering both `a` and `b`. */
function joinRanges(a: ItemRange, b: ItemRange): ItemRange {
  return { start: Math.min(a.start, b.start), end: Math.max(a.end, b.end) };
}

export function isRangeInside(inner: ItemRange, outer: ItemRange): boolean {
  return inner.start >= outer.start && inner.end <= outer.end;
}

export function isSameRange(a: ItemRange, b: ItemRange): boolean {
  return a.start === b.start && a.end === b.end;
}
