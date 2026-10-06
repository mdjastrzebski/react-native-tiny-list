import {
  useCallback,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { computeEngagedRange, DEFAULT_DRAW_DISTANCE } from './engaged-indices';
import { areRangesEqual, EMPTY_RANGE } from './index-range';
import { LinearLayoutManager } from './layout-manager';
import {
  measureItemSize,
  measureViewportSize,
  type HostView,
} from './measure-layout';
import { RenderStack } from './render-stack';
import {
  ViewHolder,
  type CellRefs,
  type MiniFlashListRenderItemInfo,
} from './ViewHolder';

/** FlashList: the fallback in `RecyclerViewManager.getItemType`. */
const DEFAULT_ITEM_TYPE = 'default';

/**
 * FlashList: `RenderTimeTracker.maxRendersWithoutCommit`, which is 40.
 *
 * Safety net against a measure → re-render loop that never settles.
 */
const MAX_RENDERS_WITHOUT_PAINT = 10;

/** FlashList: `FlashListProps`. */
export interface MiniFlashListProps<T> {
  data: ReadonlyArray<T>;
  /** Keep it stable (e.g. `useCallback`), or every cell re-renders on every list render. */
  renderItem: (info: MiniFlashListRenderItemInfo<T>) => ReactNode;
  /** Unique key per item. Lets an item keep its cell when its index changes. */
  keyExtractor?: (item: T, index: number) => string;
  /** Cells are only recycled between items of the same type. */
  getItemType?: (item: T, index: number) => string;
  /** Extra pixels to render above and below the viewport. */
  drawDistance?: number;
}

/**
 * FlashList: `FlashList`, which renders `RecyclerView`.
 *
 * A minimal FlashList: a virtualized list that recycles its cells.
 *
 * 1. `LinearLayoutManager` keeps a position and size for every item.
 * 2. `computeEngagedRange` picks the items near the viewport.
 * 3. `RenderStack` hands those items recycled React keys.
 * 4. A layout effect measures the cells before paint and re-renders if
 *    anything moved.
 */
export function MiniFlashList<T>({
  data,
  renderItem,
  keyExtractor,
  getItemType,
  drawDistance = DEFAULT_DRAW_DISTANCE,
}: MiniFlashListProps<T>) {
  // List state lives in plain mutable objects, like FlashList's
  // `RecyclerViewManager`. React state is only a "render again" trigger.
  const [layoutManager] = useState(() => new LinearLayoutManager());
  const [renderStack] = useState(() => new RenderStack());
  const [cellRefs] = useState<CellRefs>(() => new Map());
  const [, forceRender] = useReducer((count: number) => count + 1, 0);

  const containerRef = useRef<HostView>(null);
  const scrollOffsetRef = useRef(0);
  const viewportSizeRef = useRef(0);
  const engagedRangeRef = useRef(EMPTY_RANGE);
  const rendersWithoutPaintRef = useRef(0);

  const getEngagedRange = () =>
    computeEngagedRange({
      layoutManager,
      scrollOffset: scrollOffsetRef.current,
      viewportSize: viewportSizeRef.current,
      drawDistance,
    });

  // Steps 1–3 run on every render. All of them are idempotent, so a repeated
  // render with the same inputs produces the same cells.
  layoutManager.setItemCount(data.length);
  const engagedRange = getEngagedRange();
  engagedRangeRef.current = engagedRange;
  renderStack.sync(
    engagedRange,
    data.length,
    // FlashList: `RecyclerViewManager.getDataKey`. Without `keyExtractor`,
    // an item is identified by its index.
    (index) => keyExtractor?.(data[index] as T, index) ?? String(index),
    (index) =>
      getItemType ? getItemType(data[index] as T, index) : DEFAULT_ITEM_TYPE
  );

  // Step 4: after every commit, measure synchronously and fix up before paint.
  useLayoutEffect(() => {
    const viewportSize = containerRef.current
      ? measureViewportSize(containerRef.current)
      : 0;
    const hasViewportChanged = viewportSize !== viewportSizeRef.current;
    viewportSizeRef.current = viewportSize;

    const measurements = [];
    for (const [index, cellRef] of cellRefs) {
      if (cellRef.current) {
        measurements.push({ index, size: measureItemSize(cellRef.current) });
      }
    }
    const hasLayoutChanged = layoutManager.applyMeasurements(measurements);

    // A state update in a layout effect re-renders before the frame is
    // painted, so the user never sees cells at their estimated positions.
    if (hasViewportChanged || hasLayoutChanged) {
      if (rendersWithoutPaintRef.current < MAX_RENDERS_WITHOUT_PAINT) {
        rendersWithoutPaintRef.current += 1;
        forceRender();
        return;
      }
      console.warn('MiniFlashList: layout did not settle, painting anyway.');
    }
    rendersWithoutPaintRef.current = 0;
  });

  // Cells report size changes the list did not cause; re-render to re-measure.
  const handleSizeChanged = useCallback(
    (index: number, size: number) => {
      if (index < layoutManager.getItemCount()) {
        const layout = layoutManager.getLayout(index);
        if (!layout.isMeasured || layout.size !== size) {
          forceRender();
        }
      }
    },
    [layoutManager]
  );

  // Render only when a different set of items is needed,
  // not on every scroll event.
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
    if (!areRangesEqual(getEngagedRange(), engagedRangeRef.current)) {
      forceRender();
    }
  };

  return (
    <View
      ref={containerRef}
      style={styles.container}
      // The viewport resized (e.g. rotation); the layout effect re-measures it.
      onLayout={() => forceRender()}
    >
      <ScrollView
        onScroll={handleScroll}
        // The final offset of a drag or fling may arrive only in these events.
        onScrollEndDrag={handleScroll}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
      >
        {/* One view as tall as all items; cells are positioned inside it. */}
        <View style={{ height: layoutManager.getContentSize() }}>
          {Array.from(renderStack.getEntries(), ([key, { index }]) => (
            // The key is a recycle key, not the item's identity: the same
            // cell instance renders whichever item the render stack gives it.
            <ViewHolder
              key={key}
              index={index}
              item={data[index] as T}
              offset={layoutManager.getLayout(index).offset}
              renderItem={renderItem}
              cellRefs={cellRefs}
              onSizeChanged={handleSizeChanged}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
