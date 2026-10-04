import { EMPTY_RANGE, type IndexRange } from './index-range';
import type { LinearLayoutManager } from './layout-manager';

/** Extra pixels rendered above and below the viewport (FlashList's native default). */
export const DEFAULT_DRAW_DISTANCE = 250;

export interface ComputeEngagedRangeParams {
  layoutManager: LinearLayoutManager;
  scrollOffset: number;
  viewportSize: number;
  drawDistance: number;
}

/**
 * The "engaged" items are the ones that get rendered: those overlapping the
 * viewport plus `drawDistance` pixels on each side.
 *
 * FlashList also skews the buffer towards the scroll direction and shifts the
 * window by the scroll velocity. Both are left out here.
 */
export function computeEngagedRange({
  layoutManager,
  scrollOffset,
  viewportSize,
  drawDistance,
}: ComputeEngagedRangeParams): IndexRange {
  // Nothing to fill until the viewport has been measured.
  if (viewportSize <= 0) {
    return EMPTY_RANGE;
  }

  return layoutManager.findItemsInRange(
    scrollOffset - drawDistance,
    scrollOffset + viewportSize + drawDistance
  );
}
