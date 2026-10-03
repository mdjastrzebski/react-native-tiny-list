import { useReducer, useRef, useState, type ReactNode } from 'react';
import {
  ScrollView,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

export interface NaiveListRenderItemInfo<T> {
  item: T;
  index: number;
}

export interface NaiveListProps<T> {
  data: ReadonlyArray<T>;
  renderItem: (info: NaiveListRenderItemInfo<T>) => ReactNode;
}

/** Size used for items that have not been measured yet. */
export const DEFAULT_ITEM_SIZE = 50;

export interface RenderWindow {
  /** First rendered index (inclusive). */
  start: number;
  /** Last rendered index (exclusive). */
  end: number;
  /** Size of the spacer standing in for items before `start`. */
  leadingSize: number;
  /** Size of the spacer standing in for items from `end` on. */
  trailingSize: number;
}

/**
 * Picks the items that overlap the viewport plus one viewport of buffer on
 * each side. Unmeasured items count as `DEFAULT_ITEM_SIZE`.
 */
export function computeRenderWindow(
  itemCount: number,
  sizes: ReadonlyArray<number | undefined>,
  scrollOffset: number,
  viewportSize: number
): RenderWindow {
  const windowStart = scrollOffset - viewportSize;
  const windowEnd = scrollOffset + viewportSize * 2;

  let start = itemCount;
  let end = itemCount;
  let leadingSize = 0;
  let offset = 0;
  for (let index = 0; index < itemCount; index++) {
    const size = sizes[index] ?? DEFAULT_ITEM_SIZE;
    if (start === itemCount && offset + size > windowStart) {
      start = index;
      leadingSize = offset;
    }
    if (start !== itemCount && offset >= windowEnd) {
      end = index;
      break;
    }
    offset += size;
  }

  let trailingSize = 0;
  for (let index = end; index < itemCount; index++) {
    trailingSize += sizes[index] ?? DEFAULT_ITEM_SIZE;
  }

  if (start === itemCount) {
    // Scrolled past all content (e.g. data shrank): render nothing.
    leadingSize = offset;
  }

  return { start, end, leadingSize, trailingSize };
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

  const { start, end, leadingSize, trailingSize } = computeRenderWindow(
    data.length,
    sizesRef.current,
    scrollOffset,
    viewportSize
  );

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
      onLayout={handleLayout}
      scrollEventThrottle={16}
    >
      <View style={{ height: leadingSize }} />
      {items}
      <View style={{ height: trailingSize }} />
    </ScrollView>
  );
}
