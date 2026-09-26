import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import {
  FoldAwareView,
  splitByFolds,
  useFoldState,
  type ViewRegions,
} from 'react-native-fold-kit';
import { PaneOverlay, RegionList, RegionOverlay } from './RegionViews';

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
}

export function StateScreen() {
  const foldState = useFoldState();
  const [includeInactive, setIncludeInactive] = useState(false);
  const [viewRegions, setViewRegions] = useState<ViewRegions | null>(null);
  const [eventCount, setEventCount] = useState(0);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const panes = viewRegions
    ? splitByFolds(size, viewRegions.folds, { includeInactive })
    : [];

  return (
    <View style={styles.container}>
      <FoldAwareView
        style={StyleSheet.absoluteFill}
        includeInactive={includeInactive}
        onLayout={(event) => setSize(event.nativeEvent.layout)}
        onRegionsChange={(regions) => {
          setViewRegions(regions);
          setEventCount((count) => count + 1);
        }}
      >
        {viewRegions && (
          <>
            <PaneOverlay panes={panes} />
            <RegionOverlay regions={viewRegions.folds} kind="fold" />
            <RegionOverlay regions={viewRegions.occlusions} kind="occlusion" />
          </>
        )}
      </FoldAwareView>

      <ScrollView
        contentContainerStyle={styles.content}
        pointerEvents="box-none"
      >
        <Text style={styles.title}>useFoldState()</Text>
        <Field label="posture" value={foldState.posture} />
        <Field
          label="hinge angle"
          value={
            foldState.hingeAngle === null
              ? 'unavailable'
              : `${foldState.hingeAngle.toFixed(1)}°`
          }
        />
        <Field
          label="size class"
          value={`${foldState.sizeClass.horizontal} (h) · ${foldState.sizeClass.vertical} (v)`}
        />
        <Field
          label="vertical bar"
          value={foldState.verticalBarEdge ?? 'none'}
        />
        <RegionList title="Folds" regions={foldState.folds} kind="fold" />
        <RegionList
          title="Occlusions"
          regions={foldState.occlusions}
          kind="occlusion"
        />

        <Text style={styles.title}>FoldAwareView</Text>
        <Field label="events" value={String(eventCount)} />
        <Field
          label="panes"
          value={
            panes
              .map(
                (pane) => `${Math.round(pane.width)}×${Math.round(pane.height)}`
              )
              .join(' · ') || '—'
          }
        />
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>inactive</Text>
          <Switch value={includeInactive} onValueChange={setIncludeInactive} />
        </View>
        {viewRegions ? (
          <>
            <RegionList title="Folds" regions={viewRegions.folds} kind="fold" />
            <RegionList
              title="Occlusions"
              regions={viewRegions.occlusions}
              kind="occlusion"
            />
          </>
        ) : (
          <Text style={styles.waiting}>waiting for the first event…</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingTop: 16,
    paddingBottom: 40,
    paddingHorizontal: 20,
    gap: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    marginTop: 12,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fieldLabel: {
    width: 96,
    fontSize: 13,
    color: '#8e8e93',
  },
  fieldValue: {
    flex: 1,
    fontFamily: 'Menlo',
    fontSize: 13,
  },
  waiting: {
    fontSize: 13,
    color: '#8e8e93',
  },
});
