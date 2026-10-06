import { describe, expect, it } from '@jest/globals';
import {
  createItemLayout,
  recordItemSize,
  setItemKeys,
  updateItemPositions,
} from '../item-layout';

/** A layout of items keyed `a`, `b`, `c`, ..., in that order. */
function layoutWith(itemCount: number) {
  const layout = createItemLayout();
  setItemKeys(layout, 'abcdefghij'.slice(0, itemCount).split(''));
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

    expect(recordItemSize(layout, 'c', 40)).toBe(true);
    expect(layout.invalidFromIndex).toBe(2);
    updateItemPositions(layout, 100);

    // Unmeasured item 3 now uses the average of the measured sizes (40).
    expect(layout.sizes).toEqual([100, 100, 40, 40]);
    expect(layout.positions).toEqual([0, 100, 200, 240]);
    expect(layout.totalSize).toBe(280);
  });

  it('does nothing when a measurement matches the size in use', () => {
    const layout = layoutWith(2);
    expect(recordItemSize(layout, 'a', 100)).toBe(false);
    expect(updateItemPositions(layout, 100)).toBe(false);
  });

  it('keeps a running average of measured sizes', () => {
    const layout = layoutWith(3);
    recordItemSize(layout, 'a', 20);
    recordItemSize(layout, 'b', 40);
    expect(layout.averageSize).toEqual({ value: 30, count: 2 });

    // Re-measuring an item replaces its old size in the average.
    recordItemSize(layout, 'b', 60);
    expect(layout.averageSize).toEqual({ value: 40, count: 2 });
  });

  it('leaves sizes of 0 out of the average', () => {
    const layout = layoutWith(4);
    recordItemSize(layout, 'a', 40);
    recordItemSize(layout, 'b', 0);
    expect(layout.averageSize).toEqual({ value: 40, count: 1 });

    // A row that grows from 0 joins the average.
    recordItemSize(layout, 'b', 60);
    expect(layout.averageSize).toEqual({ value: 50, count: 2 });

    // A row that shrinks to 0 keeps its old size in the average.
    recordItemSize(layout, 'b', 0);
    expect(layout.averageSize).toEqual({ value: 50, count: 2 });

    // Unmeasured items are estimated from the average.
    updateItemPositions(layout, 100);
    expect(layout.sizes).toEqual([40, 0, 50, 50]);
  });

  it('extends and trims the layout when items are added or removed', () => {
    const layout = layoutWith(2);
    recordItemSize(layout, 'a', 50);
    updateItemPositions(layout, 100);

    setItemKeys(layout, ['a', 'b', 'c']);
    updateItemPositions(layout, 100);
    expect(layout.positions).toEqual([0, 50, 100]);

    setItemKeys(layout, ['a']);
    updateItemPositions(layout, 100);
    expect(layout.positions).toEqual([0]);
    expect(layout.totalSize).toBe(50);
  });

  it('keeps measured sizes with their item when items move', () => {
    const layout = layoutWith(2);
    recordItemSize(layout, 'a', 20);
    recordItemSize(layout, 'b', 40);
    updateItemPositions(layout, 100);

    // Inserting `z` at the top moves the measured items down by one index.
    setItemKeys(layout, ['z', 'a', 'b']);
    expect(layout.invalidFromIndex).toBe(0);
    updateItemPositions(layout, 100);
    expect(layout.sizes).toEqual([30, 20, 40]);
    expect(layout.indexByKey.get('b')).toBe(2);
  });

  it('forgets the sizes of removed items', () => {
    const layout = layoutWith(2);
    recordItemSize(layout, 'a', 20);
    recordItemSize(layout, 'b', 40);

    setItemKeys(layout, ['b']);
    expect(layout.knownSizes.has('a')).toBe(false);
    expect(layout.averageSize).toEqual({ value: 40, count: 1 });
    // A late measurement from the removed item's container is ignored.
    expect(recordItemSize(layout, 'a', 10)).toBe(false);
  });

  it('keeps positions above the first changed key', () => {
    const layout = layoutWith(3);
    setItemKeys(layout, ['a', 'b', 'z']);
    expect(layout.invalidFromIndex).toBe(2);
  });
});
