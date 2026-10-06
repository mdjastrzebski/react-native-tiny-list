import { describe, expect, it } from '@jest/globals';
import { computeRenderWindow, DEFAULT_ITEM_SIZE } from '../render-window';

describe('computeRenderWindow', () => {
  it('renders nothing for empty data', () => {
    expect(
      computeRenderWindow({
        itemCount: 0,
        sizes: [],
        scrollOffset: 0,
        viewportSize: 500,
      })
    ).toEqual({
      startIndex: 0,
      endIndex: 0,
      sizerBefore: 0,
      sizerAfter: 0,
    });
  });

  it('renders the viewport plus one viewport of buffer below at the top', () => {
    const sizes = Array(100).fill(100);
    // Window is [-500, 1000), so items 0..9 are rendered.
    expect(
      computeRenderWindow({
        itemCount: 100,
        sizes,
        scrollOffset: 0,
        viewportSize: 500,
      })
    ).toEqual({
      startIndex: 0,
      endIndex: 10,
      sizerBefore: 0,
      sizerAfter: 9000,
    });
  });

  it('replaces items before and after the window with spacers', () => {
    const sizes = Array(100).fill(100);
    // Window is [1500, 3000), so items 15..29 are rendered.
    expect(
      computeRenderWindow({
        itemCount: 100,
        sizes,
        scrollOffset: 2000,
        viewportSize: 500,
      })
    ).toEqual({
      startIndex: 15,
      endIndex: 30,
      sizerBefore: 1500,
      sizerAfter: 7000,
    });
  });

  it('uses the default size for unmeasured items', () => {
    const sizes = [200];
    const result = computeRenderWindow({
      itemCount: 10,
      sizes,
      scrollOffset: 0,
      viewportSize: 1000,
    });
    expect(result.startIndex).toBe(0);
    expect(result.endIndex).toBe(10);
    expect(result.sizerAfter).toBe(0);

    const scrolled = computeRenderWindow({
      itemCount: 10,
      sizes,
      scrollOffset: 10_000,
      viewportSize: 100,
    });
    expect(scrolled.startIndex).toBe(10);
    expect(scrolled.sizerBefore).toBe(200 + 9 * DEFAULT_ITEM_SIZE);
  });

  it('keeps sizers and rendered items summing to the total size', () => {
    const sizes = Array.from({ length: 50 }, (_, i) => 20 + (i % 7) * 10);
    const total = sizes.reduce((a, b) => a + b, 0);
    for (const offset of [0, 333, 900, 1700]) {
      const { startIndex, endIndex, sizerBefore, sizerAfter } =
        computeRenderWindow({
          itemCount: 50,
          sizes,
          scrollOffset: offset,
          viewportSize: 300,
        });
      const rendered = sizes
        .slice(startIndex, endIndex)
        .reduce((a, b) => a + b, 0);
      expect(sizerBefore + rendered + sizerAfter).toBe(total);
    }
  });
});
