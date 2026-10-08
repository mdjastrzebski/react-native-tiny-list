import {
  memo,
  useLayoutEffect,
  useRef,
  type ReactNode,
  type RefObject,
} from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import type { HostView } from './measure-layout';

/** FlashList: `ListRenderItemInfo`. */
export interface TinyFlashListRenderItemInfo<T> {
  item: T;
  index: number;
}

/**
 * FlashList: the `refHolder` prop, which has no type name of its own.
 *
 * Mounted cell views by item index, read by the list's measurement pass.
 */
export type CellRefs = Map<number, RefObject<HostView | null>>;

/** FlashList: `ViewHolderProps`, with `cellRefs` named `refHolder`. */
interface ViewHolderProps<T> {
  index: number;
  item: T;
  /** Top of the cell inside the list content. */
  offset: number;
  renderItem: (info: TinyFlashListRenderItemInfo<T>) => ReactNode;
  cellRefs: CellRefs;
  onSizeChanged: (index: number, size: number) => void;
}

/**
 * FlashList: `ViewHolder`.
 *
 * One cell of the list. The list gives it a recycle key, so the same instance
 * shows different items over time.
 */
function ViewHolderInternal<T>({
  index,
  item,
  offset,
  renderItem,
  cellRefs,
  onSizeChanged,
}: ViewHolderProps<T>) {
  const viewRef = useRef<HostView>(null);

  // Register for measurement. Child layout effects run before the parent's,
  // so the list finds this cell when it measures in its own layout effect.
  useLayoutEffect(() => {
    cellRefs.set(index, viewRef);
    return () => {
      // A recycled cell may already be registered under its new index.
      if (cellRefs.get(index) === viewRef) {
        cellRefs.delete(index);
      }
    };
  }, [index, cellRefs]);

  // Catches size changes the list did not cause, e.g. a row that expands on tap.
  const handleLayout = (event: LayoutChangeEvent) => {
    onSizeChanged(index, event.nativeEvent.layout.height);
  };

  return (
    <View
      ref={viewRef}
      testID={`cell-${index}`}
      onLayout={handleLayout}
      // Absolute positioning: the layout manager decides where each cell goes.
      style={[styles.cell, { top: offset }]}
    >
      {renderItem({ item, index })}
    </View>
  );
}

/** Memoized so cells whose item and position are unchanged skip re-rendering. */
export const ViewHolder = memo(ViewHolderInternal) as typeof ViewHolderInternal;

const styles = StyleSheet.create({
  cell: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
});
