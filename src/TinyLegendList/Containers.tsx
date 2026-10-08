import { memo, useMemo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSignal, type SignalStore } from './signals';

/** Legend List: `LegendListRenderItemProps`. */
export interface TinyLegendListRenderItemInfo<T> {
  item: T;
  index: number;
}

/**
 * Legend List: `ContainersProps`, which passes a `getRenderedItem` callback
 * instead of `renderItem`.
 *
 * No `data`: each container reads its own item from a signal, so new data
 * re-renders only the containers whose item changed.
 */
interface ContainersProps<T> {
  store: SignalStore;
  renderItem: (info: TinyLegendListRenderItemInfo<T>) => ReactNode;
  onItemLayout: (itemKey: string, size: number) => void;
}

/**
 * Legend List: `Containers` and `ContainersInner`, which also render spare
 * containers ahead of need (`numContainersPooled`).
 *
 * The content of the scroll view: one view as tall as all items, with the
 * containers positioned absolutely inside it. Re-renders only when the
 * content size or the number of containers changes.
 */
export function Containers<T>(props: ContainersProps<T>) {
  const totalSize = useSignal(props.store, 'totalSize') ?? 0;
  const numContainers = useSignal(props.store, 'numContainers') ?? 0;

  // Keys are container ids, so React never reorders or remounts containers.
  const containers: ReactNode[] = [];
  for (let id = 0; id < numContainers; id++) {
    containers.push(<MemoContainer key={id} id={id} {...props} />);
  }

  return <View style={{ height: totalSize }}>{containers}</View>;
}

/**
 * Legend List: `ContainerSlot`, `Container` and `PositionView` in one.
 *
 * A slot that shows one item at a time. It subscribes to its own item and
 * position, so moving it re-renders this container alone.
 */
function Container<T>({
  id,
  store,
  renderItem,
  onItemLayout,
}: ContainersProps<T> & { id: number }) {
  const itemKey = useSignal(store, `containerItemKey${id}`);
  const itemIndex = useSignal(store, `containerItemIndex${id}`);
  const item = useSignal(store, `containerItemData${id}`) as T;
  const position = useSignal(store, `containerPosition${id}`);

  // A position change must not re-run `renderItem`.
  const content = useMemo(
    () =>
      itemIndex === undefined ? null : renderItem({ item, index: itemIndex }),
    [item, itemIndex, renderItem]
  );

  if (itemKey === undefined) {
    return null;
  }

  return (
    <View
      // Keyed by item: a container that moves to another item remounts the
      // item's views, so no state leaks from the previous item.
      key={itemKey}
      testID={`container-${itemIndex}`}
      style={[styles.container, { top: position }]}
      onLayout={(event) =>
        onItemLayout(itemKey, event.nativeEvent.layout.height)
      }
    >
      {content}
    </View>
  );
}

// The cast keeps the generic signature, like Legend List's `typedMemo`.
const MemoContainer = memo(Container) as typeof Container;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
});
