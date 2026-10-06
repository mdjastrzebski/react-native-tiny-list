import { describe, expect, it, jest } from '@jest/globals';
import { render, screen, userEvent } from '@testing-library/react-native';
import { useState } from 'react';
import { Text } from 'react-native';
import { MiniFlashList } from '../MiniFlashList';
import type { HostView } from '../measure-layout';

// The test renderer has no layout engine, so fake synchronous measurement:
// the viewport is 500 px tall and each cell is as tall as its `Row`'s item says.
jest.mock('../measure-layout', () => ({
  measureViewportSize: () => 500,
  measureItemSize: (cell: HostView) => {
    const { children } = (cell as unknown as { props: any }).props;
    return children.props.item.height;
  },
}));

type Item = { title: string; height: number };

const createData = (count: number, height = 50): Item[] =>
  Array.from({ length: count }, (_, index) => ({
    title: `Item ${index}`,
    height,
  }));

let mountCount = 0;

function Row({ item }: { item: Item }) {
  // Runs once per mounted instance, not when a recycled instance gets a new item.
  useState(() => {
    mountCount += 1;
  });
  return <Text style={{ height: item.height }}>{item.title}</Text>;
}

const renderItem = ({ item }: { item: Item }) => <Row item={item} />;

/** Shows which item its cell was mounted for, to see where cell state goes. */
function StatefulRow({ item }: { item: Item }) {
  const [firstTitle] = useState(item.title);
  return (
    <Text style={{ height: item.height }}>
      {item.title}, mounted for {firstTitle}
    </Text>
  );
}

const renderStatefulItem = ({ item }: { item: Item }) => (
  <StatefulRow item={item} />
);

describe('MiniFlashList', () => {
  it('renders the items near the viewport', async () => {
    await render(
      <MiniFlashList data={createData(100)} renderItem={renderItem} />
    );

    // Window is [-250, 750) px: items 0..14.
    expect(screen.getByText('Item 0')).toBeOnTheScreen();
    expect(screen.getByText('Item 14')).toBeOnTheScreen();
    expect(screen.queryByText('Item 15')).not.toBeOnTheScreen();
  });

  it('positions cells absolutely using measured sizes', async () => {
    const data = createData(100);
    data[0] = { title: 'Item 0', height: 300 };
    await render(<MiniFlashList data={data} renderItem={renderItem} />);

    expect(screen.getByText('Item 1').parent).toHaveStyle({
      position: 'absolute',
      top: 300,
    });
    expect(screen.getByText('Item 2').parent).toHaveStyle({ top: 350 });
  });

  it('renders new items when scrolled', async () => {
    const user = userEvent.setup();
    await render(
      <MiniFlashList data={createData(100)} renderItem={renderItem} />
    );

    await user.scrollTo(getScrollView(), {
      y: 2000,
    });

    // Window is [1750, 2750) px: items 35..54.
    expect(screen.getByText('Item 35')).toBeOnTheScreen();
    expect(screen.getByText('Item 54')).toBeOnTheScreen();
    expect(screen.queryByText('Item 55')).not.toBeOnTheScreen();
  });

  it('reuses cells instead of mounting one per item', async () => {
    const user = userEvent.setup();
    mountCount = 0;
    await render(
      <MiniFlashList data={createData(100)} renderItem={renderItem} />
    );
    expect(mountCount).toBe(15);

    await user.scrollTo(getScrollView(), {
      y: 2000,
    });

    // 35 different items have been shown, but only 20 cells (the window size) were ever mounted.
    expect(mountCount).toBe(20);
  });

  it('keeps cell state with its item when keyExtractor is set', async () => {
    const data = createData(100);
    const props = {
      renderItem: renderStatefulItem,
      keyExtractor: (item: Item) => item.title,
    };
    await render(<MiniFlashList data={data} {...props} />);

    // Insert an item at the top: "Item 0" moves to index 1 but keeps its cell.
    const newItem = { title: 'New', height: 50 };
    await screen.rerender(
      <MiniFlashList data={[newItem, ...data]} {...props} />
    );
    expect(screen.getByText('Item 0, mounted for Item 0')).toBeOnTheScreen();
  });

  it('keeps cell state with the index without keyExtractor', async () => {
    const data = createData(100);
    await render(<MiniFlashList data={data} renderItem={renderStatefulItem} />);

    // Without stable ids, the cell at index 1 now shows "Item 0".
    const newItem = { title: 'New', height: 50 };
    await screen.rerender(
      <MiniFlashList
        data={[newItem, ...data]}
        renderItem={renderStatefulItem}
      />
    );
    expect(screen.getByText('Item 0, mounted for Item 1')).toBeOnTheScreen();
  });

  it('renders nothing for empty data', async () => {
    await render(<MiniFlashList data={[]} renderItem={renderItem} />);
    expect(screen.queryByText(/Item/)).not.toBeOnTheScreen();
  });
});

/** The list's root is a container view; its only child is the ScrollView. */
function getScrollView() {
  return screen.root!.children[0] as ReturnType<typeof screen.getByText>;
}
