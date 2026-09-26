import { describe, expect, it } from '@jest/globals';
import {
  DEFAULT_FOLD_STATE,
  EMPTY_VIEW_REGIONS,
  isSameState,
  normalizeFoldState,
  normalizeRegions,
  normalizeViewRegions,
} from '../normalize';
import { rawCamera, rawFold, rawState } from '../__fixtures__/foldState';

describe('normalizeFoldState', () => {
  it('maps a complete native payload', () => {
    expect(normalizeFoldState(rawState)).toEqual({
      posture: 'halfOpened',
      hingeAngle: 95.5,
      sizeClass: { horizontal: 'regular', vertical: 'compact' },
      folds: [rawFold],
      occlusions: [rawCamera],
      verticalBarEdge: 'leading',
    });
  });

  it.each([null, undefined, 42, 'flat', []])(
    'returns defaults for a non-object payload (%p)',
    (raw) => {
      expect(normalizeFoldState(raw)).toBe(DEFAULT_FOLD_STATE);
    }
  );

  it('falls back to "unknown" for unrecognized enum values', () => {
    const state = normalizeFoldState({
      ...rawState,
      posture: 'tent',
      horizontalSizeClass: 'medium',
      verticalSizeClass: 42,
    });
    expect(state.posture).toBe('unknown');
    expect(state.sizeClass).toEqual({
      horizontal: 'unknown',
      vertical: 'unknown',
    });
  });

  it.each(['none', 'top', null, undefined])(
    'maps verticalBarEdge %p to null',
    (verticalBarEdge) => {
      expect(
        normalizeFoldState({ ...rawState, verticalBarEdge }).verticalBarEdge
      ).toBeNull();
    }
  );

  it.each([
    [null, null],
    [undefined, null],
    [Number.NaN, null],
    [Number.POSITIVE_INFINITY, null],
    ['90', null],
    [-3, 0],
    [400, 360],
    [180, 180],
  ])('normalizes hingeAngle %p to %p', (hingeAngle, expected) => {
    expect(normalizeFoldState({ ...rawState, hingeAngle }).hingeAngle).toBe(
      expected
    );
  });

  it('treats missing region arrays as empty', () => {
    const state = normalizeFoldState({
      ...rawState,
      folds: undefined,
      occlusions: undefined,
    });
    expect(state.folds).toEqual([]);
    expect(state.occlusions).toEqual([]);
  });
});

describe('normalizeRegions', () => {
  it('returns [] for non-arrays', () => {
    expect(normalizeRegions({ 0: rawFold })).toEqual([]);
    expect(normalizeRegions(null)).toEqual([]);
  });

  it('drops non-objects and regions with negative size', () => {
    expect(
      normalizeRegions([rawFold, null, 'fold', { ...rawFold, width: -1 }])
    ).toEqual([rawFold]);
  });

  it('fills missing or invalid numbers with 0 and margins with zero insets', () => {
    expect(normalizeRegions([{ x: 'a', y: Number.NaN, isActive: 1 }])).toEqual([
      {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        isActive: false,
        margins: { top: 0, left: 0, bottom: 0, right: 0 },
      },
    ]);
  });

  it('keeps zero-width folds (hinge without physical gap)', () => {
    const hairline = { ...rawFold, width: 0 };
    expect(normalizeRegions([hairline])).toEqual([hairline]);
  });
});

describe('normalizeViewRegions', () => {
  it('maps folds and occlusions', () => {
    expect(normalizeViewRegions({ folds: [rawFold], occlusions: [] })).toEqual({
      folds: [rawFold],
      occlusions: [],
    });
  });

  it('returns empty regions for a non-object payload', () => {
    expect(normalizeViewRegions(undefined)).toBe(EMPTY_VIEW_REGIONS);
  });
});

describe('isSameState', () => {
  it('compares normalized states structurally', () => {
    expect(
      isSameState(normalizeFoldState(rawState), normalizeFoldState(rawState))
    ).toBe(true);
    expect(
      isSameState(
        normalizeFoldState(rawState),
        normalizeFoldState({ ...rawState, hingeAngle: 96 })
      )
    ).toBe(false);
  });
});
