import { useCallback } from 'react';
import type { NativeSyntheticEvent } from 'react-native';
import NativeFoldAwareView, {
  type NativeRegionsChangeEvent,
} from './FoldAwareViewNativeComponent';
import { normalizeViewRegions } from './normalize';
import type { FoldAwareViewProps } from './FoldAwareView.types';

/**
 * A regular container view that reports folds and occlusions intersecting it,
 * in its own coordinate space. Fires once after mount and on every change.
 */
export function FoldAwareView({
  onRegionsChange,
  ...rest
}: FoldAwareViewProps) {
  const handleRegionsChange = useCallback(
    (event: NativeSyntheticEvent<NativeRegionsChangeEvent>) => {
      onRegionsChange?.(normalizeViewRegions(event.nativeEvent));
    },
    [onRegionsChange]
  );

  return (
    <NativeFoldAwareView
      {...rest}
      onRegionsChange={onRegionsChange ? handleRegionsChange : undefined}
    />
  );
}
