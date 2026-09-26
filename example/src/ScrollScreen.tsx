import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { FoldAwareView, type ViewRegions } from 'react-native-fold-kit';
import { RegionOverlay } from './RegionViews';

const CARD_COLORS = ['#fff4e5', '#e8f4ff', '#eefbea', '#f7ecff', '#fff0f0'];

function pt(value: number) {
  return `${Math.round(value)}`;
}

/**
 * A FoldAwareView card that draws the regions it receives and summarizes them.
 * While its scroll container moves, the fold/occlusion must stay pinned to the
 * same place on screen, i.e. move across the card.
 */
function RegionCard({ index, style }: { index: number; style: object }) {
  const [regions, setRegions] = useState<ViewRegions | null>(null);
  const [events, setEvents] = useState(0);

  const fold = regions?.folds[0];
  const occlusion = regions?.occlusions[0];

  return (
    <FoldAwareView
      style={[
        styles.card,
        style,
        { backgroundColor: CARD_COLORS[index % CARD_COLORS.length] },
      ]}
      onRegionsChange={(next) => {
        setRegions(next);
        setEvents((count) => count + 1);
      }}
    >
      {regions && (
        <>
          <RegionOverlay regions={regions.folds} kind="fold" />
          <RegionOverlay regions={regions.occlusions} kind="occlusion" />
        </>
      )}
      <Text style={styles.cardTitle}>Card {index + 1}</Text>
      <Text style={styles.cardLine}>events: {events}</Text>
      <Text style={styles.cardLine}>
        fold: {fold ? `x ${pt(fold.x)}, y ${pt(fold.y)}` : '—'}
      </Text>
      <Text style={styles.cardLine}>
        occlusion:{' '}
        {occlusion ? `x ${pt(occlusion.x)}, y ${pt(occlusion.y)}` : '—'}
      </Text>
    </FoldAwareView>
  );
}

export function ScrollScreen() {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.hint}>
        Half-open the device: the fold line must stay put on screen while cards
        scroll under it, and appear only in the cards it crosses.
      </Text>

      <Text style={styles.section}>Horizontal</Text>
      <ScrollView
        horizontal
        contentContainerStyle={styles.row}
        showsHorizontalScrollIndicator={false}
      >
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <RegionCard key={index} index={index} style={styles.wideCard} />
        ))}
      </ScrollView>

      <Text style={styles.section}>Vertical</Text>
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <RegionCard key={index} index={index} style={styles.tallCard} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 12,
  },
  hint: {
    fontSize: 13,
    color: '#6e6e73',
  },
  section: {
    fontSize: 17,
    fontWeight: '600',
    marginTop: 8,
  },
  row: {
    gap: 12,
  },
  card: {
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  wideCard: {
    width: 280,
    height: 180,
  },
  tallCard: {
    height: 220,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  cardLine: {
    fontFamily: 'Menlo',
    fontSize: 12,
  },
});
