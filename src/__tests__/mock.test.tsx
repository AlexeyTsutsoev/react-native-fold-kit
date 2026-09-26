import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { act, render, renderHook } from '@testing-library/react-native';
import { useState } from 'react';
import * as mock from '../mock';
import { rawCamera, rawFold } from '../__fixtures__/foldState';

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
      mock.setMockFoldState({ posture: 'halfOpened', folds: [rawFold] })
    );

    expect(result.current.posture).toBe('halfOpened');
    expect(result.current.folds).toEqual([rawFold]);
    expect(result.current.hingeAngle).toBeNull();
  });

  it('FoldAwareView reports mocked regions, filtering inactive ones by default', async () => {
    const inactiveFold = { ...rawFold, isActive: false };
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
    const inactiveFold = { ...rawFold, isActive: false };
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

    await act(() =>
      mock.setMockViewRegions({ folds: [rawFold], occlusions: [] })
    );
    expect(calls).toBe(2);
  });
});
