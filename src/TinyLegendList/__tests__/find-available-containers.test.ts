import { describe, expect, it } from '@jest/globals';
import { findAvailableContainers } from '../find-available-containers';

describe('findAvailableContainers', () => {
  it('creates new containers when there are none to reuse', () => {
    expect(
      findAvailableContainers({
        containerItems: [],
        neededItems: [0, 1, 2],
        range: { startIndex: 0, endIndex: 2 },
      })
    ).toEqual([0, 1, 2]);
  });

  it('reuses unused containers, then the farthest ones', () => {
    expect(
      findAvailableContainers({
        // Containers 0 and 1 hold items far above and just above the range.
        containerItems: [2, 9, undefined, 10],
        neededItems: [12, 13, 14],
        range: { startIndex: 10, endIndex: 14 },
      })
    ).toEqual([2, 0, 1]);
  });

  it('never takes a container from an item inside the range', () => {
    expect(
      findAvailableContainers({
        containerItems: [10, 11],
        neededItems: [12],
        range: { startIndex: 10, endIndex: 12 },
      })
    ).toEqual([2]);
  });
});
