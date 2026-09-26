/**
 * Physical state of the hinge.
 * - `flat` — fully open, a single flat surface
 * - `halfOpened` — partially open (tent / laptop-like)
 * - `folded` — closed, app runs on the outer display
 * - `unknown` — no hinge, unsupported platform or OS version
 */
export type Posture = 'flat' | 'halfOpened' | 'folded' | 'unknown';

export type SizeClass = 'compact' | 'regular' | 'unknown';

/** Edge where iOS places the vertical bar; `null` when there is none. */
export type VerticalBarEdge = 'leading' | 'trailing' | null;

export type Insets = Readonly<{
  top: number;
  left: number;
  bottom: number;
  right: number;
}>;

/**
 * A reserved region (a fold or an occlusion such as the camera) in dp.
 * `x`/`y`/`width`/`height` include `margins`.
 */
export type Region = Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
  isActive: boolean;
  margins: Insets;
}>;

/** Window-level state, coordinates are relative to the app window. */
export type FoldState = Readonly<{
  posture: Posture;
  /** Hinge angle in degrees (0 — closed, 180 — flat), `null` if unavailable. */
  hingeAngle: number | null;
  sizeClass: Readonly<{ horizontal: SizeClass; vertical: SizeClass }>;
  /** Active fold (division) regions. */
  folds: ReadonlyArray<Region>;
  /** Active occlusion regions, e.g. the camera. */
  occlusions: ReadonlyArray<Region>;
  verticalBarEdge: VerticalBarEdge;
}>;

/** View-level regions, coordinates are relative to the observing view. */
export type ViewRegions = Readonly<{
  folds: ReadonlyArray<Region>;
  occlusions: ReadonlyArray<Region>;
}>;
