import type {
  FoldState,
  Insets,
  Posture,
  Region,
  SizeClass,
  VerticalBarEdge,
  ViewRegions,
} from './types';

const ZERO_INSETS: Insets = Object.freeze({
  top: 0,
  left: 0,
  bottom: 0,
  right: 0,
});

export const DEFAULT_FOLD_STATE: FoldState = Object.freeze({
  posture: 'unknown',
  hingeAngle: null,
  sizeClass: Object.freeze({ horizontal: 'unknown', vertical: 'unknown' }),
  folds: Object.freeze([]),
  occlusions: Object.freeze([]),
  verticalBarEdge: null,
});

export const EMPTY_VIEW_REGIONS: ViewRegions = Object.freeze({
  folds: Object.freeze([]),
  occlusions: Object.freeze([]),
});

const POSTURES: ReadonlyArray<Posture> = [
  'flat',
  'halfOpened',
  'folded',
  'unknown',
];
const SIZE_CLASSES: ReadonlyArray<SizeClass> = [
  'compact',
  'regular',
  'unknown',
];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function finiteOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function oneOf<T extends string>(
  value: unknown,
  allowed: ReadonlyArray<T>,
  fallback: T
): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function normalizeInsets(raw: unknown): Insets {
  if (!isObject(raw)) {
    return ZERO_INSETS;
  }
  return {
    top: finiteOr(raw.top, 0),
    left: finiteOr(raw.left, 0),
    bottom: finiteOr(raw.bottom, 0),
    right: finiteOr(raw.right, 0),
  };
}

function normalizeRegion(raw: unknown): Region | null {
  if (!isObject(raw)) {
    return null;
  }
  const width = finiteOr(raw.width, 0);
  const height = finiteOr(raw.height, 0);
  if (width < 0 || height < 0) {
    return null;
  }
  return {
    x: finiteOr(raw.x, 0),
    y: finiteOr(raw.y, 0),
    width,
    height,
    isActive: raw.isActive === true,
    margins: normalizeInsets(raw.margins),
  };
}

export function normalizeRegions(raw: unknown): ReadonlyArray<Region> {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .map(normalizeRegion)
    .filter((region): region is Region => region !== null);
}

function normalizeVerticalBarEdge(raw: unknown): VerticalBarEdge {
  return raw === 'leading' || raw === 'trailing' ? raw : null;
}

function normalizeHingeAngle(raw: unknown): number | null {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) {
    return null;
  }
  return Math.min(360, Math.max(0, raw));
}

/** Converts an untrusted native payload into a well-formed `FoldState`. */
export function normalizeFoldState(raw: unknown): FoldState {
  if (!isObject(raw)) {
    return DEFAULT_FOLD_STATE;
  }
  return {
    posture: oneOf(raw.posture, POSTURES, 'unknown'),
    hingeAngle: normalizeHingeAngle(raw.hingeAngle),
    sizeClass: {
      horizontal: oneOf(raw.horizontalSizeClass, SIZE_CLASSES, 'unknown'),
      vertical: oneOf(raw.verticalSizeClass, SIZE_CLASSES, 'unknown'),
    },
    folds: normalizeRegions(raw.folds),
    occlusions: normalizeRegions(raw.occlusions),
    verticalBarEdge: normalizeVerticalBarEdge(raw.verticalBarEdge),
  };
}

export function normalizeViewRegions(raw: unknown): ViewRegions {
  if (!isObject(raw)) {
    return EMPTY_VIEW_REGIONS;
  }
  return {
    folds: normalizeRegions(raw.folds),
    occlusions: normalizeRegions(raw.occlusions),
  };
}

/** Structural equality for normalized values (key order is fixed by normalize*). */
export function isSameState<T extends FoldState | ViewRegions>(
  a: T,
  b: T
): boolean {
  return a === b || JSON.stringify(a) === JSON.stringify(b);
}
