import {
  DEFAULT_DRAW_DISTANCE,
  type Area,
  type IndexRange,
  type ScrollDirection,
} from './buffered-range';
import {
  createItemLayout,
  DEFAULT_ESTIMATED_ITEM_SIZE,
  setItemKeys,
  type ItemLayout,
} from './item-layout';

/**
 * Legend List: `InternalState`.
 *
 * Everything the list knows, in one mutable object. Components never read it;
 * they read signals instead, so changing it re-renders nothing.
 */
export interface ListState {
  data: ReadonlyArray<unknown>;
  estimatedItemSize: number;
  drawDistance: number;
  layout: ItemLayout;
  /** Scroll offset. */
  scroll: number;
  /** Viewport height. */
  scrollLength: number;
  scrollDirection: ScrollDirection;
  /**
   * Legend List: `startBuffered` and `endBuffered`.
   *
   * Items to render, from the last pass.
   */
  range: IndexRange | null;
  /**
   * Legend List: `scrollForNextCalculateItemsInView`.
   *
   * Area covered by `range`; while the buffered area stays inside, skip.
   */
  coveredArea: Area | undefined;
  /**
   * Legend List: the `containerItemKey${id}` signals, read back with `peek$`,
   * and their inverse `containerItemKeys`.
   *
   * Item key shown by each container; `undefined` for an unused one.
   */
  containerItems: Array<string | undefined>;
}

/** Legend List: the initial `InternalState` built in `LegendListInner`. */
export function createListState(): ListState {
  return {
    data: [],
    estimatedItemSize: DEFAULT_ESTIMATED_ITEM_SIZE,
    drawDistance: DEFAULT_DRAW_DISTANCE,
    layout: createItemLayout(),
    scroll: 0,
    scrollLength: 0,
    scrollDirection: 0,
    range: null,
    coveredArea: undefined,
    containerItems: [],
  };
}

/**
 * Legend List: the `dataChanged` path of `calculateItemsInView`, which frees
 * the containers of removed items through `pendingRemoval`.
 *
 * Adapts the list to new data, given the key of each item. Containers keep
 * their item wherever it moved; containers of removed items are freed.
 */
export function setListData(
  state: ListState,
  data: ReadonlyArray<unknown>,
  keys: ReadonlyArray<string>
) {
  state.data = data;
  setItemKeys(state.layout, keys);
  const { indexByKey } = state.layout;
  state.containerItems = state.containerItems.map((itemKey) =>
    itemKey !== undefined && indexByKey.has(itemKey) ? itemKey : undefined
  );
  state.coveredArea = undefined;
}
