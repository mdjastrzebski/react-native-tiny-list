import { describe, expect, it, jest } from '@jest/globals';
import {
  fireEvent,
  render,
  screen,
  userEvent,
} from '@testing-library/react-native';
import { Text } from 'react-native';
import { TinyLegendList } from '../TinyLegendList';
import type { TinyLegendListRenderItemInfo } from '../Containers';

type Item = { title: string };

const DATA: Item[] = Array.from({ length: 100 }, (_, i) => ({
  title: `Item ${i}`,
}));

function layoutEvent(height: number) {
  return { nativeEvent: { layout: { x: 0, y: 0, width: 300, height } } };
}

const renderItem = ({ item, index }: TinyLegendListRenderItemInfo<Item>) => (
  <Text>
    {item.title} #{index}
  </Text>
);

async function renderList(
  data: ReadonlyArray<Item> = DATA,
  renderFn = renderItem
) {
  const result = await render(
    <TinyLegendList data={data} renderItem={renderFn} />
  );
  const scrollView = result.root!;
  // Viewport is 500 px; unmeasured items count as 100 px. The buffer is
  // 125 px above and 375 px below, so the buffered area is [-125, 875).
  await fireEvent(scrollView, 'layout', layoutEvent(500));
  return { ...result, scrollView };
}

function renderedItemCount() {
  return screen.queryAllByText(/^Item/).length;
}

describe('TinyLegendList', () => {
  it('renders only items near the viewport', async () => {
    await renderList();
    expect(screen.getByText('Item 0 #0')).toBeOnTheScreen();
    expect(screen.getByText('Item 8 #8')).toBeOnTheScreen();
    expect(screen.queryByText('Item 9 #9')).not.toBeOnTheScreen();
  });

  it('positions items absolutely at their offsets', async () => {
    await renderList();
    expect(screen.getByText('Item 3 #3').parent).toHaveStyle({
      position: 'absolute',
      top: 300,
    });
  });

  it('reuses containers instead of creating new ones', async () => {
    const user = userEvent.setup();
    const { scrollView } = await renderList();

    await user.scrollTo(scrollView, { y: 5000 });

    // Buffered area is [4875, 5875): items 48..58.
    expect(screen.getByText('Item 48 #48')).toBeOnTheScreen();
    expect(screen.getByText('Item 58 #58')).toBeOnTheScreen();
    expect(screen.queryByText('Item 0 #0')).not.toBeOnTheScreen();
    // A container per item in the area, plus a few left over off screen.
    expect(renderedItemCount()).toBeLessThan(15);
  });

  it('does not re-render items while scrolling inside the rendered area', async () => {
    const user = userEvent.setup();
    const renderSpy = jest.fn(renderItem);
    const { scrollView } = await renderList(DATA, renderSpy);
    renderSpy.mockClear();

    await user.scrollTo(scrollView, { y: 20 });

    expect(renderSpy).not.toHaveBeenCalled();
  });

  it('moves the items below a measured item', async () => {
    await renderList();

    await fireEvent(screen.getByText('Item 0 #0'), 'layout', layoutEvent(30));

    expect(screen.getByText('Item 1 #1').parent).toHaveStyle({ top: 30 });
  });

  it('removes items that are no longer in the data', async () => {
    const { rerender } = await renderList();

    await rerender(
      <TinyLegendList data={DATA.slice(0, 2)} renderItem={renderItem} />
    );

    expect(screen.getByText('Item 1 #1')).toBeOnTheScreen();
    expect(renderedItemCount()).toBe(2);
  });

  it('renders nothing for empty data', async () => {
    await renderList([]);
    expect(screen.queryByText(/Item/)).not.toBeOnTheScreen();
  });
});
