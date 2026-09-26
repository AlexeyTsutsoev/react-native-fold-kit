import { describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { FoldAwareView } from '../FoldAwareView';
import { fold, rawCamera, rawFold } from '../__fixtures__/foldState';

jest.mock('../FoldAwareViewNativeComponent', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: View };
});

describe('FoldAwareView (native)', () => {
  it('normalizes the native event before calling onRegionsChange', async () => {
    const onRegionsChange = jest.fn();
    await render(
      <FoldAwareView testID="fold-aware" onRegionsChange={onRegionsChange} />
    );

    await fireEvent(screen.getByTestId('fold-aware'), 'regionsChange', {
      nativeEvent: { folds: [rawFold, null], occlusions: [rawCamera] },
    });

    expect(onRegionsChange).toHaveBeenCalledWith({
      folds: [fold],
      occlusions: [rawCamera],
    });
  });

  it('passes props through to the native view', async () => {
    await render(
      <FoldAwareView testID="fold-aware" includeInactive style={{ flex: 1 }} />
    );
    const view = screen.getByTestId('fold-aware');
    expect(view.props.includeInactive).toBe(true);
    expect(view.props.style).toEqual({ flex: 1 });
  });

  it('delivers the current regions to a handler added after mount', async () => {
    const { rerender } = await render(<FoldAwareView testID="fold-aware" />);
    await fireEvent(screen.getByTestId('fold-aware'), 'regionsChange', {
      nativeEvent: { folds: [rawFold], occlusions: [] },
    });

    const onRegionsChange = jest.fn();
    await rerender(
      <FoldAwareView testID="fold-aware" onRegionsChange={onRegionsChange} />
    );

    expect(onRegionsChange).toHaveBeenCalledTimes(1);
    expect(onRegionsChange).toHaveBeenCalledWith({
      folds: [fold],
      occlusions: [],
    });
  });

  it('does not re-deliver when only the handler identity changes', async () => {
    let calls = 0;
    let rerenderScreen: () => void = () => {};
    function Screen() {
      const [, setTick] = useState(0);
      rerenderScreen = () => setTick((tick) => tick + 1);
      return (
        <FoldAwareView
          testID="fold-aware"
          onRegionsChange={() => {
            calls += 1;
          }}
        />
      );
    }

    await render(<Screen />);
    await fireEvent(screen.getByTestId('fold-aware'), 'regionsChange', {
      nativeEvent: { folds: [rawFold], occlusions: [] },
    });
    expect(calls).toBe(1);

    await act(() => rerenderScreen());
    await act(() => rerenderScreen());
    expect(calls).toBe(1);
  });

  it('keeps a stable native handler across renders', async () => {
    const { rerender } = await render(
      <FoldAwareView testID="fold-aware" onRegionsChange={() => {}} />
    );
    const first = screen.getByTestId('fold-aware').props.onRegionsChange;
    await rerender(
      <FoldAwareView testID="fold-aware" onRegionsChange={() => {}} />
    );
    expect(screen.getByTestId('fold-aware').props.onRegionsChange).toBe(first);
  });
});
