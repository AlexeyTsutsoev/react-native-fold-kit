import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { act, render, renderHook } from '@testing-library/react-native';
import { useState } from 'react';
import * as mock from '../mock';
import { fold, rawCamera } from '../__fixtures__/foldState';

jest.mock('../NativeFoldKit', () => ({ __esModule: true, default: {} }));
jest.mock('../FoldAwareViewNativeComponent', () => ({
  __esModule: true,
  default: 'FoldAwareView',
}));

afterEach(() => {
  mock.resetMockFoldState();
});

describe('react-native-fold-kit/jest', () => {
  it('exports everything the real entry point exports', () => {
    const real = require('../index');
    expect(Object.keys(mock)).toEqual(
      expect.arrayContaining(Object.keys(real))
    );
  });

  it('starts from defaults and applies setMockFoldState', async () => {
    const { result } = await renderHook(() => mock.useFoldState());
    expect(result.current).toBe(mock.DEFAULT_FOLD_STATE);

    await act(() =>
      mock.setMockFoldState({ posture: 'halfOpened', folds: [fold] })
    );

    expect(result.current.posture).toBe('halfOpened');
    expect(result.current.folds).toEqual([fold]);
    expect(result.current.hingeAngle).toBeNull();
  });

  it('FoldAwareView reports mocked regions, filtering inactive ones by default', async () => {
    const inactiveFold = { ...fold, isActive: false };
    const onRegionsChange = jest.fn();
    await render(<mock.FoldAwareView onRegionsChange={onRegionsChange} />);
    expect(onRegionsChange).toHaveBeenLastCalledWith({
      folds: [],
      occlusions: [],
    });

    await act(() =>
      mock.setMockViewRegions({
        folds: [inactiveFold],
        occlusions: [rawCamera],
      })
    );
    expect(onRegionsChange).toHaveBeenLastCalledWith({
      folds: [],
      occlusions: [rawCamera],
    });
  });

  it('FoldAwareView includes inactive regions on request', async () => {
    const inactiveFold = { ...fold, isActive: false };
    mock.setMockViewRegions({ folds: [inactiveFold], occlusions: [] });
    const onRegionsChange = jest.fn();
    await render(
      <mock.FoldAwareView includeInactive onRegionsChange={onRegionsChange} />
    );
    expect(onRegionsChange).toHaveBeenLastCalledWith({
      folds: [inactiveFold],
      occlusions: [],
    });
  });

  it('FoldAwareView does not re-fire for a new handler identity', async () => {
    let calls = 0;
    function Screen() {
      const [, setRegions] = useState<mock.ViewRegions | null>(null);
      return (
        <mock.FoldAwareView
          onRegionsChange={(regions) => {
            calls += 1;
            setRegions(regions);
          }}
        />
      );
    }

    await render(<Screen />);
    expect(calls).toBe(1);

    await act(() => mock.setMockViewRegions({ folds: [fold], occlusions: [] }));
    expect(calls).toBe(2);
  });

  it('presets are consistent: folds match posture and split into two panes', () => {
    const { flat, halfOpenedBook, halfOpenedLaptop, folded } =
      mock.mockFoldStates;
    expect(flat.folds).toHaveLength(0);
    expect(folded.folds).toHaveLength(0);
    expect(halfOpenedBook.folds[0]?.orientation).toBe('vertical');
    expect(halfOpenedLaptop.folds[0]?.orientation).toBe('horizontal');

    const book = mock.splitByFolds(
      { width: 951, height: 669 },
      halfOpenedBook.folds
    );
    expect(book.map((pane) => pane.width)).toEqual([455.5, 455.5]);
    const laptop = mock.splitByFolds(
      { width: 669, height: 951 },
      halfOpenedLaptop.folds
    );
    expect(laptop.map((pane) => pane.height)).toEqual([455.5, 455.5]);
  });

  it('applyMockFoldState drives both the hook and FoldAwareView', async () => {
    const onRegionsChange = jest.fn();
    const { result } = await renderHook(() => mock.useFoldState());
    await render(<mock.FoldAwareView onRegionsChange={onRegionsChange} />);

    await act(() =>
      mock.applyMockFoldState(mock.mockFoldStates.halfOpenedBook)
    );

    expect(result.current).toBe(mock.mockFoldStates.halfOpenedBook);
    expect(onRegionsChange).toHaveBeenLastCalledWith({
      folds: mock.mockFoldStates.halfOpenedBook.folds,
      occlusions: mock.mockFoldStates.halfOpenedBook.occlusions,
    });
  });

  it('FoldAwareView delivers current regions to a handler added later', async () => {
    mock.setMockViewRegions({ folds: [fold], occlusions: [] });
    const { rerender } = await render(<mock.FoldAwareView />);
    const onRegionsChange = jest.fn();
    await rerender(<mock.FoldAwareView onRegionsChange={onRegionsChange} />);
    expect(onRegionsChange).toHaveBeenCalledTimes(1);
    expect(onRegionsChange).toHaveBeenCalledWith({
      folds: [fold],
      occlusions: [],
    });
  });
});
