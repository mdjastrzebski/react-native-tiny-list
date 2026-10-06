import { isInRange, type IndexRange } from './index-range';

/**
 * FlashList: the values of `RenderStackManager.keyMap`.
 *
 * What a recycle key currently renders.
 */
export interface RenderStackEntry {
  index: number;
  /** The item's identity: `keyExtractor` output, or the index without one. */
  stableId: string;
  itemType: string;
}

/**
 * FlashList: `RenderStackManager`. Methods: `getEntries` is `getRenderStack`.
 * Unlike FlashList, an item whose type changed gets a new key.
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
   * Keys follow the item's `stableId`, not its index, so an item that moves
   * (e.g. after an insert above it) keeps its cell and the cell's state.
   * A key only moves between items of the same type: a cell built for a
   * header would have to be rebuilt from scratch to show a row anyway.
   */
  sync(
    engagedRange: IndexRange,
    itemCount: number,
    getStableId: (index: number) => string,
    getItemType: (index: number) => string
  ) {
    // Step 1: look up current keys by the item they render.
    const keyByStableId = new Map<string, string>();
    for (const [key, entry] of this.entries) {
      keyByStableId.set(entry.stableId, key);
    }

    // Step 2: engaged items that already have a key keep it, even if their
    // index changed. The `usedKeys` check guards against duplicate stable ids.
    const usedKeys = new Set<string>();
    const itemsWithoutKey: RenderStackEntry[] = [];
    for (
      let index = engagedRange.startIndex;
      index < engagedRange.endIndex;
      index++
    ) {
      const item = {
        index,
        stableId: getStableId(index),
        itemType: getItemType(index),
      };
      const key = keyByStableId.get(item.stableId);
      if (
        key !== undefined &&
        !usedKeys.has(key) &&
        this.entries.get(key)!.itemType === item.itemType
      ) {
        this.entries.set(key, item);
        usedKeys.add(key);
      } else {
        itemsWithoutKey.push(item);
      }
    }

    // Step 3: every other key is free, pooled by the type of cell it holds.
    const freeKeysByType = new Map<string, string[]>();
    for (const [key, entry] of this.entries) {
      if (!usedKeys.has(key)) {
        getOrCreate(freeKeysByType, entry.itemType).push(key);
      }
    }

    // Step 4: engaged items without a key reuse a free key of their type, or get a new one.
    for (const item of itemsWithoutKey) {
      const key =
        freeKeysByType.get(item.itemType)?.pop() ?? String(this.nextKey++);
      // `set` on an existing key keeps its place in the map, so React does not move views.
      this.entries.set(key, item);
    }

    // Step 5: unused free keys stay mounted off screen at their old index,
    // ready for the next scroll, now showing whatever item is at that index.
    // Drop the ones whose index no longer exists or holds another type.
    for (const freeKeys of freeKeysByType.values()) {
      for (const key of freeKeys) {
        const { index, itemType } = this.entries.get(key)!;
        const keepMounted =
          index < itemCount &&
          !isInRange(index, engagedRange) &&
          getItemType(index) === itemType;
        if (keepMounted) {
          this.entries.set(key, {
            index,
            stableId: getStableId(index),
            itemType,
          });
        } else {
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
