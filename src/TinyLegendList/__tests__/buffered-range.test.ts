import { describe, expect, it } from '@jest/globals';
import {
  computeBufferedArea,
  containsArea,
  findItemsInArea,
  getCoveredArea,
} from '../buffered-range';

// 100 items of 100 px each.
const positions = Array.from({ length: 100 }, (_, i) => i * 100);
const sizes = Array<number>(100).fill(100);

const area = (scroll: number, scrollDirection: 1 | -1 | 0 = 0) =>
  computeBufferedArea({
    scroll,
    scrollLength: 500,
    totalSize: 10_000,
    drawDistance: 200,
    scrollDirection,
  });

describe('computeBufferedArea', () => {
  it('renders more ahead of the scroll than behind it', () => {
    expect(area(1000, 1)).toEqual({ top: 900, bottom: 1800 });
    expect(area(1000, -1)).toEqual({ top: 700, bottom: 1600 });
    // Before any scroll, the list leans down like a downward scroll.
    expect(area(1000, 0)).toEqual(area(1000, 1));
  });

  it('ignores overscroll past either end', () => {
    expect(area(-50)).toEqual(area(0));
    expect(area(9_800)).toEqual(area(9_500));
  });
});

describe('findItemsInArea', () => {
  it('returns the items overlapping the area', () => {
    expect(
      findItemsInArea({
        positions,
        sizes,
        area: { top: 950, bottom: 1500 },
        searchFromIndex: 0,
      })
    ).toEqual({ startIndex: 9, endIndex: 14 });
  });

  it('finds the same items searching up or down', () => {
    const params = { positions, sizes, area: { top: 950, bottom: 1500 } };
    const expected = { startIndex: 9, endIndex: 14 };
    expect(findItemsInArea({ ...params, searchFromIndex: 50 })).toEqual(
      expected
    );
    expect(findItemsInArea({ ...params, searchFromIndex: 9 })).toEqual(
      expected
    );
  });

  it('returns null for no items', () => {
    expect(
      findItemsInArea({
        positions: [],
        sizes: [],
        area: { top: 0, bottom: 500 },
        searchFromIndex: 0,
      })
    ).toBeNull();
  });
});

describe('getCoveredArea', () => {
  it('spans the rendered items', () => {
    const covered = getCoveredArea(positions, sizes, {
      startIndex: 9,
      endIndex: 14,
    });
    expect(covered).toEqual({ top: 900, bottom: 1500 });
    expect(containsArea(covered, { top: 950, bottom: 1450 })).toBe(true);
    expect(containsArea(covered, { top: 850, bottom: 1450 })).toBe(false);
  });

  it('extends past the first and last item', () => {
    expect(
      getCoveredArea(positions, sizes, { startIndex: 0, endIndex: 99 })
    ).toEqual({ top: -Infinity, bottom: Infinity });
  });
});
