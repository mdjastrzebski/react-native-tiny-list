import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  TinyFlashList,
  TinyFlatList,
  TinyLegendList,
  TinyList,
  type TinyFlashListRenderItemInfo,
} from 'react-native-tiny-list';

type Item = { id: number; title: string };

const DATA: Item[] = Array.from({ length: 10_000 }, (_, i) => ({
  id: i,
  title: `Item ${i}`,
}));

const LISTS = [
  'TinyList',
  'TinyFlatList',
  'TinyFlashList',
  'TinyLegendList',
] as const;
type ListName = (typeof LISTS)[number];

// Defined outside the component so it stays stable and TinyFlatList can skip
// re-rendering unchanged items.
function renderItem({ item, index }: TinyFlashListRenderItemInfo<Item>) {
  // Vary heights to exercise measurement.
  return (
    <View style={[styles.item, { height: 40 + (index % 5) * 15 }]}>
      <Text>{item.title}</Text>
    </View>
  );
}

export default function App() {
  const [list, setList] = useState<ListName>('TinyFlashList');

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        {LISTS.map((name) => (
          <Pressable
            key={name}
            onPress={() => setList(name)}
            style={[styles.tab, list === name && styles.activeTab]}
          >
            <Text>{name}</Text>
          </Pressable>
        ))}
      </View>
      {list === 'TinyList' ? (
        <TinyList data={DATA} renderItem={renderItem} />
      ) : list === 'TinyFlatList' ? (
        <TinyFlatList data={DATA} renderItem={renderItem} />
      ) : list === 'TinyFlashList' ? (
        <TinyFlashList data={DATA} renderItem={renderItem} />
      ) : (
        <TinyLegendList data={DATA} renderItem={renderItem} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabs: {
    flexDirection: 'row',
    paddingTop: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  activeTab: {
    backgroundColor: '#e8e8e8',
  },
  item: {
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
});
