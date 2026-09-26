import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';
import { rawState } from '../__fixtures__/foldState';

type Listener = (raw: unknown) => void;

// Controllable fake of the native bridge; re-created for every test together
// with a fresh copy of the store module (it keeps module-level state).
let mockNativeState: unknown;
let mockNativeListeners: Set<Listener>;
let mockReadCount: number;

jest.mock('../nativeFoldState', () => ({
  readNativeFoldState: () => {
    mockReadCount += 1;
    return mockNativeState;
  },
  subscribeNativeFoldState: (listener: Listener) => {
    mockNativeListeners.add(listener);
    return () => mockNativeListeners.delete(listener);
  },
}));

function emitNative(raw: unknown) {
  mockNativeListeners.forEach((listener) => listener(raw));
}

function loadModules() {
  let modules!: {
    store: typeof import('../foldStateStore');
    hook: typeof import('../useFoldState');
  };
  // Fresh store per test, but the same React the renderer uses.
  const React = require('react');
  jest.isolateModules(() => {
    jest.doMock('react', () => React);
    modules = {
      store: require('../foldStateStore'),
      hook: require('../useFoldState'),
    };
  });
  return modules;
}

beforeEach(() => {
  mockNativeState = null;
  mockNativeListeners = new Set();
  mockReadCount = 0;
});

describe('foldStateStore', () => {
  it('does not touch native code until first use', () => {
    loadModules();
    expect(mockReadCount).toBe(0);
    expect(mockNativeListeners.size).toBe(0);
  });

  it('returns defaults when native reports nothing', () => {
    const { store } = loadModules();
    expect(store.getFoldState().posture).toBe('unknown');
    expect(store.getFoldState().folds).toEqual([]);
  });

  it('reads the initial state once and subscribes once', () => {
    mockNativeState = rawState;
    const { store } = loadModules();
    expect(store.getFoldState().posture).toBe('halfOpened');
    store.getFoldState();
    store.subscribeToFoldState(() => {});
    expect(mockReadCount).toBe(1);
    expect(mockNativeListeners.size).toBe(1);
  });

  it('updates and notifies on native events', () => {
    const { store } = loadModules();
    const listener = jest.fn();
    store.subscribeToFoldState(listener);

    emitNative(rawState);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getFoldState().hingeAngle).toBe(95.5);
  });

  it('keeps the same object and does not notify for an equal state', () => {
    mockNativeState = rawState;
    const { store } = loadModules();
    const before = store.getFoldState();
    const listener = jest.fn();
    store.subscribeToFoldState(listener);

    emitNative({ ...rawState });

    expect(listener).not.toHaveBeenCalled();
    expect(store.getFoldState()).toBe(before);
  });

  it('stops notifying after unsubscribe', () => {
    const { store } = loadModules();
    const listener = jest.fn();
    const unsubscribe = store.subscribeToFoldState(listener);
    unsubscribe();

    emitNative(rawState);

    expect(listener).not.toHaveBeenCalled();
  });
});

describe('useFoldState', () => {
  it('renders the current state and re-renders on change', async () => {
    const { hook } = loadModules();
    const { result } = await renderHook(() => hook.useFoldState());
    expect(result.current.posture).toBe('unknown');

    await act(() => emitNative(rawState));
    expect(result.current.posture).toBe('halfOpened');

    await act(() =>
      emitNative({ ...rawState, posture: 'flat', hingeAngle: 180 })
    );
    expect(result.current.posture).toBe('flat');
    expect(result.current.hingeAngle).toBe(180);
  });

  it('with a selector, re-renders only when the selected value changes', async () => {
    mockNativeState = rawState;
    const { hook } = loadModules();
    let renders = 0;
    const { result } = await renderHook(() => {
      renders += 1;
      return hook.useFoldState((state) => state.posture);
    });
    expect(result.current).toBe('halfOpened');
    const rendersBefore = renders;

    await act(() => emitNative({ ...rawState, hingeAngle: 100 }));
    await act(() => emitNative({ ...rawState, hingeAngle: 110 }));
    expect(renders).toBe(rendersBefore);

    await act(() => emitNative({ ...rawState, posture: 'flat' }));
    expect(result.current).toBe('flat');
    expect(renders).toBe(rendersBefore + 1);
  });

  it('keeps the previous selection when isEqual says it is unchanged', async () => {
    mockNativeState = rawState;
    const { hook } = loadModules();
    const { result } = await renderHook(() =>
      hook.useFoldState(
        (state) => ({ posture: state.posture, folds: state.folds.length }),
        (a, b) => a.posture === b.posture && a.folds === b.folds
      )
    );
    const first = result.current;

    await act(() => emitNative({ ...rawState, hingeAngle: 120 }));

    expect(result.current).toBe(first);
  });
});
