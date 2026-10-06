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

  // Needed to establish viewport height
  const handleLayout = (event: LayoutChangeEvent) => {
    viewportSizeRef.current = event.nativeEvent.layout.height;
    updateRenderWindow();
  };

  // Needed to get actual item size
  const handleItemLayout = (index: number, event: LayoutChangeEvent) => {
    const size = event.nativeEvent.layout.height;
    if (sizesRef.current[index] !== size) {
      sizesRef.current[index] = size;
      updateRenderWindow();
    }
  };

  // Needed to get the current scroll positon
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
      // Wrapper view to handle sizing
      <View key={index} onLayout={(event) => handleItemLayout(index, event)}>
        {renderItem({ item: data[index] as T, index })}
      </View>
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
      <View style={{ height: sizerBefore }} />
      {items}
      <View style={{ height: sizerAfter }} />
    </ScrollView>
  );
}
