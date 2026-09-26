import { useState } from 'react';
import {
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ScrollScreen } from './ScrollScreen';
import { StateScreen } from './StateScreen';

const SCREENS = {
  state: { title: 'State', Component: StateScreen },
  scroll: { title: 'Scroll', Component: ScrollScreen },
} as const;

type ScreenKey = keyof typeof SCREENS;

export default function App() {
  const [screen, setScreen] = useState<ScreenKey>('state');
  const { Component } = SCREENS[screen];

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        {(Object.keys(SCREENS) as ScreenKey[]).map((key) => (
          <Pressable
            key={key}
            accessibilityRole="tab"
            accessibilityState={{ selected: key === screen }}
            onPress={() => setScreen(key)}
            style={[styles.tab, key === screen && styles.tabSelected]}
          >
            <Text
              style={[styles.tabText, key === screen && styles.tabTextSelected]}
            >
              {SCREENS[key].title}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.screen}>
        <Component />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // No safe-area dependency in the example: a rough status bar offset.
    paddingTop:
      Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 60,
  },
  tabs: {
    flexDirection: 'row',
    alignSelf: 'center',
    padding: 3,
    borderRadius: 10,
    backgroundColor: '#e5e5ea',
  },
  tab: {
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tabSelected: {
    backgroundColor: 'white',
  },
  tabText: {
    fontSize: 14,
    color: '#6e6e73',
  },
  tabTextSelected: {
    color: 'black',
    fontWeight: '600',
  },
  screen: {
    flex: 1,
  },
});
