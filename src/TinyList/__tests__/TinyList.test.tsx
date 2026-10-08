import { describe, expect, it } from '@jest/globals';
import {
  fireEvent,
  render,
  screen,
  userEvent,
} from '@testing-library/react-native';
import { Text } from 'react-native';
import { TinyList } from '../TinyList';

type Item = { title: string };

const DATA: Item[] = Array.from({ length: 100 }, (_, i) => ({
  title: `Item ${i}`,
}));

async function renderList(data: ReadonlyArray<Item> = DATA) {
  const result = await render(
    <TinyList
      data={data}
      renderItem={({ item, index }) => (
        <Text>
          {item.title} #{index}
        </Text>
      )}
    />
  );
  const scrollView = result.root!;
  // Viewport is 500 px; unmeasured items count as 50 px.
  await fireEvent.layout(scrollView, { height: 500 });
  return scrollView;
}

describe('TinyList', () => {
  it('passes item and index to renderItem', async () => {
    await renderList();
    expect(screen.getByText('Item 0 #0')).toBeOnTheScreen();
    expect(screen.getByText('Item 7 #7')).toBeOnTheScreen();
  });

  it('renders only items near the viewport', async () => {
    await renderList();
    // Window is [-500, 1000) px: items 0..19.
    expect(screen.getByText('Item 19 #19')).toBeOnTheScreen();
    expect(screen.queryByText('Item 20 #20')).not.toBeOnTheScreen();
  });

  it('renders new items and drops old ones when scrolled', async () => {
    const user = userEvent.setup();
    const scrollView = await renderList();

    await user.scrollTo(scrollView, { y: 2000 });

    // Window is [1500, 3000) px: items 30..59.
    expect(screen.queryByText('Item 29 #29')).not.toBeOnTheScreen();
    expect(screen.getByText('Item 30 #30')).toBeOnTheScreen();
    expect(screen.getByText('Item 59 #59')).toBeOnTheScreen();
    expect(screen.queryByText('Item 60 #60')).not.toBeOnTheScreen();
  });

  it('uses measured item sizes', async () => {
    await renderList();

    await fireEvent.layout(screen.getByTestId('cell-0'), { height: 1000 });

    // Item 0 alone fills the whole window.
    expect(screen.getByText('Item 0 #0')).toBeOnTheScreen();
    expect(screen.queryByText('Item 1 #1')).not.toBeOnTheScreen();
  });

  it('renders nothing for empty data', async () => {
    await renderList([]);
    expect(screen.queryByText(/Item/)).not.toBeOnTheScreen();
  });
});
