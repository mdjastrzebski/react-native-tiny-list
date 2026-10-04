import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  MiniFlashList,
  TinyFlatList,
  TinyList,
  type MiniFlashListRenderItemInfo,
} from 'react-native-tiny-list';

type Item = { id: number; title: string; isHeader: boolean };

// Every 20th item is a section header, so MiniFlashList has two item types.
const DATA: Item[] = Array.from({ length: 10_000 }, (_, i) => ({
  id: i,
  title: i % 20 === 0 ? `Section ${i / 20}` : `Item ${i}`,
  isHeader: i % 20 === 0,
}));

const LISTS = ['TinyList', 'TinyFlatList', 'MiniFlashList'] as const;
type ListName = (typeof LISTS)[number];

// Defined outside the component so it stays stable and TinyFlatList can skip
// re-rendering unchanged items.
function renderItem({ item, index }: MiniFlashListRenderItemInfo<Item>) {
  if (item.isHeader) {
    return (
      <View style={styles.header}>
        <Text style={styles.headerText}>{item.title}</Text>
      </View>
    );
  }

  // Vary heights to exercise measurement.
  return (
    <View style={[styles.item, { height: 40 + (index % 5) * 15 }]}>
      <Text>{item.title}</Text>
    </View>
  );
}

const getItemType = (item: Item) => (item.isHeader ? 'header' : 'row');

export default function App() {
  const [list, setList] = useState<ListName>('MiniFlashList');

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
      ) : (
        <MiniFlashList
          data={DATA}
          renderItem={renderItem}
          getItemType={getItemType}
        />
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
  header: {
    justifyContent: 'center',
    height: 32,
    paddingHorizontal: 16,
    backgroundColor: '#f2f2f2',
  },
  headerText: {
    fontWeight: 'bold',
  },
  item: {
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
});
