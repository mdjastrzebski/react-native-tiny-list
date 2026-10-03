import { useReducer, useRef, useState, type ReactNode } from 'react';
import {
  ScrollView,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { computeRenderWindow } from './render-window';

export interface NaiveListRenderItemInfo<T> {
  item: T;
  index: number;
}

export interface NaiveListProps<T> {
  data: ReadonlyArray<T>;
  renderItem: (info: NaiveListRenderItemInfo<T>) => ReactNode;
}

/**
 * The simplest virtualized list: a vertical ScrollView that renders only the
 * items near the viewport and replaces the rest with two spacer views.
 *
 * Item sizes are measured with `onLayout` and cached by index. Expect blank
 * areas and jumps while scrolling fast or when estimates are off.
 */
export function NaiveList<T>({ data, renderItem }: NaiveListProps<T>) {
  const sizesRef = useRef<Array<number | undefined>>([]);
  const [, forceRender] = useReducer((count: number) => count + 1, 0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [viewportSize, setViewportSize] = useState(0);

  const { start, end, leadingSize, trailingSize } = computeRenderWindow({
    itemCount: data.length,
    sizes: sizesRef.current,
    scrollOffset,
    viewportSize,
  });

  // The final offset of a drag or momentum scroll may only be reported by the
  // matching end event, not by `onScroll`.
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setScrollOffset(event.nativeEvent.contentOffset.y);
  };

  const handleLayout = (event: LayoutChangeEvent) => {
    setViewportSize(event.nativeEvent.layout.height);
  };

  const handleItemLayout = (index: number, event: LayoutChangeEvent) => {
    const size = event.nativeEvent.layout.height;
    if (sizesRef.current[index] !== size) {
      sizesRef.current[index] = size;
      forceRender();
    }
  };

  const items: ReactNode[] = [];
  for (let index = start; index < end; index++) {
    items.push(
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
      <View style={{ height: leadingSize }} />
      {items}
      <View style={{ height: trailingSize }} />
    </ScrollView>
  );
}
