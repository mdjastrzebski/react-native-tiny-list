import type { HostView } from './measure-layout';

// On web, `measureLayout` calls back asynchronously, but a ref on `<View>` is
// a DOM element, which can be measured synchronously. FlashList does the same
// in `measureLayout.web.ts`. The bundler picks this file on web.

/** Height of a DOM element, read synchronously. */
function measureHeight(view: HostView): number {
  const element = view as unknown as {
    getBoundingClientRect(): { height: number };
  };
  return element.getBoundingClientRect().height;
}

export function measureViewportSize(container: HostView): number {
  return measureHeight(container);
}

export function measureItemSize(cell: HostView): number {
  return measureHeight(cell);
}
