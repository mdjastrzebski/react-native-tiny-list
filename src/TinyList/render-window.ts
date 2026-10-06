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

/** Window with no items and no spacers, used before anything is measured. */
export const EMPTY_RENDER_WINDOW: RenderWindow = {
  startIndex: 0,
  endIndex: 0,
  sizerBefore: 0,
  sizerAfter: 0,
};

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
  // The window is the viewport grown by one buffer on each side. Rendering a
  // bit beyond the viewport means items are ready before they scroll into view.
  const bufferSize = viewportSize;
  const windowStartOffset = scrollOffset - bufferSize;
  const windowEndOffset = scrollOffset + viewportSize + bufferSize;

  // How many items fall above and below the window, and their total size
  let itemsBefore = 0;
  let itemsAfter = 0;
  let sizerBefore = 0;
  let sizerAfter = 0;

  // Walk the items top to bottom, tracking where each one starts and ends
  let itemStartOffset = 0;
  for (let itemIndex = 0; itemIndex < itemCount; itemIndex += 1) {
    const itemSize = sizes[itemIndex] ?? DEFAULT_ITEM_SIZE;
    const itemEndOffset = itemStartOffset + itemSize;

    // Ends above the window: the top sizer stands in for it
    if (itemEndOffset <= windowStartOffset) {
      itemsBefore += 1;
      sizerBefore += itemSize;
    }
    // Starts below the window: the bottom sizer stands in for it
    else if (itemStartOffset >= windowEndOffset) {
      itemsAfter += 1;
      sizerAfter += itemSize;
    }
    // Otherwise it overlaps the window and will be rendered

    // The next item starts where this one ends
    itemStartOffset = itemEndOffset;
  }

  // Items above the window come first, so their count is the first rendered
  // index; likewise, items below the window are the last ones.
  return {
    startIndex: itemsBefore,
    endIndex: itemCount - itemsAfter,
    sizerBefore,
    sizerAfter,
  };
}

/** True when both windows render the same items with the same sizers. */
export function areRenderWindowsEqual(
  a: RenderWindow,
  b: RenderWindow
): boolean {
  return (
    a.startIndex === b.startIndex &&
    a.endIndex === b.endIndex &&
    a.sizerBefore === b.sizerBefore &&
    a.sizerAfter === b.sizerAfter
  );
}
