import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useSyncExternalStore } from 'react';
import type { StoreKey } from '@finealth/finance-core';
import { createStore } from './store';

export const store = createStore({
  multiGet: (keys) => AsyncStorage.multiGet(keys),
  setItem: (k, v) => AsyncStorage.setItem(k, v),
  multiRemove: (keys) => AsyncStorage.multiRemove(keys),
});

let version = 0;
store.subscribe(() => {
  version++;
});
const subscribe = (fn: () => void) => store.subscribe(fn);
const snapshot = () => version;

/** Re-render when anything in the store changes. */
export function useStoreVersion() {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

/** A saved value (or `fallback`) and a setter; `null` means "use the example". */
export function usePersistent<T>(key: StoreKey, fallback: T, valid: (v: unknown) => v is T): [T, (v: T) => void] {
  useStoreVersion();
  const value = store.get(key, fallback, valid);
  const set = useCallback((v: T) => store.set(key, v), [key]);
  return [value, set];
}

export function useSettings() {
  useStoreVersion();
  return store.getSettings();
}
