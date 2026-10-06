# react-native-tiny-list

Tiny, readable virtualized lists for React Native

## Installation


```sh
npm install react-native-tiny-list
```


## Usage


```tsx
import { TinyList } from 'react-native-tiny-list';

<TinyList
  data={items}
  renderItem={({ item, index }) => <Row item={item} />}
/>
```

`TinyList` is the simplest possible virtualized list. It is a vertical
`ScrollView` that renders only the items within one viewport of the visible
area and replaces the rest with spacer views. Item heights are measured with
`onLayout` and cached by index; unmeasured items are assumed to be 50 px tall.
Expect blank areas and content jumps while scrolling fast.

```tsx
import { TinyFlatList } from 'react-native-tiny-list';

<TinyFlatList
  data={items}
  renderItem={renderRow} // keep it stable, not an inline function
  keyExtractor={(item) => item.id}
  initialNumToRender={10}
  windowSize={21}
  maxToRenderPerBatch={10}
  updateCellsBatchingPeriod={50}
/>
```

`TinyFlatList` adds the core ideas of React Native's `FlatList` on top of
`TinyList`:

- **Keys.** `keyExtractor` (default: `item.key`, then `item.id`, then the
  index) keys both the items and the cached sizes, so sizes survive inserts and
  reorders. Unmeasured items count as the average measured size.
- **`initialNumToRender`.** Items rendered before the viewport is measured.
  They stay rendered, so scrolling back to the top shows them instantly.
- **`windowSize`.** The area kept rendered, in viewports, centered on the
  visible one.
- **Batched rendering.** Scrolling does not re-render the list while the
  visible items are already rendered. The area off screen is filled
  `maxToRenderPerBatch` items at a time, every `updateCellsBatchingPeriod` ms.
  When the visible area is blank, the list renders right away.
- **Memoized items.** Each item re-renders only when its props or `extraData`
  change.


## Contributing

- [Development workflow](CONTRIBUTING.md#development-workflow)
- [Sending a pull request](CONTRIBUTING.md#sending-a-pull-request)
- [Code of conduct](CODE_OF_CONDUCT.md)

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
