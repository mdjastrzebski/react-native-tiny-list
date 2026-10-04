import {
  memo,
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  ScrollView,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import {
  computeItemOffsets,
  findItemsInArea,
  type ItemRange,
} from './item-offsets';
import {
  computeRenderWindow,
  isRangeInside,
  isSameRange,
} from './render-window';

export interface MiniFlatListRenderItemInfo<T> {
  item: T;
  index: number;
}

export interface MiniFlatListProps<T> {
  data: ReadonlyArray<T>;
  /** Keep it stable (not an inline function) so unchanged items skip re-rendering. */
  renderItem: (info: MiniFlatListRenderItemInfo<T>) => ReactNode;
  /** Unique key per item. Defaults to `item.key`, then `item.id`, then the index. */
  keyExtractor?: (item: T, index: number) => string;
  /** Change it to re-render all items, e.g. when `renderItem` reads outside state. */
  extraData?: unknown;
  /** Items rendered before the viewport is measured. */
  initialNumToRender?: number;
  /** Area to keep rendered, in viewports, centered on the visible one. */
  windowSize?: number;
  /** Most items to add in one update. */
  maxToRenderPerBatch?: number;
  /** Delay between updates that only fill the area off screen, in ms. */
  updateCellsBatchingPeriod?: number;
}

/**
 * A minimal FlatList. Like TinyList it renders items near the viewport
 * between two spacers, but it also:
 *
 * - caches item sizes by key, so they survive inserts and reorders;
 * - skips re-rendering on scroll unless the visible area is not rendered yet;
 * - fills the area off screen in small batches instead of all at once;
 * - memoizes items, so a batch renders only the new ones.
 */
export function MiniFlatList<T>({
  data,
  renderItem,
  keyExtractor = defaultKeyExtractor,
  extraData,
  initialNumToRender = 10,
  windowSize = 21,
  maxToRenderPerBatch = 10,
  updateCellsBatchingPeriod = 50,
}: MiniFlatListProps<T>) {
  const [viewportSize, setViewportSize] = useState(0);

  // Read on demand instead of being state, so scrolling does not re-render.
  const scrollOffsetRef = useRef(0);

  // Measured item sizes by key. A change re-renders the list.
  const sizesRef = useRef(new Map<string, number>());
  const [, forceRender] = useReducer((count: number) => count + 1, 0);

  // Items that are rendered. Grows in batches toward the target window.
  const [renderWindow, setRenderWindow] = useState<ItemRange>(() => ({
    start: 0,
    end: Math.min(initialNumToRender, data.length),
  }));

  // Recomputed on every render. Cheap, as scrolling alone does not re-render.
  const keys = data.map((item, index) => keyExtractor(item, index));
  const offsets = computeItemOffsets(keys, sizesRef.current);

  // Compute and render the next batch now.
  const updateRenderWindow = () => {
    cancelNextBatch();
    const next = computeRenderWindow({
      offsets,
      scrollOffset: scrollOffsetRef.current,
      viewportSize,
      windowSize,
      maxToRenderPerBatch,
      initialNumToRender,
      previous: renderWindow,
    });
    if (!isSameRange(next, renderWindow)) {
      setRenderWindow(next);
    }
  };

  // Only one batch is pending at a time.
  const batchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleNextBatch = () => {
    if (batchTimerRef.current == null) {
      batchTimerRef.current = setTimeout(
        updateRenderWindow,
        updateCellsBatchingPeriod
      );
    }
  };
  const cancelNextBatch = () => {
    if (batchTimerRef.current != null) {
      clearTimeout(batchTimerRef.current);
      batchTimerRef.current = null;
    }
  };

  // After each render, schedule the next batch. The chain stops once a batch
  // leaves the window unchanged. The cleanup cancels a timer scheduled by an
  // earlier render, so a batch never runs with stale offsets.
  useEffect(() => {
    scheduleNextBatch();
    return cancelNextBatch;
  });

  // Needed to establish viewport height
  const handleLayout = (event: LayoutChangeEvent) => {
    setViewportSize(event.nativeEvent.layout.height);
  };

  // Needed to get actual item size. Stable, so memoized cells stay memoized.
  const handleCellLayout = useCallback(
    (key: string, event: LayoutChangeEvent) => {
      const size = event.nativeEvent.layout.height;
      if (sizesRef.current.get(key) !== size) {
        sizesRef.current.set(key, size);
        forceRender();
      }
    },
    []
  );

  // Blank area on screen: render right away. Otherwise fill off screen later.
  // The final drag offset arrives only in `onScrollEndDrag`, so listen to it too.
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
    const visible = findItemsInArea(
      offsets,
      scrollOffsetRef.current,
      scrollOffsetRef.current + viewportSize
    );
    if (isRangeInside(visible, renderWindow)) {
      scheduleNextBatch();
    } else {
      updateRenderWindow();
    }
  };

  // `data` may have shrunk since the window was computed.
  const start = Math.min(renderWindow.start, data.length);
  const end = Math.min(renderWindow.end, data.length);

  const cells: ReactNode[] = [];
  for (let index = start; index < end; index++) {
    const key = keys[index]!;
    cells.push(
      <Cell
        key={key}
        cellKey={key}
        item={data[index] as T}
        index={index}
        renderItem={renderItem}
        extraData={extraData}
        onCellLayout={handleCellLayout}
      />
    );
  }

  return (
    <ScrollView
      onScroll={handleScroll}
      onScrollEndDrag={handleScroll}
      onMomentumScrollEnd={handleScroll}
      onLayout={handleLayout}
      scrollEventThrottle={16}
    >
      <View style={{ height: offsets[start] }} />
      {cells}
      <View style={{ height: offsets[data.length]! - offsets[end]! }} />
    </ScrollView>
  );
}

/** Same default as FlatList: `item.key`, then `item.id`, then the index. */
export function defaultKeyExtractor(item: unknown, index: number): string {
  if (typeof item === 'object' && item != null) {
    if ('key' in item && item.key != null) {
      return String(item.key);
    }
    if ('id' in item && item.id != null) {
      return String(item.id);
    }
  }
  return String(index);
}

interface CellProps<T> {
  cellKey: string;
  item: T;
  index: number;
  renderItem: (info: MiniFlatListRenderItemInfo<T>) => ReactNode;
  /** Unused here; a new value only makes `memo` re-render the cell. */
  extraData: unknown;
  onCellLayout: (key: string, event: LayoutChangeEvent) => void;
}

/**
 * Wraps one item to measure it. Memoized below, so a new batch or a size
 * change re-renders only cells whose props changed.
 */
function CellView<T>({
  cellKey,
  item,
  index,
  renderItem,
  onCellLayout,
}: CellProps<T>) {
  return (
    <View onLayout={(event) => onCellLayout(cellKey, event)}>
      {renderItem({ item, index })}
    </View>
  );
}

// `memo` loses the generic type parameter, so restore it with a cast.
const Cell = memo(CellView) as typeof CellView;
