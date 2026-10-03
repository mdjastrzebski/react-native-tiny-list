import { describe, expect, it } from '@jest/globals';
import { computeRenderWindow, DEFAULT_ITEM_SIZE } from '../renderWindow';

describe('computeRenderWindow', () => {
  it('renders nothing for empty data', () => {
    expect(computeRenderWindow(0, [], 0, 500)).toEqual({
      start: 0,
      end: 0,
      leadingSize: 0,
      trailingSize: 0,
    });
  });

  it('renders the viewport plus one viewport of buffer below at the top', () => {
    const sizes = Array(100).fill(100);
    // Window is [-500, 1000), so items 0..9 are rendered.
    expect(computeRenderWindow(100, sizes, 0, 500)).toEqual({
      start: 0,
      end: 10,
      leadingSize: 0,
      trailingSize: 9000,
    });
  });

  it('replaces items before and after the window with spacers', () => {
    const sizes = Array(100).fill(100);
    // Window is [1500, 3000), so items 15..29 are rendered.
    expect(computeRenderWindow(100, sizes, 2000, 500)).toEqual({
      start: 15,
      end: 30,
      leadingSize: 1500,
      trailingSize: 7000,
    });
  });

  it('uses the default size for unmeasured items', () => {
    const sizes = [200];
    const result = computeRenderWindow(10, sizes, 0, 1000);
    expect(result.start).toBe(0);
    expect(result.end).toBe(10);
    expect(result.trailingSize).toBe(0);

    const scrolled = computeRenderWindow(10, sizes, 10_000, 100);
    expect(scrolled.start).toBe(10);
    expect(scrolled.leadingSize).toBe(200 + 9 * DEFAULT_ITEM_SIZE);
  });

  it('keeps spacers and rendered items summing to the total size', () => {
    const sizes = Array.from({ length: 50 }, (_, i) => 20 + (i % 7) * 10);
    const total = sizes.reduce((a, b) => a + b, 0);
    for (const offset of [0, 333, 900, 1700]) {
      const { start, end, leadingSize, trailingSize } = computeRenderWindow(
        50,
        sizes,
        offset,
        300
      );
      const rendered = sizes.slice(start, end).reduce((a, b) => a + b, 0);
      expect(leadingSize + rendered + trailingSize).toBe(total);
    }
  });
});
