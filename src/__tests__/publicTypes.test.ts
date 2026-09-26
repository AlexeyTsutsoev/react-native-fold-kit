import { describe, expect, it } from '@jest/globals';
import { DEFAULT_FOLD_STATE, EMPTY_VIEW_REGIONS } from '../normalize';
import { splitByFolds } from '../splitByFolds';
import type { Fold, FoldState, Region, ViewRegions } from '../types';

// Compile-time checks (run by `yarn typecheck`): values from the library can
// be stored in plain arrays, as in the README examples.
function acceptsPlainArrays(state: FoldState, regions: ViewRegions) {
  const folds: Fold[] = regions.folds;
  const occlusions: Region[] = state.occlusions;
  const windowFolds: Fold[] = state.folds;
  // Inputs accept both plain and readonly arrays.
  const readonlyFolds: ReadonlyArray<Fold> = folds;
  return [
    folds,
    occlusions,
    windowFolds,
    splitByFolds({ width: 1, height: 1 }, readonlyFolds),
  ];
}

describe('public types', () => {
  it('accept plain arrays', () => {
    expect(
      acceptsPlainArrays(DEFAULT_FOLD_STATE, EMPTY_VIEW_REGIONS)
    ).toHaveLength(4);
  });

  it('keep shared defaults frozen, so mutation fails loudly', () => {
    const fold = {} as Fold;
    expect(() => DEFAULT_FOLD_STATE.folds.push(fold)).toThrow(TypeError);
    expect(() => EMPTY_VIEW_REGIONS.folds.push(fold)).toThrow(TypeError);
    expect(DEFAULT_FOLD_STATE.folds).toHaveLength(0);
  });
});
