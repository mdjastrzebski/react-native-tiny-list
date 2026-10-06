import { StyleSheet, Text, View } from 'react-native';
import { TinyList } from 'react-native-tiny-list';

type Item = { id: number; title: string };

const DATA: Item[] = Array.from({ length: 10_000 }, (_, i) => ({
  id: i,
  title: `Item ${i}`,
}));

export default function App() {
  return (
    <View style={styles.container}>
      <TinyList
        data={DATA}
        renderItem={({ item, index }) => (
          // Vary heights to exercise measurement.
          <View style={[styles.item, { height: 40 + (index % 5) * 15 }]}>
            <Text>{item.title}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  item: {
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
});
