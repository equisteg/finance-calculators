import { KEYS, parseBackup, STORE_PREFIX, STORE_VALIDATORS, type Backup, type StoreKey } from '@finealth/finance-core';

/**
 * Everything the user types stays on this phone (AsyncStorage, keys `finealth.v1.*`, the same schema as the website).
 * Nothing is sent to our server, logs, analytics or the ad SDK. All values are read once at start into memory so screens
 * read synchronously; writes go to memory at once and to disk in the background. Every read is validated.
 * No React Native imports: unit-tested in Node.
 */
export interface Backend {
  multiGet(keys: string[]): Promise<readonly (readonly [string, string | null])[]>;
  setItem(k: string, v: string): Promise<void>;
  multiRemove(keys: string[]): Promise<void>;
}

export interface Store {
  ready: Promise<void>;
  get<T>(key: StoreKey, fallback: T, valid: (v: unknown) => v is T): T;
  set(key: StoreKey | 'settings', value: unknown): void;
  getSettings(): Settings;
  clearAll(): Promise<void>;
  exportBackup(now?: Date): Backup;
  importBackup(json: string): { ok: true; restored: StoreKey[] } | { ok: false; message: string };
  subscribe(fn: () => void): () => void;
}

export interface Settings {
  currency: 'INR' | 'USD' | 'EUR' | 'GBP';
}
const DEFAULT_SETTINGS: Settings = { currency: 'INR' };
const isSettings = (v: unknown): v is Settings =>
  !!v && typeof v === 'object' && ['INR', 'USD', 'EUR', 'GBP'].includes((v as Settings).currency);

const ALL = [...Object.values(KEYS), 'settings'] as const;

export function createStore(backend: Backend): Store {
  const mem = new Map<string, unknown>();
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((l) => l());

  const ready = backend
    .multiGet(ALL.map((k) => STORE_PREFIX + k))
    .then((pairs) => {
      for (const [k, raw] of pairs) {
        if (!raw) continue;
        try {
          mem.set(k.slice(STORE_PREFIX.length), JSON.parse(raw));
        } catch {
          /* unreadable value: ignored, defaults are used */
        }
      }
    })
    .catch(() => undefined)
    .then(notify);

  const set = (key: StoreKey | 'settings', value: unknown) => {
    mem.set(key, value);
    backend.setItem(STORE_PREFIX + key, JSON.stringify(value)).catch(() => undefined);
    notify();
  };

  return {
    ready,
    get(key, fallback, valid) {
      const v = mem.get(key);
      return v !== undefined && valid(v) ? v : fallback;
    },
    set,
    getSettings() {
      const v = mem.get('settings');
      return isSettings(v) ? v : DEFAULT_SETTINGS;
    },
    async clearAll() {
      for (const k of Object.values(KEYS)) mem.delete(k);
      await backend.multiRemove(Object.values(KEYS).map((k) => STORE_PREFIX + k)).catch(() => undefined);
      notify();
    },
    exportBackup(now = new Date()) {
      const data: Partial<Record<StoreKey, unknown>> = {};
      for (const k of Object.values(KEYS)) {
        const v = mem.get(k);
        if (v !== undefined && STORE_VALIDATORS[k](v)) data[k] = v;
      }
      return { app: 'finealth', version: 1, exportedAt: now.toISOString(), data };
    },
    importBackup(json) {
      const parsed = parseBackup(json);
      if (!parsed.ok) return parsed;
      const restored = Object.keys(parsed.sections) as StoreKey[];
      for (const k of restored) set(k, parsed.sections[k]);
      return { ok: true, restored };
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

export const newId = () => Math.random().toString(36).slice(2, 10);
