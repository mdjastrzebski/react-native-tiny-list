import { describe, expect, it } from '@jest/globals';
import {
  createItemLayout,
  recordItemSize,
  setItemCount,
  updateItemPositions,
} from '../item-layout';

function layoutWith(itemCount: number) {
  const layout = createItemLayout();
  setItemCount(layout, itemCount);
  updateItemPositions(layout, 100);
  return layout;
}

describe('item layout', () => {
  it('positions unmeasured items with the estimated size', () => {
    const layout = layoutWith(3);
    expect(layout.positions).toEqual([0, 100, 200]);
    expect(layout.totalSize).toBe(300);
  });

  it('moves only the items below a measured item', () => {
    const layout = layoutWith(4);

    expect(recordItemSize(layout, 2, 40)).toBe(true);
    expect(layout.invalidFromIndex).toBe(2);
    updateItemPositions(layout, 100);

    // Unmeasured item 3 now uses the average of the measured sizes (40).
    expect(layout.sizes).toEqual([100, 100, 40, 40]);
    expect(layout.positions).toEqual([0, 100, 200, 240]);
    expect(layout.totalSize).toBe(280);
  });

  it('does nothing when a measurement matches the size in use', () => {
    const layout = layoutWith(2);
    expect(recordItemSize(layout, 0, 100)).toBe(false);
    expect(updateItemPositions(layout, 100)).toBe(false);
  });

  it('keeps a running average of measured sizes', () => {
    const layout = layoutWith(3);
    recordItemSize(layout, 0, 20);
    recordItemSize(layout, 1, 40);
    expect(layout.averageSize).toEqual({ value: 30, count: 2 });

    // Re-measuring an item replaces its old size in the average.
    recordItemSize(layout, 1, 60);
    expect(layout.averageSize).toEqual({ value: 40, count: 2 });
  });

  it('extends and trims the layout when the item count changes', () => {
    const layout = layoutWith(2);
    recordItemSize(layout, 0, 50);
    updateItemPositions(layout, 100);

    setItemCount(layout, 3);
    updateItemPositions(layout, 100);
    expect(layout.positions).toEqual([0, 50, 100]);

    setItemCount(layout, 1);
    updateItemPositions(layout, 100);
    expect(layout.positions).toEqual([0]);
    expect(layout.totalSize).toBe(50);
  });
});
