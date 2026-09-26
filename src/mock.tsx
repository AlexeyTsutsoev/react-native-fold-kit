/**
 * Jest mock for consumers, published as `react-native-fold-kit/jest`:
 *
 *   jest.mock('react-native-fold-kit', () => require('react-native-fold-kit/jest'));
 *
 *   applyMockFoldState(mockFoldStates.halfOpenedBook);
 *   setMockFoldState({ posture: 'halfOpened', folds: [fold] });
 *
 * Exposes the same API as the real entry point plus `setMock*` / `resetMock*`
 * helpers. Never touches native code.
 */
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
} from 'react';
import { View } from 'react-native';
import { DEFAULT_FOLD_STATE, EMPTY_VIEW_REGIONS } from './normalize';
import type { FoldAwareViewProps } from './FoldAwareView.types';
import type { FoldState, ViewRegions } from './types';
import { useStoreSelector } from './useStoreSelector';

// Pure helpers are the real implementations.
export { DEFAULT_FOLD_STATE, getFoldOrientation } from './normalize';
export { splitByFolds, type SplitByFoldsOptions } from './splitByFolds';
export { mockFoldStates } from './mockFoldStates';
export type { FoldAwareViewProps } from './FoldAwareView.types';
export type {
  Fold,
  FoldOrientation,
  FoldState,
  Insets,
  Pane,
  Posture,
  Region,
  SizeClass,
  VerticalBarEdge,
  ViewRegions,
} from './types';

let foldState: FoldState = DEFAULT_FOLD_STATE;
let viewRegions: ViewRegions = EMPTY_VIEW_REGIONS;
const foldListeners = new Set<() => void>();
const viewListeners = new Set<() => void>();

/** Shallow-merges `patch` into the mocked window-level state and notifies subscribers. */
export function setMockFoldState(patch: Partial<FoldState>) {
  foldState = { ...foldState, ...patch };
  foldListeners.forEach((listener) => listener());
}

/** Sets the regions every mounted `FoldAwareView` reports. */
export function setMockViewRegions(regions: ViewRegions) {
  viewRegions = regions;
  viewListeners.forEach((listener) => listener());
}

/**
 * Sets the window-level state and makes every `FoldAwareView` report the same
 * folds and occlusions (as if it filled the window). Typically used with a
 * `mockFoldStates` preset.
 */
export function applyMockFoldState(state: FoldState) {
  foldState = state;
  foldListeners.forEach((listener) => listener());
  setMockViewRegions({ folds: state.folds, occlusions: state.occlusions });
}

/** Restores defaults. Call it in `afterEach`. */
export function resetMockFoldState() {
  foldState = DEFAULT_FOLD_STATE;
  foldListeners.forEach((listener) => listener());
  setMockViewRegions(EMPTY_VIEW_REGIONS);
}

export function getFoldState(): FoldState {
  return foldState;
}

export function subscribeToFoldState(listener: () => void): () => void {
  foldListeners.add(listener);
  return () => {
    foldListeners.delete(listener);
  };
}

const identity = (state: FoldState) => state;

export function useFoldState(): FoldState;
export function useFoldState<T>(
  selector: (state: FoldState) => T,
  isEqual?: (a: T, b: T) => boolean
): T;
export function useFoldState<T>(
  selector: (state: FoldState) => T = identity as (state: FoldState) => T,
  isEqual?: (a: T, b: T) => boolean
): T {
  return useStoreSelector(
    subscribeToFoldState,
    getFoldState,
    selector,
    isEqual
  );
}

function subscribeToViewRegions(listener: () => void) {
  viewListeners.add(listener);
  return () => {
    viewListeners.delete(listener);
  };
}

function getViewRegions() {
  return viewRegions;
}

export function FoldAwareView({
  onRegionsChange,
  includeInactive,
  ...rest
}: FoldAwareViewProps) {
  const regions = useSyncExternalStore(
    subscribeToViewRegions,
    getViewRegions,
    getViewRegions
  );

  // Like the native view, report when regions change or a handler appears,
  // not when the handler's identity does: an inline handler that sets state
  // would otherwise re-fire on every render and loop.
  const handlerRef = useRef(onRegionsChange);
  useLayoutEffect(() => {
    handlerRef.current = onRegionsChange;
  });
  const hasHandler = onRegionsChange != null;

  useEffect(() => {
    if (!hasHandler) return;
    handlerRef.current?.(
      includeInactive
        ? regions
        : {
            folds: regions.folds.filter((region) => region.isActive),
            occlusions: regions.occlusions.filter((region) => region.isActive),
          }
    );
  }, [regions, includeInactive, hasHandler]);

  return <View {...rest} />;
}
