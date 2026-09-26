import {
  DEFAULT_FOLD_STATE,
  isSameState,
  normalizeFoldState,
} from './normalize';
import {
  readNativeFoldState,
  subscribeNativeFoldState,
} from './nativeFoldState';
import type { FoldState } from './types';

let state: FoldState = DEFAULT_FOLD_STATE;
let started = false;
const listeners = new Set<() => void>();

function setState(next: FoldState) {
  if (isSameState(state, next)) {
    return;
  }
  state = next;
  listeners.forEach((listener) => listener());
}

// The native subscription is app-wide and cheap, so it is opened lazily once
// and kept for the lifetime of the JS runtime.
function ensureStarted() {
  if (started) {
    return;
  }
  started = true;
  state = normalizeFoldState(readNativeFoldState());
  subscribeNativeFoldState((raw) => setState(normalizeFoldState(raw)));
}

/** Returns the latest known window-level fold state. */
export function getFoldState(): FoldState {
  ensureStarted();
  return state;
}

/** Subscribes to fold state changes. Returns an unsubscribe function. */
export function subscribeToFoldState(listener: () => void): () => void {
  ensureStarted();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
