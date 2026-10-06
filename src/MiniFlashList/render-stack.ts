import { isInRange, type IndexRange } from './index-range';

/**
 * FlashList: the values of `RenderStackManager.keyMap`, which add a `stableId`.
 *
 * What a recycle key currently renders.
 */
export interface RenderStackEntry {
  index: number;
  itemType: string;
}

/**
 * FlashList: `RenderStackManager`. Methods: `getEntries` is `getRenderStack`.
 *
 * Maps React keys ("recycle keys") to the items they render.
 *
 * This is the heart of recycling. When an item scrolls out and another one
 * scrolls in, the new item takes over the old item's key. React then sees the
 * same component with new props and updates the existing views instead of
 * unmounting one cell and mounting another.
 */
export class RenderStack {
  /** Recycle key -> entry. Map order is insertion order, so it stays stable. */
  private entries = new Map<string, RenderStackEntry>();
  private nextKey = 0;

  getEntries(): ReadonlyMap<string, RenderStackEntry> {
    return this.entries;
  }

  /**
   * Gives every engaged index a key, reusing keys of items that left.
   *
   * A key only moves between items of the same type: a cell built for a
   * header would have to be rebuilt from scratch to show a row anyway.
   */
  sync(
    engagedRange: IndexRange,
    itemCount: number,
    getItemType: (index: number) => string
  ) {
    const keyByIndex = new Map<number, string>();
    const freeKeysByType = new Map<string, string[]>();

    // Step 1: engaged items keep their key; every other key becomes free.
    for (const [key, entry] of this.entries) {
      const isStillValid =
        entry.index < itemCount && getItemType(entry.index) === entry.itemType;
      if (isStillValid && isInRange(entry.index, engagedRange)) {
        keyByIndex.set(entry.index, key);
      } else {
        getOrCreate(freeKeysByType, entry.itemType).push(key);
      }
    }

    // Step 2: engaged items without a key reuse a free key of their type, or get a new one.
    for (
      let index = engagedRange.startIndex;
      index < engagedRange.endIndex;
      index++
    ) {
      if (keyByIndex.has(index)) {
        continue;
      }
      const itemType = getItemType(index);
      const key = freeKeysByType.get(itemType)?.pop() ?? String(this.nextKey++);
      // `set` on an existing key keeps its place in the map, so React does not move views.
      this.entries.set(key, { index, itemType });
      keyByIndex.set(index, key);
    }

    // Step 3: unused free keys stay mounted off screen, ready for the next
    // scroll. Drop the ones whose item no longer exists or changed type.
    for (const freeKeys of freeKeysByType.values()) {
      for (const key of freeKeys) {
        const entry = this.entries.get(key)!;
        const keepMounted =
          entry.index < itemCount &&
          getItemType(entry.index) === entry.itemType &&
          !isInRange(entry.index, engagedRange);
        if (!keepMounted) {
          this.entries.delete(key);
        }
      }
    }
  }
}

function getOrCreate<K, V>(map: Map<K, V[]>, key: K): V[] {
  let values = map.get(key);
  if (!values) {
    values = [];
    map.set(key, values);
  }
  return values;
}
