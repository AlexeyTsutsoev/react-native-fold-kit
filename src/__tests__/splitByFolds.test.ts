import { describe, expect, it } from '@jest/globals';
import { splitByFolds } from '../splitByFolds';
import type { Region } from '../types';

const size = { width: 800, height: 600 };
const noMargins = { top: 0, left: 0, bottom: 0, right: 0 };

function region(partial: Partial<Region>): Region {
  return {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    isActive: true,
    margins: noMargins,
    ...partial,
  };
}

// Book: vertical hinge 20 wide in the middle.
const bookFold = region({ x: 390, width: 20, height: 600 });
// Laptop: horizontal hinge 40 tall in the middle.
const laptopFold = region({ y: 280, width: 800, height: 40 });

describe('splitByFolds', () => {
  it('returns the whole area without folds', () => {
    expect(splitByFolds(size, [])).toEqual([
      { x: 0, y: 0, width: 800, height: 600 },
    ]);
  });

  it('splits into left and right panes around a vertical fold', () => {
    expect(splitByFolds(size, [bookFold])).toEqual([
      { x: 0, y: 0, width: 390, height: 600 },
      { x: 410, y: 0, width: 390, height: 600 },
    ]);
  });

  it('splits into top and bottom panes around a horizontal fold', () => {
    expect(splitByFolds(size, [laptopFold])).toEqual([
      { x: 0, y: 0, width: 800, height: 280 },
      { x: 0, y: 320, width: 800, height: 280 },
    ]);
  });

  it('handles a zero-width hinge (Android FoldingFeature)', () => {
    const hairline = region({ x: 400, width: 0, height: 600 });
    expect(splitByFolds(size, [hairline])).toEqual([
      { x: 0, y: 0, width: 400, height: 600 },
      { x: 400, y: 0, width: 400, height: 600 },
    ]);
  });

  it('keeps panes clear of margins by default', () => {
    const withMargins = region({
      x: 380,
      width: 40,
      height: 600,
      margins: { ...noMargins, left: 10, right: 10 },
    });
    expect(splitByFolds(size, [withMargins])).toEqual([
      { x: 0, y: 0, width: 380, height: 600 },
      { x: 420, y: 0, width: 380, height: 600 },
    ]);
    expect(
      splitByFolds(size, [withMargins], { respectMargins: false })
    ).toEqual([
      { x: 0, y: 0, width: 390, height: 600 },
      { x: 410, y: 0, width: 390, height: 600 },
    ]);
  });

  it('ignores inactive folds unless asked', () => {
    const inactive = { ...bookFold, isActive: false };
    expect(splitByFolds(size, [inactive])).toHaveLength(1);
    expect(
      splitByFolds(size, [inactive], { includeInactive: true })
    ).toHaveLength(2);
  });

  it('ignores folds that do not cross the area', () => {
    // A vertical fold entirely below the area (e.g. a view above the fold's extent).
    const below = region({ x: 390, y: 700, width: 20, height: 300 });
    // A vertical fold to the right of the area.
    const outside = region({ x: 900, width: 20, height: 600 });
    expect(splitByFolds(size, [below, outside])).toEqual([
      { x: 0, y: 0, width: 800, height: 600 },
    ]);
  });

  it('does not produce empty panes for a fold at the edge', () => {
    const atEdge = region({ x: 0, width: 0, height: 600 });
    const overEdge = region({ x: 790, width: 20, height: 600 });
    expect(splitByFolds(size, [atEdge, overEdge])).toEqual([
      { x: 0, y: 0, width: 790, height: 600 },
    ]);
  });

  it('merges overlapping folds', () => {
    const a = region({ x: 380, width: 30, height: 600 });
    const b = region({ x: 400, width: 30, height: 600 });
    expect(splitByFolds(size, [b, a])).toEqual([
      { x: 0, y: 0, width: 380, height: 600 },
      { x: 430, y: 0, width: 370, height: 600 },
    ]);
  });

  it('splits by several folds, columns first, left to right and top to bottom', () => {
    const second = region({ x: 590, width: 20, height: 600 });
    expect(splitByFolds(size, [second, bookFold, laptopFold])).toEqual([
      { x: 0, y: 0, width: 390, height: 280 },
      { x: 0, y: 320, width: 390, height: 280 },
      { x: 410, y: 0, width: 180, height: 280 },
      { x: 410, y: 320, width: 180, height: 280 },
      { x: 610, y: 0, width: 190, height: 280 },
      { x: 610, y: 320, width: 190, height: 280 },
    ]);
  });

  it('works in view coordinates where the fold starts outside the view', () => {
    // FoldAwareView below a tab bar: the fold's y is negative, it still crosses.
    const shifted = region({ x: 390, y: -93, width: 20, height: 900 });
    expect(splitByFolds(size, [shifted])).toHaveLength(2);
  });

  it('returns no panes for an empty area', () => {
    expect(splitByFolds({ width: 0, height: 600 }, [])).toEqual([]);
  });
});
