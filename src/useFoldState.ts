import { getFoldState, subscribeToFoldState } from './foldStateStore';
import type { FoldState } from './types';
import { useStoreSelector } from './useStoreSelector';

const identity = (state: FoldState) => state;

/**
 * Window-level fold state: posture, hinge angle, folds, occlusions, size classes.
 *
 * The hinge angle changes continuously while the device is being folded. Pass
 * a `selector` to re-render only when the selected value changes:
 *
 *   const posture = useFoldState((state) => state.posture);
 *
 * `isEqual` (default `Object.is`) compares consecutive selections; supply one
 * when the selector builds a new object or array.
 */
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
