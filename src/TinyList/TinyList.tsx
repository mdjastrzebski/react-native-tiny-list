import { useReducer, useRef, useState, type ReactNode } from 'react';
import {
  ScrollView,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { computeRenderWindow } from './render-window';

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
  const [scrollOffset, setScrollOffset] = useState(0);
  const [viewportSize, setViewportSize] = useState(0);

  const sizesRef = useRef<Array<number | undefined>>([]);
  const [, forceRender] = useReducer((count: number) => count + 1, 0);

  // Which items to actuall render, what spacer to put before and after them
  const { startIndex, endIndex, sizerBefore, sizerAfter } = computeRenderWindow(
    {
      itemCount: data.length,
      sizes: sizesRef.current,
      scrollOffset,
      viewportSize,
    }
  );

  // Needed to establish viewport height
  const handleLayout = (event: LayoutChangeEvent) => {
    setViewportSize(event.nativeEvent.layout.height);
  };

  // Needed to get actual item size
  const handleItemLayout = (index: number, event: LayoutChangeEvent) => {
    const size = event.nativeEvent.layout.height;
    if (sizesRef.current[index] !== size) {
      sizesRef.current[index] = size;
      forceRender();
    }
  };

  // Needed to get the current scroll positon
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setScrollOffset(event.nativeEvent.contentOffset.y);
  };

  // Items we will actually render
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
