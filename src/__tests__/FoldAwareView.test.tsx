import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { FoldAwareView } from '../FoldAwareView';
import { rawCamera, rawFold } from '../__fixtures__/foldState';

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

    fireEvent(screen.getByTestId('fold-aware'), 'regionsChange', {
      nativeEvent: { folds: [rawFold, null], occlusions: [rawCamera] },
    });

    expect(onRegionsChange).toHaveBeenCalledWith({
      folds: [rawFold],
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

  it('does not subscribe to native events without a listener', async () => {
    await render(<FoldAwareView testID="fold-aware" />);
    expect(
      screen.getByTestId('fold-aware').props.onRegionsChange
    ).toBeUndefined();
  });
});
