import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  FoldAwareView,
  splitByFolds,
  type Fold,
  type Pane,
} from 'react-native-fold-kit';

type Note = { id: number; title: string; body: string };

const NOTES: Note[] = [
  {
    id: 1,
    title: 'Groceries',
    body: 'Oat milk, blueberries, sourdough, coffee beans, basil.',
  },
  {
    id: 2,
    title: 'Trip to Lisbon',
    body: 'Book the tram tour, try pastel de nata at Manteigaria, visit LX Factory on Sunday.',
  },
  {
    id: 3,
    title: 'Fold kit ideas',
    body: 'splitByFolds for list/detail, laptop mode for media controls, keep content away from the hinge.',
  },
  {
    id: 4,
    title: 'Book club',
    body: 'Next meeting on Thursday. Finish chapters 7–10 and bring questions.',
  },
  {
    id: 5,
    title: 'Workout',
    body: 'Mon — legs, Wed — back and biceps, Fri — chest and shoulders.',
  },
];

type FoldSource = 'device' | 'book' | 'laptop' | 'none';

const FOLD_SOURCES: Array<{ key: FoldSource; title: string }> = [
  { key: 'device', title: 'Device' },
  { key: 'book', title: 'Book' },
  { key: 'laptop', title: 'Laptop' },
  { key: 'none', title: 'None' },
];

/** A fake 24 dp hinge in the middle, for devices/postures without an active fold. */
function simulatedFold(
  source: 'book' | 'laptop',
  size: { width: number; height: number }
): Fold {
  const thickness = 24;
  const margins = { top: 0, left: 0, bottom: 0, right: 0 };
  return source === 'book'
    ? {
        x: size.width / 2 - thickness / 2,
        y: 0,
        width: thickness,
        height: size.height,
        isActive: true,
        margins,
        orientation: 'vertical',
      }
    : {
        x: 0,
        y: size.height / 2 - thickness / 2,
        width: size.width,
        height: thickness,
        isActive: true,
        margins,
        orientation: 'horizontal',
      };
}

/** Absolutely positions its children in one pane. */
function PaneView({
  pane,
  children,
}: {
  pane: Pane;
  children: React.ReactNode;
}) {
  return (
    <View
      style={[
        styles.pane,
        { left: pane.x, top: pane.y, width: pane.width, height: pane.height },
      ]}
    >
      {children}
    </View>
  );
}

function NoteList({
  selectedId,
  onSelect,
}: {
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.list}>
      <Text style={styles.heading}>Notes</Text>
      {NOTES.map((note) => (
        <Pressable
          key={note.id}
          onPress={() => onSelect(note.id)}
          style={[styles.row, note.id === selectedId && styles.rowSelected]}
        >
          <Text style={styles.rowTitle}>{note.title}</Text>
          <Text style={styles.rowPreview} numberOfLines={1}>
            {note.body}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function NoteDetail({
  note,
  onBack,
}: {
  note: Note | null;
  onBack?: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.detail}>
      {onBack && (
        <Pressable onPress={onBack} style={styles.back}>
          <Text style={styles.backText}>‹ Notes</Text>
        </Pressable>
      )}
      {note ? (
        <>
          <Text style={styles.heading}>{note.title}</Text>
          <Text style={styles.body}>{note.body}</Text>
        </>
      ) : (
        <Text style={styles.placeholder}>Select a note</Text>
      )}
    </ScrollView>
  );
}

/**
 * List/detail layout driven by splitByFolds:
 * - side by side panes (book): list | detail
 * - stacked panes (laptop): detail on top, list below, like a screen over a keyboard
 * - one pane: list, and the detail opens over it with a back button
 */
export function PanesScreen() {
  const [source, setSource] = useState<FoldSource>('device');
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [deviceFolds, setDeviceFolds] = useState<Fold[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(1);
  const [detailOpen, setDetailOpen] = useState(false);

  const folds =
    source === 'device'
      ? deviceFolds
      : source === 'none'
        ? []
        : [simulatedFold(source, size)];
  const panes = splitByFolds(size, folds);
  const selected = NOTES.find((note) => note.id === selectedId) ?? null;

  const [first, second] = panes;
  const sideBySide = first && second && first.x !== second.x;

  let content: React.ReactNode = null;
  if (first && second) {
    const [listPane, detailPane] = sideBySide
      ? [first, second]
      : [second, first];
    content = (
      <>
        <PaneView pane={listPane}>
          <NoteList selectedId={selectedId} onSelect={setSelectedId} />
        </PaneView>
        <PaneView pane={detailPane}>
          <NoteDetail note={selected} />
        </PaneView>
      </>
    );
  } else if (first) {
    content = (
      <PaneView pane={first}>
        {detailOpen ? (
          <NoteDetail note={selected} onBack={() => setDetailOpen(false)} />
        ) : (
          <NoteList
            selectedId={null}
            onSelect={(id) => {
              setSelectedId(id);
              setDetailOpen(true);
            }}
          />
        )}
      </PaneView>
    );
  }

  const mode = !first
    ? '—'
    : !second
      ? 'single pane'
      : sideBySide
        ? 'book: list | detail'
        : 'laptop: detail over list';

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <View style={styles.segments}>
          {FOLD_SOURCES.map(({ key, title }) => (
            <Pressable
              key={key}
              onPress={() => setSource(key)}
              style={[styles.segment, key === source && styles.segmentSelected]}
            >
              <Text
                style={[
                  styles.segmentText,
                  key === source && styles.segmentTextSelected,
                ]}
              >
                {title}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.mode}>{mode}</Text>
      </View>

      <FoldAwareView
        style={styles.area}
        onLayout={(event) => setSize(event.nativeEvent.layout)}
        onRegionsChange={(regions) => setDeviceFolds(regions.folds)}
      >
        {content}
      </FoldAwareView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  toolbar: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  segments: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 10,
    backgroundColor: '#e5e5ea',
  },
  segment: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  segmentSelected: {
    backgroundColor: 'white',
  },
  segmentText: {
    fontSize: 13,
    color: '#6e6e73',
  },
  segmentTextSelected: {
    color: 'black',
    fontWeight: '600',
  },
  mode: {
    fontSize: 12,
    color: '#8e8e93',
  },
  area: {
    flex: 1,
    backgroundColor: '#d1d1d6',
  },
  pane: {
    position: 'absolute',
    overflow: 'hidden',
    backgroundColor: '#f9f9f9',
  },
  list: {
    padding: 16,
    gap: 4,
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  row: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 2,
  },
  rowSelected: {
    backgroundColor: '#dbeafe',
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  rowPreview: {
    fontSize: 13,
    color: '#6e6e73',
  },
  detail: {
    padding: 20,
  },
  back: {
    marginBottom: 12,
  },
  backText: {
    fontSize: 16,
    color: '#007aff',
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
  },
  placeholder: {
    fontSize: 15,
    color: '#8e8e93',
  },
});
