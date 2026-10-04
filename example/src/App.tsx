import { useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import {
  MiniFlatList,
  TinyList,
  type MiniFlatListRenderItemInfo,
} from 'react-native-tiny-list';

type Item = { id: number; title: string };

const DATA: Item[] = Array.from({ length: 10_000 }, (_, i) => ({
  id: i,
  title: `Item ${i}`,
}));

// Defined outside the component so it stays stable and MiniFlatList can skip
// re-rendering unchanged items.
function renderItem({ item, index }: MiniFlatListRenderItemInfo<Item>) {
  return (
    // Vary heights to exercise measurement.
    <View style={[styles.item, { height: 40 + (index % 5) * 15 }]}>
      <Text>{item.title}</Text>
    </View>
  );
}

export default function App() {
  const [list, setList] = useState<'tiny' | 'mini'>('mini');

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <Button title="TinyList" onPress={() => setList('tiny')} />
        <Button title="MiniFlatList" onPress={() => setList('mini')} />
      </View>
      {list === 'tiny' ? (
        <TinyList data={DATA} renderItem={renderItem} />
      ) : (
        <MiniFlatList data={DATA} renderItem={renderItem} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 48,
    paddingBottom: 8,
  },
  item: {
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
});
