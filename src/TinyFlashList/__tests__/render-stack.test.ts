import { describe, expect, it } from '@jest/globals';
import type { IndexRange } from '../index-range';
import { RenderStack } from '../render-stack';

const range = (startIndex: number, endIndex: number): IndexRange => ({
  startIndex,
  endIndex,
});

const sameType = () => 'row';

/** No `keyExtractor`: items are identified by their index. */
const byIndex = (index: number) => String(index);

/** Stable ids of `ids`, as a `keyExtractor` would return them. */
const idsOf = (ids: string[]) => (index: number) => ids[index]!;

/** Render stack as `{ key: index }`, for easy comparison. */
function indexByKey(renderStack: RenderStack) {
  return Object.fromEntries(
    Array.from(renderStack.getEntries(), ([key, { index }]) => [key, index])
  );
}

describe('RenderStack', () => {
  it('creates a key for every engaged index', () => {
    const renderStack = new RenderStack();
    renderStack.sync(range(0, 3), 100, byIndex, sameType);
    expect(indexByKey(renderStack)).toEqual({ 0: 0, 1: 1, 2: 2 });
  });

  it('keeps the keys of items that stay engaged', () => {
    const renderStack = new RenderStack();
    renderStack.sync(range(0, 3), 100, byIndex, sameType);
    renderStack.sync(range(1, 4), 100, byIndex, sameType);

    // Items 1 and 2 keep keys "1" and "2"; key "0" moves to item 3.
    expect(indexByKey(renderStack)).toEqual({ 0: 3, 1: 1, 2: 2 });
  });

  it('reuses keys of items that scrolled out instead of creating new ones', () => {
    const renderStack = new RenderStack();
    renderStack.sync(range(0, 3), 100, byIndex, sameType);
    renderStack.sync(range(10, 13), 100, byIndex, sameType);

    expect(renderStack.getEntries().size).toBe(3);
    expect(Object.values(indexByKey(renderStack)).sort()).toEqual([10, 11, 12]);
  });

  it('keeps unused keys mounted at their old item', () => {
    const renderStack = new RenderStack();
    renderStack.sync(range(0, 4), 100, byIndex, sameType);
    renderStack.sync(range(2, 4), 100, byIndex, sameType);

    expect(indexByKey(renderStack)).toEqual({ 0: 0, 1: 1, 2: 2, 3: 3 });
  });

  it('drops keys whose item no longer exists', () => {
    const renderStack = new RenderStack();
    renderStack.sync(range(0, 4), 4, byIndex, sameType);
    renderStack.sync(range(0, 2), 2, byIndex, sameType);

    expect(indexByKey(renderStack)).toEqual({ 0: 0, 1: 1 });
  });

  it('recycles keys only between items of the same type', () => {
    const typeOf = (index: number) => (index % 2 === 0 ? 'even' : 'odd');
    const renderStack = new RenderStack();
    renderStack.sync(range(0, 1), 100, byIndex, typeOf); // key "0" renders an even item
    renderStack.sync(range(1, 2), 100, byIndex, typeOf); // an odd item cannot take it

    expect(indexByKey(renderStack)).toEqual({ 0: 0, 1: 1 });

    renderStack.sync(range(2, 3), 100, byIndex, typeOf); // an even item can
    expect(indexByKey(renderStack)).toEqual({ 0: 2, 1: 1 });
  });

  it('frees the key of an item whose type changed', () => {
    let itemType = 'row';
    const renderStack = new RenderStack();
    renderStack.sync(range(0, 1), 100, byIndex, () => itemType);

    itemType = 'header';
    renderStack.sync(range(0, 1), 100, byIndex, () => itemType);

    expect(indexByKey(renderStack)).toEqual({ 1: 0 });
  });

  it('keeps the key of an item that moved to another index', () => {
    const renderStack = new RenderStack();
    renderStack.sync(range(0, 3), 3, idsOf(['a', 'b', 'c']), sameType);

    // Insert "x" at the top: "a", "b" and "c" keep keys "0", "1" and "2".
    renderStack.sync(range(0, 4), 4, idsOf(['x', 'a', 'b', 'c']), sameType);
    expect(indexByKey(renderStack)).toEqual({ 0: 1, 1: 2, 2: 3, 3: 0 });
  });

  it('gives items with duplicate stable ids different keys', () => {
    const renderStack = new RenderStack();
    renderStack.sync(range(0, 2), 2, idsOf(['a', 'a']), sameType);
    renderStack.sync(range(0, 2), 2, idsOf(['a', 'a']), sameType);

    // Which item gets which key is undefined, but no key is shared.
    expect(Object.values(indexByKey(renderStack)).sort()).toEqual([0, 1]);
  });
});
