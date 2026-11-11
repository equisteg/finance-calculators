/**
 * Everything the user types stays in this browser (localStorage). Nothing is sent to our server or to analytics.
 * Every read is validated and falls back to defaults; private mode or blocked storage only means nothing is remembered.
 */
import { KEYS, parseBackup, STORE_PREFIX, type Backup, type StoreKey } from '@finealth/finance-core';

// The schema and validators are shared with the Android app (packages/finance-core/src/schema.ts).
export {
  isDebt,
  isDebtList,
  isGoal,
  isGoalList,
  isHealthInput,
  isRetirementInput,
  isSnapshot,
  isSnapshotList,
  KEYS,
  STORE_PREFIX,
  type Backup,
  type Snapshot,
  type StoreKey,
} from '@finealth/finance-core';

function kv(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function load<T>(key: StoreKey, fallback: T, valid: (v: unknown) => v is T): T {
  try {
    const raw = kv()?.getItem(STORE_PREFIX + key);
    if (!raw) return fallback;
    const v: unknown = JSON.parse(raw);
    return valid(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

export function save(key: StoreKey, value: unknown): void {
  try {
    kv()?.setItem(STORE_PREFIX + key, JSON.stringify(value));
  } catch {
    /* storage full or blocked: keep working for this visit */
  }
}

export function clearAll(): void {
  for (const k of Object.values(KEYS)) {
    try {
      kv()?.removeItem(STORE_PREFIX + k);
    } catch {
      /* ignore */
    }
  }
}

export function exportBackup(now = new Date()): Backup {
  const data: Partial<Record<StoreKey, unknown>> = {};
  for (const k of Object.values(KEYS)) {
    try {
      const raw = kv()?.getItem(STORE_PREFIX + k);
      if (raw) data[k] = JSON.parse(raw);
    } catch {
      /* skip unreadable */
    }
  }
  return { app: 'finealth', version: 1, exportedAt: now.toISOString(), data };
}

/** Restores a backup. Only valid sections are written; returns the sections restored. */
export function importBackup(json: string): { ok: true; restored: StoreKey[] } | { ok: false; message: string } {
  const parsed = parseBackup(json);
  if (!parsed.ok) return parsed;
  const restored = Object.keys(parsed.sections) as StoreKey[];
  for (const k of restored) save(k, parsed.sections[k]);
  return { ok: true, restored };
}

/** Starts a file download of `text` (CSV or JSON) in the browser. */
export function download(filename: string, text: string, type: string): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const newId = () => Math.random().toString(36).slice(2, 10);
