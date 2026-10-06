import { describe, expect, it } from '@jest/globals';
import {
  addInitialItems,
  computeRenderWindow,
  growTowardTarget,
} from '../render-window';

// 100 items of 100 px each.
const OFFSETS = Array.from({ length: 101 }, (_, i) => i * 100);

const DEFAULTS = {
  offsets: OFFSETS,
  scrollOffset: 0,
  viewportSize: 500,
  windowSize: 3,
  maxToRenderPerBatch: 1000,
  initialNumToRender: 10,
  previous: { start: 0, end: 0 },
};

describe('computeRenderWindow', () => {
  it('renders initialNumToRender items before the viewport is measured', () => {
    expect(computeRenderWindow({ ...DEFAULTS, viewportSize: 0 })).toEqual({
      start: 0,
      end: 10,
    });
  });

  it('renders nothing for empty data', () => {
    expect(computeRenderWindow({ ...DEFAULTS, offsets: [0] })).toEqual({
      start: 0,
      end: 0,
    });
  });

  it('renders windowSize viewports centered on the visible one', () => {
    // windowSize 3: one viewport above and below. Area is [1500, 3000).
    expect(computeRenderWindow({ ...DEFAULTS, scrollOffset: 2000 })).toEqual({
      start: 15,
      end: 30,
    });

    // windowSize 5: two viewports above and below. Area is [1000, 3500).
    expect(
      computeRenderWindow({ ...DEFAULTS, scrollOffset: 2000, windowSize: 5 })
    ).toEqual({ start: 10, end: 35 });
  });

  it('adds at most maxToRenderPerBatch new items per call', () => {
    const params = { ...DEFAULTS, scrollOffset: 2000, maxToRenderPerBatch: 2 };

    // Visible items 20..24 are always rendered, even beyond the budget.
    const first = computeRenderWindow(params);
    expect(first).toEqual({ start: 20, end: 25 });

    // Next batches grow by 2 items, one on each side.
    const second = computeRenderWindow({ ...params, previous: first });
    expect(second).toEqual({ start: 19, end: 26 });

    const third = computeRenderWindow({ ...params, previous: second });
    expect(third).toEqual({ start: 18, end: 27 });
  });

  it('reaches the target window after enough batches', () => {
    const params = { ...DEFAULTS, scrollOffset: 2000, maxToRenderPerBatch: 4 };
    let window = params.previous;
    for (let batch = 0; batch < 10; batch += 1) {
      window = computeRenderWindow({ ...params, previous: window });
    }
    expect(window).toEqual({ start: 15, end: 30 });
  });
});

describe('growTowardTarget', () => {
  const target = { start: 0, end: 20 };

  it('keeps already rendered items without counting them as new', () => {
    expect(
      growTowardTarget({ start: 8, end: 12 }, target, { start: 5, end: 15 }, 0)
    ).toEqual({ start: 5, end: 15 });
  });

  it('drops rendered items outside the target', () => {
    expect(
      growTowardTarget({ start: 8, end: 12 }, target, { start: 0, end: 50 }, 0)
    ).toEqual({ start: 0, end: 20 });
  });

  it('drops rendered items that do not touch the visible ones', () => {
    // Keeping 0..5 would also render the gap 5..8, which is not in the budget.
    expect(
      growTowardTarget({ start: 8, end: 12 }, target, { start: 0, end: 5 }, 0)
    ).toEqual({ start: 8, end: 12 });
  });

  it('counts new visible items against the budget', () => {
    // The 4 visible items are new, so only 1 more fits in a budget of 5.
    expect(
      growTowardTarget({ start: 8, end: 12 }, target, { start: 0, end: 0 }, 5)
    ).toEqual({ start: 7, end: 12 });
  });
});

describe('addInitialItems', () => {
  it('adds the initial items before a window further down', () => {
    expect(addInitialItems({ start: 50, end: 80 }, 10, 100)).toEqual({
      initial: { start: 0, end: 10 },
      window: { start: 50, end: 80 },
    });
  });

  it('removes initial items from a window that overlaps them', () => {
    expect(addInitialItems({ start: 0, end: 30 }, 10, 100)).toEqual({
      initial: { start: 0, end: 10 },
      window: { start: 10, end: 30 },
    });
    expect(addInitialItems({ start: 0, end: 5 }, 10, 100)).toEqual({
      initial: { start: 0, end: 10 },
      window: { start: 10, end: 10 },
    });
  });

  it('clamps both to the item count', () => {
    expect(addInitialItems({ start: 50, end: 80 }, 10, 5)).toEqual({
      initial: { start: 0, end: 5 },
      window: { start: 5, end: 5 },
    });
  });
});
