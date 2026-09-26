import NativeFoldKit from './NativeFoldKit';

let warnedMissing = false;

function getModule() {
  if (!NativeFoldKit && __DEV__ && !warnedMissing) {
    warnedMissing = true;
    console.warn(
      "react-native-fold-kit: native module 'FoldKit' is not available, fold state will stay at defaults. " +
        'Rebuild the app after installing (run `pod install` on iOS). ' +
        "In Jest, use jest.mock('react-native-fold-kit', () => require('react-native-fold-kit/jest'))."
    );
  }
  return NativeFoldKit;
}

/** Raw native state, or `null` when the native module is unavailable. */
export function readNativeFoldState(): unknown {
  return getModule()?.getFoldState() ?? null;
}

export function subscribeNativeFoldState(
  listener: (raw: unknown) => void
): () => void {
  const subscription = getModule()?.onFoldStateChange(listener);
  return () => subscription?.remove();
}
