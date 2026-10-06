import { describe, expect, it } from '@jest/globals';
import { computeEngagedRange } from '../engaged-indices';
import { LinearLayoutManager } from '../layout-manager';

function createLayoutManager(itemCount: number, itemSize: number) {
  const layoutManager = new LinearLayoutManager();
  layoutManager.setItemCount(itemCount);
  layoutManager.applyMeasurements(
    Array.from({ length: itemCount }, (_, index) => ({ index, size: itemSize }))
  );
  return layoutManager;
}

describe('computeEngagedRange', () => {
  it('engages nothing before the viewport is measured', () => {
    expect(
      computeEngagedRange({
        layoutManager: createLayoutManager(100, 50),
        scrollOffset: 0,
        viewportSize: 0,
        drawDistance: 250,
      })
    ).toEqual({ startIndex: 0, endIndex: 0 });
  });

  it('engages the viewport plus the draw distance on each side', () => {
    // Window is [750, 1750): items 15..34.
    expect(
      computeEngagedRange({
        layoutManager: createLayoutManager(100, 50),
        scrollOffset: 1000,
        viewportSize: 500,
        drawDistance: 250,
      })
    ).toEqual({ startIndex: 15, endIndex: 35 });
  });

  it('stops at the ends of the list', () => {
    // Window is [-250, 750), but the list starts at 0.
    expect(
      computeEngagedRange({
        layoutManager: createLayoutManager(100, 50),
        scrollOffset: 0,
        viewportSize: 500,
        drawDistance: 250,
      })
    ).toEqual({ startIndex: 0, endIndex: 15 });

    // Window is [4250, 5250), but the list ends at 5000.
    expect(
      computeEngagedRange({
        layoutManager: createLayoutManager(100, 50),
        scrollOffset: 4500,
        viewportSize: 500,
        drawDistance: 250,
      })
    ).toEqual({ startIndex: 85, endIndex: 100 });
  });
});
