import type { ComponentRef } from 'react';
import type { View } from 'react-native';

/** A mounted native view, as returned by a `ref` on `<View>`. */
export type HostView = ComponentRef<typeof View>;

/**
 * Reads a view's height right away, inside `useLayoutEffect`.
 *
 * On the new architecture (Fabric), `measureLayout` calls its callback
 * synchronously, so the size is known before the frame is painted. That is
 * why FlashList v2 does not ask for size estimates and supports only the new
 * architecture.
 */
function measureHeight(view: HostView): number {
  let height = 0;
  // Measuring a view relative to itself gives its own size.
  view.measureLayout(view, (_x, _y, _width, measuredHeight) => {
    height = measuredHeight;
  });
  return height;
}

// Separate names so tests can mock viewport and item sizes independently.

/** Height of the list's visible area. */
export function measureViewportSize(container: HostView): number {
  return measureHeight(container);
}

/** Height of one rendered cell. */
export function measureItemSize(cell: HostView): number {
  return measureHeight(cell);
}
