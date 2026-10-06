import { describe, expect, it } from '@jest/globals';
import type { IndexRange } from '../index-range';
import { RenderStack } from '../render-stack';

const range = (startIndex: number, endIndex: number): IndexRange => ({
  startIndex,
  endIndex,
});

const sameType = () => 'row';

/** Render stack as `{ key: index }`, for easy comparison. */
function indexByKey(renderStack: RenderStack) {
  return Object.fromEntries(
    Array.from(renderStack.getEntries(), ([key, { index }]) => [key, index])
  );
}

describe('RenderStack', () => {
  it('creates a key for every engaged index', () => {
    const renderStack = new RenderStack();
    renderStack.sync(range(0, 3), 100, sameType);
    expect(indexByKey(renderStack)).toEqual({ 0: 0, 1: 1, 2: 2 });
  });

  it('keeps the keys of items that stay engaged', () => {
    const renderStack = new RenderStack();
    renderStack.sync(range(0, 3), 100, sameType);
    renderStack.sync(range(1, 4), 100, sameType);

    // Items 1 and 2 keep keys "1" and "2"; key "0" moves to item 3.
    expect(indexByKey(renderStack)).toEqual({ 0: 3, 1: 1, 2: 2 });
  });

  it('reuses keys of items that scrolled out instead of creating new ones', () => {
    const renderStack = new RenderStack();
    renderStack.sync(range(0, 3), 100, sameType);
    renderStack.sync(range(10, 13), 100, sameType);

    expect(renderStack.getEntries().size).toBe(3);
    expect(Object.values(indexByKey(renderStack)).sort()).toEqual([10, 11, 12]);
  });

  it('keeps unused keys mounted at their old item', () => {
    const renderStack = new RenderStack();
    renderStack.sync(range(0, 4), 100, sameType);
    renderStack.sync(range(2, 4), 100, sameType);

    expect(indexByKey(renderStack)).toEqual({ 0: 0, 1: 1, 2: 2, 3: 3 });
  });

  it('drops keys whose item no longer exists', () => {
    const renderStack = new RenderStack();
    renderStack.sync(range(0, 4), 4, sameType);
    renderStack.sync(range(0, 2), 2, sameType);

    expect(indexByKey(renderStack)).toEqual({ 0: 0, 1: 1 });
  });

  it('recycles keys only between items of the same type', () => {
    const typeOf = (index: number) => (index % 2 === 0 ? 'even' : 'odd');
    const renderStack = new RenderStack();
    renderStack.sync(range(0, 1), 100, typeOf); // key "0" renders an even item
    renderStack.sync(range(1, 2), 100, typeOf); // an odd item cannot take it

    expect(indexByKey(renderStack)).toEqual({ 0: 0, 1: 1 });

    renderStack.sync(range(2, 3), 100, typeOf); // an even item can
    expect(indexByKey(renderStack)).toEqual({ 0: 2, 1: 1 });
  });

  it('frees the key of an item whose type changed', () => {
    let itemType = 'row';
    const renderStack = new RenderStack();
    renderStack.sync(range(0, 1), 100, () => itemType);

    itemType = 'header';
    renderStack.sync(range(0, 1), 100, () => itemType);

    expect(indexByKey(renderStack)).toEqual({ 1: 0 });
  });
});
