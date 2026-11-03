'use client';

import { useEffect, useRef, useState } from 'react';
import { load, save, type StoreKey } from './storage';

/**
 * State that is remembered in this browser. Reads after mount (so server HTML and first client render match),
 * then writes on every change.
 */
export function usePersistent<T>(key: StoreKey, initial: T, valid: (v: unknown) => v is T): [T, (v: T | ((p: T) => T)) => void, boolean] {
  const [value, setValue] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);
  const first = useRef(true);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read browser-only storage after mount so server HTML and the first client render match
    setValue(load(key, initial, valid));
    setLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(() => {
    if (!loaded) return;
    if (first.current) {
      first.current = false;
      return;
    }
    save(key, value);
  }, [key, value, loaded]);
  return [value, setValue, loaded];
}
