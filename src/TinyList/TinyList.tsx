import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import {
  ScrollView,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import {
  areRenderWindowsEqual,
  computeRenderWindow,
  EMPTY_RENDER_WINDOW,
} from './render-window';

export interface TinyListRenderItemInfo<T> {
  item: T;
  index: number;
}

export interface TinyListProps<T> {
  data: ReadonlyArray<T>;
  renderItem: (info: TinyListRenderItemInfo<T>) => ReactNode;
}

/**
 * The simplest virtualized list: a vertical ScrollView that renders only the
 * items near the viewport and replaces the rest with two spacer views.
 *
 * Main flow: measure the viewport, the items and the scroll offset, compute
 * the render window from them, then render that window between the spacers.
 *
 * Item sizes are measured with `onLayout` and cached by index. Expect blank
 * areas and jumps while scrolling fast or when estimates are off.
 */
export function TinyList<T>({ data, renderItem }: TinyListProps<T>) {
  // Raw measurements live in refs: changing them alone should not re-render
  const scrollOffsetRef = useRef(0);
  const viewportSizeRef = useRef(0);
  const sizesRef = useRef<Array<number | undefined>>([]);

  // Which items to actually render, what spacer to put before and after them.
  // Nothing is measured yet on mount, so this starts as an empty window.
  const [renderWindow, setRenderWindow] = useState(EMPTY_RENDER_WINDOW);
  const { startIndex, sizerBefore, sizerAfter } = renderWindow;

  // Recompute the window from the latest measurements. Setting state only when
  // the window changed avoids needless re-renders.
  const updateRenderWindow = () => {
    const next = computeRenderWindow({
      itemCount: data.length,
      sizes: sizesRef.current,
      scrollOffset: scrollOffsetRef.current,
      viewportSize: viewportSizeRef.current,
    });
    if (!areRenderWindowsEqual(renderWindow, next)) {
      setRenderWindow(next);
    }
  };

  // New data can change the item count, so the window must be recomputed.
  // A layout effect runs before paint, so the stale spacers are never shown.
  // Only `data` matters; re-running on each window change would be wasted.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(updateRenderWindow, [data]);

  // The ScrollView's own height is the viewport size, which sets the window size
  const handleLayout = (event: LayoutChangeEvent) => {
    viewportSizeRef.current = event.nativeEvent.layout.height;
    updateRenderWindow();
  };

  // Replace the estimated size of a rendered item with its real height.
  // Only a changed size can move the window, so skip unchanged ones.
  const handleItemLayout = (index: number, event: LayoutChangeEvent) => {
    const size = event.nativeEvent.layout.height;
    if (sizesRef.current[index] !== size) {
      sizesRef.current[index] = size;
      updateRenderWindow();
    }
  };

  // Track the scroll offset so the window follows the user as they scroll
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
    updateRenderWindow();
  };

  // Items we will actually render. The window is from before `data` changed
  // until the layout effect above runs, so clamp it to the current item count.
  const endIndex = Math.min(renderWindow.endIndex, data.length);
  const items: ReactNode[] = [];
  for (let index = startIndex; index < endIndex; index++) {
    items.push(
      // Wrap each item in a View so `onLayout` can measure its height
      <View key={index} onLayout={(event) => handleItemLayout(index, event)}>
        {renderItem({ item: data[index] as T, index })}
      </View>
    );
  }

  return (
    <ScrollView
      onScroll={handleScroll}
      // `onScroll` is throttled, so it can miss the final offset. React Native
      // reports it in `onScrollEndDrag` (drag) and `onMomentumScrollEnd` (fling).
      onScrollEndDrag={handleScroll}
      onMomentumScrollEnd={handleScroll}
      onLayout={handleLayout}
      // Deliver scroll events at most about once per frame (16 ms)
      scrollEventThrottle={16}
    >
      {/* Spacers keep the content at full height, so the scroll bar and
          scroll offset match a list with every item rendered */}
      <View style={{ height: sizerBefore }} />
      {items}
      <View style={{ height: sizerAfter }} />
    </ScrollView>
  );
}
