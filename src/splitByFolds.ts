import { getFoldOrientation } from './normalize';
import type { Pane, Region } from './types';

export type SplitByFoldsOptions = Readonly<{
  /**
   * Also split by inactive folds. Defaults to `false`: an inactive fold (e.g.
   * a flat device) doesn't divide content.
   */
  includeInactive?: boolean;
  /**
   * Keep panes clear of the fold's `margins` too (the whole region frame).
   * Defaults to `true`. With `false` panes may extend into the margins, which
   * iOS reserves for interactive content near the hinge.
   */
  respectMargins?: boolean;
}>;

type Interval = [start: number, end: number];

/**
 * Splits an area into panes separated by folds.
 *
 * `size` and `folds` must share a coordinate space — typically the regions a
 * `FoldAwareView` reports and that view's size, or `useFoldState()` folds and
 * the window size. Handles zero-width hinges, horizontal and vertical folds,
 * margins, folds only partly inside the area and overlapping folds.
 *
 * Vertical folds split the area into columns (left to right), horizontal
 * folds then split each column into rows (top to bottom). Without folds the
 * result is a single pane covering the whole area; an empty area has no panes.
 */
export function splitByFolds(
  size: Readonly<{ width: number; height: number }>,
  folds: ReadonlyArray<Region>,
  options: SplitByFoldsOptions = {}
): Pane[] {
  const { includeInactive = false, respectMargins = true } = options;
  const width = Math.max(0, size.width);
  const height = Math.max(0, size.height);
  const used = folds.filter((fold) => includeInactive || fold.isActive);

  const vertical: Interval[] = [];
  const horizontal: Interval[] = [];
  for (const fold of used) {
    const gap = foldGap(fold, respectMargins);
    if (getFoldOrientation(fold) === 'vertical') {
      // A vertical fold only splits the area if it crosses it vertically.
      if (spans(gap.y, height)) vertical.push(gap.x);
    } else if (spans(gap.x, width)) {
      horizontal.push(gap.y);
    }
  }

  const panes: Pane[] = [];
  for (const [x0, x1] of segments(width, vertical)) {
    for (const [y0, y1] of segments(height, horizontal)) {
      panes.push({ x: x0, y: y0, width: x1 - x0, height: y1 - y0 });
    }
  }
  return panes;
}

/** The area a fold takes along each axis, with or without its margins. */
function foldGap(fold: Region, respectMargins: boolean) {
  const { x, y, width, height, margins } = fold;
  const m = respectMargins ? { top: 0, left: 0, bottom: 0, right: 0 } : margins;
  return {
    x: ordered(x + m.left, x + width - m.right),
    y: ordered(y + m.top, y + height - m.bottom),
  };
}

function ordered(a: number, b: number): Interval {
  return a <= b ? [a, b] : [b, a];
}

/** Whether an interval overlaps [0, length] (touching counts for zero-size hinges). */
function spans([start, end]: Interval, length: number) {
  return (
    start <= length &&
    end >= 0 &&
    !(start === end && (start <= 0 || start >= length))
  );
}

/**
 * [0, length] minus the gaps: gaps are clamped, sorted and merged, and
 * zero-length segments (a fold at the very edge) are dropped.
 */
function segments(length: number, gaps: Interval[]): Interval[] {
  const clamped = gaps
    .map(([start, end]): Interval => [clamp(start, length), clamp(end, length)])
    .sort((a, b) => a[0] - b[0]);

  const result: Interval[] = [];
  let cursor = 0;
  for (const [start, end] of clamped) {
    if (start > cursor) result.push([cursor, start]);
    cursor = Math.max(cursor, end);
  }
  if (cursor < length) result.push([cursor, length]);
  return result;
}

function clamp(value: number, length: number) {
  return Math.min(length, Math.max(0, value));
}
