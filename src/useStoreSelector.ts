import { useRef, useSyncExternalStore } from 'react';

type Selection<S, T> = {
  state: S;
  selector: (state: S) => T;
  selected: T;
};

/**
 * `useSyncExternalStore` that re-renders only when the selected value changes
 * according to `isEqual`, so e.g. a posture-only consumer ignores hinge angle
 * updates.
 */
export function useStoreSelector<S, T>(
  subscribe: (listener: () => void) => () => void,
  getState: () => S,
  selector: (state: S) => T,
  isEqual: (a: T, b: T) => boolean = Object.is
): T {
  const last = useRef<Selection<S, T> | null>(null);

  const getSelection = () => {
    const state = getState();
    const prev = last.current;
    if (prev && prev.state === state && prev.selector === selector) {
      return prev.selected;
    }
    const next = selector(state);
    // Keep the previous reference for an equal value: it both skips the
    // re-render and keeps selectors returning fresh objects from looping.
    const selected =
      prev && isEqual(prev.selected, next) ? prev.selected : next;
    last.current = { state, selector, selected };
    return selected;
  };

  return useSyncExternalStore(subscribe, getSelection, getSelection);
}
