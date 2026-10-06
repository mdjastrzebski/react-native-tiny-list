import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  ScrollView,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { DEFAULT_DRAW_DISTANCE } from './buffered-range';
import { calculateItemsInView } from './calculate-items-in-view';
import { Containers, type TinyLegendListRenderItemInfo } from './Containers';
import { DEFAULT_ESTIMATED_ITEM_SIZE, recordItemSize } from './item-layout';
import { createListState, setListData } from './list-state';
import { SignalStore } from './signals';

/** Legend List: `LegendListProps`. */
export interface TinyLegendListProps<T> {
  data: ReadonlyArray<T>;
  /** Keep it stable (e.g. `useCallback`), or every item re-renders on every list render. */
  renderItem: (info: TinyLegendListRenderItemInfo<T>) => ReactNode;
  /**
   * Unique key per item. Measured sizes and containers follow the key, so
   * they survive inserts and reorders. Defaults to the index.
   */
  keyExtractor?: (item: T, index: number) => string;
  /** Size assumed for items before the first one is measured. */
  estimatedItemSize?: number;
  /** Extra pixels to render around the viewport, mostly ahead of the scroll. */
  drawDistance?: number;
}

/**
 * Legend List: `LegendList`, which renders `LegendListInner`.
 *
 * A minimal Legend List: a virtualized list built from a pool of absolutely
 * positioned containers.
 *
 * 1. Item positions start as estimates and are corrected as items measure.
 * 2. `calculateItemsInView` assigns the items near the viewport to
 *    containers, reusing the containers farthest away.
 * 3. Containers read their item and position from signals, so the list
 *    itself never re-renders while scrolling.
 */
export function TinyLegendList<T>({
  data,
  renderItem,
  keyExtractor = keyByIndex,
  estimatedItemSize = DEFAULT_ESTIMATED_ITEM_SIZE,
  drawDistance = DEFAULT_DRAW_DISTANCE,
}: TinyLegendListProps<T>) {
  // List state lives in a mutable object; components read signals instead.
  const [state] = useState(createListState);
  const [store] = useState(() => new SignalStore());
  state.estimatedItemSize = estimatedItemSize;
  state.drawDistance = drawDistance;

  // Legend List: `getId`, called lazily and cached in `idCache`.
  const keys = useMemo(() => data.map(keyExtractor), [data, keyExtractor]);

  // New data: update the layout and the containers before the frame is painted.
  useLayoutEffect(() => {
    setListData(state, data, keys);
    calculateItemsInView(state, store);
  }, [state, store, data, keys]);

  // Legend List: `handleLayout`. Needed to establish the viewport height.
  const handleLayout = (event: LayoutChangeEvent) => {
    state.scrollLength = event.nativeEvent.layout.height;
    calculateItemsInView(state, store);
  };

  // Legend List: `onScroll`, which tracks velocity, not only the direction.
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scroll = event.nativeEvent.contentOffset.y;
    if (scroll !== state.scroll) {
      state.scrollDirection = scroll > state.scroll ? 1 : -1;
    }
    state.scroll = scroll;
    calculateItemsInView(state, store);
  };

  // Legend List: `updateItemSizes`, called from `useContainerMeasurement`.
  // Measurements correct the estimates, which moves the items below.
  const handleItemLayout = useCallback(
    (itemKey: string, size: number) => {
      if (recordItemSize(state.layout, itemKey, size)) {
        calculateItemsInView(state, store);
      }
    },
    [state, store]
  );

  return (
    <ScrollView
      onLayout={handleLayout}
      onScroll={handleScroll}
      // The final offset of a drag or fling may arrive only in these events.
      onScrollEndDrag={handleScroll}
      onMomentumScrollEnd={handleScroll}
      scrollEventThrottle={16}
    >
      <Containers
        store={store}
        renderItem={renderItem}
        onItemLayout={handleItemLayout}
      />
    </ScrollView>
  );
}

/** Legend List: the index fallback in `getId`, used without `keyExtractor`. */
function keyByIndex(_item: unknown, index: number): string {
  return String(index);
}
