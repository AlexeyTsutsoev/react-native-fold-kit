import { getFoldOrientation } from './normalize';
import type { Fold, FoldState, Region } from './types';

const NO_MARGINS = Object.freeze({ top: 0, left: 0, bottom: 0, right: 0 });

function region(x: number, y: number, width: number, height: number): Region {
  return Object.freeze({
    x,
    y,
    width,
    height,
    isActive: true,
    margins: NO_MARGINS,
  });
}

/**
 * The iPhone Duo reports its fold as a zero-thickness line with 20 dp margins
 * on each side; the region frame (a 40 dp band) includes them.
 */
function fold(x: number, y: number, width: number, height: number): Fold {
  const base = region(x, y, width, height);
  const orientation = getFoldOrientation(base);
  const margins =
    orientation === 'vertical'
      ? { top: 0, left: 20, bottom: 0, right: 20 }
      : { top: 20, left: 0, bottom: 20, right: 0 };
  return Object.freeze({
    ...base,
    margins: Object.freeze(margins),
    orientation,
  });
}

/**
 * Typical iPhone Duo states for tests, in window coordinates (dp).
 *
 * Geometry was measured on the iOS 27.1 iPhone Duo simulator: the outer
 * display is 466×678 with the camera at the top right; the inner display is
 * 669×951 in portrait and 951×669 in landscape, with the fold across its
 * middle (a 40 dp band: a line plus 20 dp margins) and the camera at the top
 * right.
 *
 * Use with `applyMockFoldState(mockFoldStates.halfOpenedBook)`, or spread
 * into `setMockFoldState` to tweak a field.
 */
export const mockFoldStates = Object.freeze({
  /** Unfolded, flat: one large display, the fold doesn't divide content. */
  flat: Object.freeze<FoldState>({
    posture: 'flat',
    hingeAngle: 180,
    sizeClass: { horizontal: 'regular', vertical: 'regular' },
    folds: [],
    occlusions: [region(585, 0, 84, 120)],
    verticalBarEdge: null,
  }),

  /** Half-opened in portrait: top and bottom halves ("laptop"). */
  halfOpenedLaptop: Object.freeze<FoldState>({
    posture: 'halfOpened',
    hingeAngle: 90,
    sizeClass: { horizontal: 'regular', vertical: 'regular' },
    folds: [fold(0, 455.5, 669, 40)],
    occlusions: [region(585, 0, 84, 120)],
    verticalBarEdge: null,
  }),

  /** Half-opened in landscape: left and right pages ("book"). */
  halfOpenedBook: Object.freeze<FoldState>({
    posture: 'halfOpened',
    hingeAngle: 90,
    sizeClass: { horizontal: 'regular', vertical: 'regular' },
    folds: [fold(455.5, 0, 40, 669)],
    occlusions: [region(867, 0, 84, 120)],
    verticalBarEdge: null,
  }),

  /** Closed: the app runs on the outer display. */
  folded: Object.freeze<FoldState>({
    posture: 'folded',
    hingeAngle: 0,
    sizeClass: { horizontal: 'compact', vertical: 'regular' },
    folds: [],
    occlusions: [region(382, 0, 84, 170)],
    verticalBarEdge: 'trailing',
  }),
});
