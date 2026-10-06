import { describe, expect, it } from '@jest/globals';
import { findAvailableContainers } from '../find-available-containers';

/** Items keyed by their index, `'0'` to `'19'`. */
const indexByKey = new Map(
  Array.from({ length: 20 }, (_, index) => [String(index), index])
);

describe('findAvailableContainers', () => {
  it('creates new containers when there are none to reuse', () => {
    expect(
      findAvailableContainers({
        containerItems: [],
        indexByKey,
        neededItems: [0, 1, 2],
        range: { startIndex: 0, endIndex: 2 },
      })
    ).toEqual([0, 1, 2]);
  });

  it('reuses unused containers, then the farthest ones', () => {
    expect(
      findAvailableContainers({
        // Containers 0 and 1 hold items far above and just above the range.
        containerItems: ['2', '9', undefined, '10'],
        indexByKey,
        neededItems: [12, 13, 14],
        range: { startIndex: 10, endIndex: 14 },
      })
    ).toEqual([2, 0, 1]);
  });

  it('never takes a container from an item inside the range', () => {
    expect(
      findAvailableContainers({
        containerItems: ['10', '11'],
        indexByKey,
        neededItems: [12],
        range: { startIndex: 10, endIndex: 12 },
      })
    ).toEqual([2]);
  });

  it('treats a container whose item was removed as unused', () => {
    expect(
      findAvailableContainers({
        containerItems: ['removed', '11'],
        indexByKey,
        neededItems: [12],
        range: { startIndex: 10, endIndex: 12 },
      })
    ).toEqual([0]);
  });
});
