import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { TinyFlatList, type TinyFlatListProps } from '../TinyFlatList';
import { defaultKeyExtractor } from '../TinyFlatList';

type Item = { id: string; title: string };

const DATA: Item[] = Array.from({ length: 100 }, (_, i) => ({
  id: `id-${i}`,
  title: `Item ${i}`,
}));

const renderItem = ({ item }: { item: Item }) => <Text>{item.title}</Text>;

function layoutEvent(height: number) {
  return { nativeEvent: { layout: { x: 0, y: 0, width: 300, height } } };
}

function scrollEvent(y: number) {
  return { nativeEvent: { contentOffset: { x: 0, y } } };
}

async function renderList(props: Partial<TinyFlatListProps<Item>> = {}) {
  const result = await render(
    <TinyFlatList
      data={DATA}
      renderItem={renderItem}
      windowSize={3}
      {...props}
    />
  );
  return result.root!;
}

/** Runs one pending batch timer and renders its result. */
async function runNextBatch() {
  await act(async () => {
    jest.advanceTimersByTime(50);
  });
}

function renderedItems(): string[] {
  return screen.queryAllByText(/^Item \d+$/).map((node) => {
    return String(node.props.children);
  });
}

describe('TinyFlatList', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders initialNumToRender items before the viewport is measured', async () => {
    await renderList({ initialNumToRender: 3 });
    expect(renderedItems()).toEqual(['Item 0', 'Item 1', 'Item 2']);
  });

  it('fills the window in batches of maxToRenderPerBatch', async () => {
    const scrollView = await renderList({
      initialNumToRender: 3,
      maxToRenderPerBatch: 5,
    });

    // Viewport is 500 px, items are estimated at 50 px: 10 visible items.
    await fireEvent(scrollView, 'layout', layoutEvent(500));

    // The 10 visible items render even though the budget is 5.
    await runNextBatch();
    expect(renderedItems()).toHaveLength(10);

    // Then up to 5 new items per batch, until one viewport below is filled.
    await runNextBatch();
    expect(renderedItems()).toHaveLength(15);
    await runNextBatch();
    expect(renderedItems()).toHaveLength(20);
    await runNextBatch();
    expect(renderedItems()).toHaveLength(20);
  });

  it('renders right away when scrolled past the rendered items', async () => {
    const scrollView = await renderList();
    await fireEvent(scrollView, 'layout', layoutEvent(500));
    await runNextBatch();

    // No timer advanced: the visible area was blank, so it renders now.
    await fireEvent(scrollView, 'scroll', scrollEvent(3000));
    expect(screen.getByText('Item 60')).toBeOnTheScreen();
    expect(screen.queryByText('Item 20')).not.toBeOnTheScreen();
  });

  it('keeps the first initialNumToRender items rendered', async () => {
    const scrollView = await renderList({ initialNumToRender: 3 });
    await fireEvent(scrollView, 'layout', layoutEvent(500));
    await runNextBatch();

    // Window is [2500, 4000) px: items 50..79, plus items 0..2.
    await fireEvent(scrollView, 'scroll', scrollEvent(3000));
    await runNextBatch();
    await runNextBatch();
    const items = renderedItems();
    expect(items.slice(0, 4)).toEqual([
      'Item 0',
      'Item 1',
      'Item 2',
      'Item 50',
    ]);
    expect(items.at(-1)).toBe('Item 79');
    expect(items).toHaveLength(33);
  });

  it('waits for the next batch when the visible items are rendered', async () => {
    const scrollView = await renderList({ maxToRenderPerBatch: 100 });
    await fireEvent(scrollView, 'layout', layoutEvent(500));
    await runNextBatch();
    expect(renderedItems()).toHaveLength(20);

    // Items 5..14 are visible and rendered, so nothing changes yet.
    await fireEvent(scrollView, 'scroll', scrollEvent(250));
    expect(renderedItems()).toHaveLength(20);

    // The next batch extends the window below: items 0..24.
    await runNextBatch();
    expect(renderedItems()).toHaveLength(25);
  });

  it('keeps measured sizes with their item when data is reordered', async () => {
    const scrollView = await renderList({
      initialNumToRender: 1,
      maxToRenderPerBatch: 100,
    });
    await fireEvent(scrollView, 'layout', layoutEvent(500));
    await runNextBatch();

    // Item 0 is 1050 px and alone fills the window. Items 1..19 are 50 px,
    // so unmeasured items are estimated at the average, 100 px.
    await fireEvent(screen.getByText('Item 0'), 'layout', layoutEvent(1050));
    for (let index = 1; index < 20; index += 1) {
      await fireEvent(
        screen.getByText(`Item ${index}`),
        'layout',
        layoutEvent(50)
      );
    }
    await runNextBatch();
    expect(renderedItems()).toEqual(['Item 0']);

    // Move item 0 to the end. Its size moves with it, so items 1..20 fit.
    const reordered = [...DATA.slice(1), DATA[0]!];
    await screen.rerender(
      <TinyFlatList
        data={reordered}
        renderItem={renderItem}
        windowSize={3}
        initialNumToRender={1}
        maxToRenderPerBatch={100}
      />
    );
    await runNextBatch();
    expect(renderedItems()).toHaveLength(20);
    expect(screen.getByText('Item 20')).toBeOnTheScreen();
    expect(screen.queryByText('Item 0')).not.toBeOnTheScreen();
  });

  it('re-renders items only when their props or extraData change', async () => {
    const calls: number[] = [];
    const countingRenderItem = ({
      item,
      index,
    }: {
      item: Item;
      index: number;
    }) => {
      calls.push(index);
      return <Text>{item.title}</Text>;
    };
    const props = {
      data: DATA,
      renderItem: countingRenderItem,
      initialNumToRender: 2,
    };

    await render(<TinyFlatList {...props} extraData={1} />);
    expect(calls).toEqual([0, 1]);

    calls.length = 0;
    await screen.rerender(<TinyFlatList {...props} extraData={1} />);
    expect(calls).toEqual([]);

    await screen.rerender(<TinyFlatList {...props} extraData={2} />);
    expect(calls).toEqual([0, 1]);
  });

  it('renders nothing for empty data', async () => {
    const scrollView = await renderList({ data: [] });
    await fireEvent(scrollView, 'layout', layoutEvent(500));
    await runNextBatch();
    expect(renderedItems()).toEqual([]);
  });
});

describe('defaultKeyExtractor', () => {
  it('uses key, then id, then the index', () => {
    expect(defaultKeyExtractor({ key: 'k', id: 'i' }, 3)).toBe('k');
    expect(defaultKeyExtractor({ id: 7 }, 3)).toBe('7');
    expect(defaultKeyExtractor({ title: 'x' }, 3)).toBe('3');
    expect(defaultKeyExtractor('text', 3)).toBe('3');
  });
});
