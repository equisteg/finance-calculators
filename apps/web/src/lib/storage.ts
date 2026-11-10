/**
 * Everything the user types stays in this browser (localStorage). Nothing is sent to our server or to analytics.
 * Every read is validated and falls back to defaults; private mode or blocked storage only means nothing is remembered.
 */
import type { Debt, Goal, HealthInput, RetirementInput } from '@finealth/finance-core';

export const STORE_PREFIX = 'finealth.v1.';
export const KEYS = {
  health: 'health',
  debts: 'debts',
  goals: 'goals',
  retirement: 'retirement',
  snapshots: 'snapshots',
} as const;
export type StoreKey = (typeof KEYS)[keyof typeof KEYS];

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

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const isStr = (v: unknown, max = 80): v is string => typeof v === 'string' && v.length <= max;

export const isHealthInput = (v: unknown): v is HealthInput =>
  isObj(v) &&
  ['monthlyIncome', 'monthlyExpenses', 'monthlyDebtPayments', 'emergencyFund', 'costlyDebt', 'investments', 'age', 'dependents', 'lifeCover'].every((k) => isNum(v[k])) &&
  typeof v.hasHealthCover === 'boolean';

export const isDebt = (v: unknown): v is Debt =>
  isObj(v) && isStr(v.id) && isStr(v.name) && isNum(v.balance) && isNum(v.aprPct) && isNum(v.minPayment);
export const isDebtList = (v: unknown): v is Debt[] => Array.isArray(v) && v.length <= 50 && v.every(isDebt);

export const isGoal = (v: unknown): v is Goal =>
  isObj(v) && isStr(v.id) && isStr(v.name) && ['costToday', 'years', 'inflationPct', 'returnPct', 'currentSavings'].every((k) => isNum(v[k])) && (v.stepUpPct === undefined || isNum(v.stepUpPct));
export const isGoalList = (v: unknown): v is Goal[] => Array.isArray(v) && v.length <= 50 && v.every(isGoal);

export const isRetirementInput = (v: unknown): v is RetirementInput =>
  isObj(v) &&
  ['currentAge', 'retireAge', 'planToAge', 'currentSavings', 'monthlySaving', 'yearlySpendingToday', 'inflationPct', 'returnPct', 'retiredReturnPct', 'volatilityPct'].every((k) => isNum(v[k]));

/** A saved health-check result (Pro): date, score and the pillar scores, nothing else. */
export interface Snapshot {
  at: string;
  score: number;
  pillars: Record<string, number>;
  currency: string;
  netWorth: number;
}
export const isSnapshot = (v: unknown): v is Snapshot =>
  isObj(v) && isStr(v.at, 40) && isNum(v.score) && isObj(v.pillars) && isStr(v.currency, 3) && isNum(v.netWorth);
export const isSnapshotList = (v: unknown): v is Snapshot[] => Array.isArray(v) && v.length <= 500 && v.every(isSnapshot);

/** Backup file: every saved plan, versioned. */
export interface Backup {
  app: 'finealth';
  version: 1;
  exportedAt: string;
  data: Partial<Record<StoreKey, unknown>>;
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

const VALIDATORS: Record<StoreKey, (v: unknown) => boolean> = {
  health: isHealthInput,
  debts: isDebtList,
  goals: isGoalList,
  retirement: isRetirementInput,
  snapshots: isSnapshotList,
};

/** Restores a backup. Only valid sections are written; returns the sections restored. */
export function importBackup(json: string): { ok: true; restored: StoreKey[] } | { ok: false; message: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, message: 'That file is not a Finealth backup (it is not valid JSON).' };
  }
  if (!isObj(parsed) || parsed.app !== 'finealth' || parsed.version !== 1 || !isObj(parsed.data)) {
    return { ok: false, message: 'That file is not a Finealth backup.' };
  }
  const restored: StoreKey[] = [];
  for (const k of Object.values(KEYS)) {
    const v = (parsed.data as Record<string, unknown>)[k];
    if (v !== undefined && VALIDATORS[k](v)) {
      save(k, v);
      restored.push(k);
    }
  }
  return restored.length ? { ok: true, restored } : { ok: false, message: 'The backup had nothing we could restore.' };
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
