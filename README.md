# react-native-simple-list

Simple flat list component

## Installation


```sh
npm install react-native-simple-list
```


## Usage


```tsx
import { NaiveList } from 'react-native-simple-list';

<NaiveList
  data={items}
  renderItem={({ item, index }) => <Row item={item} />}
/>
```

`NaiveList` is the simplest possible virtualized list. It is a vertical
`ScrollView` that renders only the items within one viewport of the visible
area and replaces the rest with spacer views. Item heights are measured with
`onLayout` and cached by index; unmeasured items are assumed to be 50 px tall.
Expect blank areas and content jumps while scrolling fast.


## Contributing

- [Development workflow](CONTRIBUTING.md#development-workflow)
- [Sending a pull request](CONTRIBUTING.md#sending-a-pull-request)
- [Code of conduct](CODE_OF_CONDUCT.md)

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
