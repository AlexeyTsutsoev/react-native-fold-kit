import { afterEach, describe, expect, it, jest } from '@jest/globals';

function load(nativeModule: unknown) {
  let mod!: typeof import('../nativeFoldState');
  jest.isolateModules(() => {
    jest.doMock('../NativeFoldKit', () => ({
      __esModule: true,
      default: nativeModule,
    }));
    mod = require('../nativeFoldState');
  });
  return mod;
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('nativeFoldState without the native module', () => {
  it('returns null and a no-op subscription instead of throwing', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { readNativeFoldState, subscribeNativeFoldState } = load(null);

    expect(readNativeFoldState()).toBeNull();
    const unsubscribe = subscribeNativeFoldState(() => {});
    expect(() => unsubscribe()).not.toThrow();
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('keeps the store at defaults', () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    let store!: typeof import('../foldStateStore');
    jest.isolateModules(() => {
      jest.doMock('../NativeFoldKit', () => ({
        __esModule: true,
        default: null,
      }));
      store = require('../foldStateStore');
    });
    expect(store.getFoldState()).toEqual(
      require('../normalize').DEFAULT_FOLD_STATE
    );
  });
});

describe('nativeFoldState with the native module', () => {
  it('reads state and forwards events', () => {
    const remove = jest.fn();
    let emit: ((raw: unknown) => void) | undefined;
    const { readNativeFoldState, subscribeNativeFoldState } = load({
      getFoldState: () => ({ posture: 'flat' }),
      onFoldStateChange: (listener: (raw: unknown) => void) => {
        emit = listener;
        return { remove };
      },
    });

    expect(readNativeFoldState()).toEqual({ posture: 'flat' });
    const listener = jest.fn();
    const unsubscribe = subscribeNativeFoldState(listener);
    emit?.({ posture: 'folded' });
    expect(listener).toHaveBeenCalledWith({ posture: 'folded' });
    unsubscribe();
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
