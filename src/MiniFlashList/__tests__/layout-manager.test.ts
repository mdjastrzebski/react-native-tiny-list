import { describe, expect, it } from '@jest/globals';
import {
  DEFAULT_ESTIMATED_ITEM_SIZE,
  findFirstIndex,
  LinearLayoutManager,
} from '../layout-manager';

function createLayoutManager(itemCount: number) {
  const layoutManager = new LinearLayoutManager();
  layoutManager.setItemCount(itemCount);
  return layoutManager;
}

function offsets(layoutManager: LinearLayoutManager) {
  return Array.from(
    { length: layoutManager.getItemCount() },
    (_, index) => layoutManager.getLayout(index).offset
  );
}

describe('findFirstIndex', () => {
  it('finds the first index matching the predicate', () => {
    expect(findFirstIndex(10, (index) => index >= 3)).toBe(3);
    expect(findFirstIndex(10, () => true)).toBe(0);
  });

  it('returns count when nothing matches', () => {
    expect(findFirstIndex(10, () => false)).toBe(10);
    expect(findFirstIndex(0, () => true)).toBe(0);
  });
});

describe('LinearLayoutManager', () => {
  it('stacks unmeasured items using the default estimate', () => {
    const layoutManager = createLayoutManager(3);
    expect(offsets(layoutManager)).toEqual([
      0,
      DEFAULT_ESTIMATED_ITEM_SIZE,
      2 * DEFAULT_ESTIMATED_ITEM_SIZE,
    ]);
    expect(layoutManager.getContentSize()).toBe(
      3 * DEFAULT_ESTIMATED_ITEM_SIZE
    );
  });

  it('uses measured sizes and estimates the rest from their average', () => {
    const layoutManager = createLayoutManager(4);
    const hasChanged = layoutManager.applyMeasurements([
      { index: 0, size: 20 },
      { index: 1, size: 40 },
    ]);

    expect(hasChanged).toBe(true);
    expect(layoutManager.getEstimatedItemSize()).toBe(30);
    expect(offsets(layoutManager)).toEqual([0, 20, 60, 90]);
    expect(layoutManager.getContentSize()).toBe(120);
  });

  it('counts a re-measured item once in the average', () => {
    const layoutManager = createLayoutManager(3);
    layoutManager.applyMeasurements([
      { index: 0, size: 20 },
      { index: 1, size: 40 },
    ]);
    layoutManager.applyMeasurements([{ index: 1, size: 80 }]);

    expect(layoutManager.getEstimatedItemSize()).toBe(50);
  });

  it('drops removed items from the average', () => {
    const layoutManager = createLayoutManager(3);
    layoutManager.applyMeasurements([
      { index: 0, size: 20 },
      { index: 1, size: 40 },
    ]);
    layoutManager.setItemCount(1);

    expect(layoutManager.getEstimatedItemSize()).toBe(20);
  });

  it('ignores measurements that did not change', () => {
    const layoutManager = createLayoutManager(2);
    layoutManager.applyMeasurements([{ index: 0, size: 50 }]);

    expect(layoutManager.applyMeasurements([{ index: 0, size: 50.2 }])).toBe(
      false
    );
    expect(layoutManager.applyMeasurements([{ index: 5, size: 50 }])).toBe(
      false
    );
  });

  it('keeps measured sizes when the item count changes', () => {
    const layoutManager = createLayoutManager(3);
    layoutManager.applyMeasurements([
      { index: 0, size: 10 },
      { index: 1, size: 10 },
      { index: 2, size: 10 },
    ]);

    layoutManager.setItemCount(2);
    expect(layoutManager.getContentSize()).toBe(20);

    layoutManager.setItemCount(4);
    expect(offsets(layoutManager)).toEqual([0, 10, 20, 30]);
    expect(layoutManager.getLayout(3).isMeasured).toBe(false);
  });

  it('finds the items overlapping an offset range', () => {
    const layoutManager = createLayoutManager(10);
    layoutManager.applyMeasurements(
      Array.from({ length: 10 }, (_, index) => ({ index, size: 100 }))
    );

    expect(layoutManager.findItemsInRange(250, 450)).toEqual({
      startIndex: 2,
      endIndex: 5,
    });
    // An item ending exactly at the range start is not included.
    expect(layoutManager.findItemsInRange(300, 400)).toEqual({
      startIndex: 3,
      endIndex: 4,
    });
    expect(layoutManager.findItemsInRange(-500, 50)).toEqual({
      startIndex: 0,
      endIndex: 1,
    });
    expect(layoutManager.findItemsInRange(5000, 6000)).toEqual({
      startIndex: 0,
      endIndex: 0,
    });
  });
});
