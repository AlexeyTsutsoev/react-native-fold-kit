import { StyleSheet, Text, View } from 'react-native';
import type { Insets, Region } from 'react-native-fold-kit';

export type RegionKind = 'fold' | 'occlusion';

const KIND_STYLE: Record<
  RegionKind,
  { color: string; prefix: string; name: string }
> = {
  fold: { color: '#ff3b30', prefix: 'F', name: 'Fold' },
  occlusion: { color: '#007aff', prefix: 'O', name: 'Occlusion' },
};

/** 455.4999 → "455.5", 40 → "40". */
function pt(value: number) {
  return `${Math.round(value * 10) / 10}`;
}

function hasMargins({ top, left, bottom, right }: Insets) {
  return top !== 0 || left !== 0 || bottom !== 0 || right !== 0;
}

/** Label/value rows describing a region; exported for reuse in logs. */
export function describeRegion(region: Region, kind: RegionKind) {
  const { x, y, width, height, margins } = region;
  const rows: Array<[string, string]> = [
    ['x', `${pt(x)} → ${pt(x + width)}`],
    ['y', `${pt(y)} → ${pt(y + height)}`],
    ['size', `${pt(width)} × ${pt(height)} pt`],
  ];
  if (kind === 'fold') {
    // A fold is a band: its long side is the direction of the hinge line.
    rows.push(['hinge', width >= height ? 'horizontal line' : 'vertical line']);
  }
  if (hasMargins(margins)) {
    rows.push([
      'margins',
      `top ${pt(margins.top)} · left ${pt(margins.left)} · bottom ${pt(margins.bottom)} · right ${pt(margins.right)}`,
    ]);
  }
  return rows;
}

function RegionCard({
  region,
  kind,
  index,
}: {
  region: Region;
  kind: RegionKind;
  index: number;
}) {
  const { color, prefix, name } = KIND_STYLE[kind];
  return (
    <View style={[styles.card, { borderLeftColor: color }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { color }]}>
          {prefix}
          {index + 1} · {name}
        </Text>
        <Text
          style={[
            styles.badge,
            region.isActive ? styles.badgeActive : styles.badgeInactive,
          ]}
        >
          {region.isActive ? 'active' : 'inactive'}
        </Text>
      </View>
      {describeRegion(region, kind).map(([label, value]) => (
        <View key={label} style={styles.row}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.value}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

export function RegionList({
  title,
  regions,
  kind,
}: {
  title: string;
  regions: ReadonlyArray<Region>;
  kind: RegionKind;
}) {
  return (
    <View style={styles.list}>
      <Text style={styles.listTitle}>
        {title} <Text style={styles.count}>({regions.length})</Text>
      </Text>
      {regions.length === 0 ? (
        <Text style={styles.empty}>none</Text>
      ) : (
        regions.map((region, index) => (
          <RegionCard key={index} region={region} kind={kind} index={index} />
        ))
      )}
    </View>
  );
}

/** Draws regions over the screen, labelled like the cards (F1, O1, …). */
export function RegionOverlay({
  regions,
  kind,
}: {
  regions: ReadonlyArray<Region>;
  kind: RegionKind;
}) {
  const { color, prefix } = KIND_STYLE[kind];
  return regions.map((region, index) => (
    <View
      key={index}
      pointerEvents="none"
      style={[
        styles.overlay,
        !region.isActive && styles.overlayInactive,
        {
          left: region.x,
          top: region.y,
          width: region.width,
          height: region.height,
          borderColor: color,
          backgroundColor: `${color}${region.isActive ? '33' : '14'}`,
        },
      ]}
    >
      <Text style={[styles.overlayLabel, { backgroundColor: color }]}>
        {prefix}
        {index + 1}
      </Text>
    </View>
  ));
}

const styles = StyleSheet.create({
  list: {
    gap: 6,
  },
  listTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  count: {
    fontWeight: '400',
    color: '#8e8e93',
  },
  empty: {
    fontSize: 13,
    color: '#8e8e93',
  },
  card: {
    borderLeftWidth: 3,
    paddingLeft: 8,
    paddingVertical: 2,
    gap: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  badge: {
    fontSize: 11,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  badgeActive: {
    color: '#1b7f37',
    backgroundColor: '#d8f5df',
  },
  badgeInactive: {
    color: '#6e6e73',
    backgroundColor: '#e5e5ea',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  label: {
    width: 56,
    fontSize: 12,
    color: '#8e8e93',
  },
  value: {
    flex: 1,
    fontFamily: 'Menlo',
    fontSize: 12,
  },
  overlay: {
    position: 'absolute',
    borderWidth: 1,
  },
  overlayInactive: {
    borderStyle: 'dashed',
  },
  overlayLabel: {
    position: 'absolute',
    top: 0,
    left: 0,
    paddingHorizontal: 3,
    fontSize: 10,
    fontWeight: '700',
    color: 'white',
  },
});
