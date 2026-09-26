import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import type { NativeSyntheticEvent } from 'react-native';
import NativeFoldAwareView, {
  type NativeRegionsChangeEvent,
} from './FoldAwareViewNativeComponent';
import { normalizeViewRegions } from './normalize';
import type { FoldAwareViewProps } from './FoldAwareView.types';
import type { ViewRegions } from './types';

/**
 * A regular container view that reports folds and occlusions intersecting it,
 * in its own coordinate space. `onRegionsChange` fires with the current
 * regions once it is set (also when it is added after mount) and then on
 * every change.
 */
export function FoldAwareView({
  onRegionsChange,
  ...rest
}: FoldAwareViewProps) {
  // Native views only report changes, so always listen and remember the last
  // regions: a handler added later still gets the current value.
  const lastRegions = useRef<ViewRegions | null>(null);
  const handlerRef = useRef(onRegionsChange);
  useLayoutEffect(() => {
    handlerRef.current = onRegionsChange;
  });

  const hasHandler = onRegionsChange != null;
  useEffect(() => {
    if (hasHandler && lastRegions.current) {
      handlerRef.current?.(lastRegions.current);
    }
  }, [hasHandler]);

  // Stable identity: a new inline handler on every render doesn't touch the
  // native prop and doesn't re-deliver regions.
  const handleRegionsChange = useCallback(
    (event: NativeSyntheticEvent<NativeRegionsChangeEvent>) => {
      const regions = normalizeViewRegions(event.nativeEvent);
      lastRegions.current = regions;
      handlerRef.current?.(regions);
    },
    []
  );

  return (
    <NativeFoldAwareView {...rest} onRegionsChange={handleRegionsChange} />
  );
}
