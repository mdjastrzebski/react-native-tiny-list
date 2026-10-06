import { describe, expect, it } from '@jest/globals';
import {
  computeItemOffsets,
  DEFAULT_ITEM_SIZE,
  findFirstItemEndingAfter,
  findFirstItemStartingAtOrAfter,
  findItemsInArea,
} from '../item-offsets';

describe('computeItemOffsets', () => {
  it('returns only the total for empty data', () => {
    expect(computeItemOffsets([], new Map())).toEqual([0]);
  });

  it('uses DEFAULT_ITEM_SIZE when nothing is measured', () => {
    expect(computeItemOffsets(['a', 'b'], new Map())).toEqual([
      0,
      DEFAULT_ITEM_SIZE,
      2 * DEFAULT_ITEM_SIZE,
    ]);
  });

  it('looks sizes up by key and estimates the rest with the average', () => {
    const sizes = new Map([
      ['a', 100],
      ['c', 300],
    ]);
    // 'b' is unmeasured and counts as the average, 200.
    expect(computeItemOffsets(['c', 'b', 'a'], sizes)).toEqual([
      0, 300, 500, 600,
    ]);
  });
});

describe('binary search', () => {
  // Items: 0 = [0, 100), 1 = [100, 300), 2 = [300, 350)
  const offsets = [0, 100, 300, 350];

  it('finds the item at an offset', () => {
    expect(findFirstItemEndingAfter(offsets, -10)).toBe(0);
    expect(findFirstItemEndingAfter(offsets, 0)).toBe(0);
    expect(findFirstItemEndingAfter(offsets, 99)).toBe(0);
    expect(findFirstItemEndingAfter(offsets, 100)).toBe(1);
    expect(findFirstItemEndingAfter(offsets, 349)).toBe(2);
    expect(findFirstItemEndingAfter(offsets, 350)).toBe(3);
  });

  it('finds the first item starting at or after an offset', () => {
    expect(findFirstItemStartingAtOrAfter(offsets, 0)).toBe(0);
    expect(findFirstItemStartingAtOrAfter(offsets, 1)).toBe(1);
    expect(findFirstItemStartingAtOrAfter(offsets, 300)).toBe(2);
    expect(findFirstItemStartingAtOrAfter(offsets, 301)).toBe(3);
  });

  it('finds the items overlapping an area', () => {
    expect(findItemsInArea(offsets, 0, 100)).toEqual({ start: 0, end: 1 });
    expect(findItemsInArea(offsets, 50, 301)).toEqual({ start: 0, end: 3 });
    expect(findItemsInArea(offsets, 400, 500)).toEqual({ start: 3, end: 3 });
  });
});
