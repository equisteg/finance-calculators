/**
 * What the web (localStorage) and the app (AsyncStorage) save on the device, and how every read is validated.
 * One schema for both, so a backup file made on the web restores in the app and the other way round.
 * Storage itself is platform code (apps/web/src/lib/storage.ts, apps/mobile/src/lib/storage.ts).
 */
import type { Debt } from './debt';
import type { Goal } from './goals';
import type { HealthInput } from './health';
import type { RetirementInput } from './retirement';

export const STORE_PREFIX = 'finealth.v1.';
export const KEYS = {
  health: 'health',
  debts: 'debts',
  goals: 'goals',
  retirement: 'retirement',
  snapshots: 'snapshots',
} as const;
export type StoreKey = (typeof KEYS)[keyof typeof KEYS];

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const isStr = (v: unknown, max = 80): v is string => typeof v === 'string' && v.length <= max;
// Range limits match the input fields, so a hand-edited or hostile backup cannot make a planner loop for ever.
const inRange = (lo: number, hi: number) => (v: unknown): v is number => isNum(v) && v >= lo && v <= hi;
const isMoney = inRange(-1e13, 1e13);
const isPct = inRange(-100, 100);
const isAge = inRange(0, 120);
const isScore = inRange(0, 100);

export const isHealthInput = (v: unknown): v is HealthInput =>
  isObj(v) &&
  ['monthlyIncome', 'monthlyExpenses', 'monthlyDebtPayments', 'emergencyFund', 'costlyDebt', 'investments', 'lifeCover'].every((k) => isMoney(v[k])) &&
  isAge(v.age) &&
  inRange(0, 50)(v.dependents) &&
  typeof v.hasHealthCover === 'boolean';

export const isDebt = (v: unknown): v is Debt =>
  isObj(v) && isStr(v.id) && isStr(v.name) && isMoney(v.balance) && isPct(v.aprPct) && isMoney(v.minPayment);
export const isDebtList = (v: unknown): v is Debt[] => Array.isArray(v) && v.length <= 50 && v.every(isDebt);

export const isGoal = (v: unknown): v is Goal =>
  isObj(v) && isStr(v.id) && isStr(v.name) && isMoney(v.costToday) && isMoney(v.currentSavings) && inRange(0, 100)(v.years) &&
  isPct(v.inflationPct) && isPct(v.returnPct) && (v.stepUpPct === undefined || isPct(v.stepUpPct));
export const isGoalList = (v: unknown): v is Goal[] => Array.isArray(v) && v.length <= 50 && v.every(isGoal);

export const isRetirementInput = (v: unknown): v is RetirementInput =>
  isObj(v) &&
  ['currentAge', 'retireAge', 'planToAge'].every((k) => isAge(v[k])) &&
  ['currentSavings', 'monthlySaving', 'yearlySpendingToday'].every((k) => isMoney(v[k])) &&
  ['inflationPct', 'returnPct', 'retiredReturnPct', 'volatilityPct'].every((k) => isPct(v[k]));

/** A saved health-check result (Pro): date, score and the pillar scores, nothing else. */
export interface Snapshot {
  at: string;
  score: number;
  pillars: Record<string, number>;
  currency: string;
  netWorth: number;
}
export const isSnapshot = (v: unknown): v is Snapshot =>
  isObj(v) && isStr(v.at, 40) && isScore(v.score) && isObj(v.pillars) &&
  Object.keys(v.pillars).length <= 20 && Object.values(v.pillars).every(isScore) && isStr(v.currency, 3) && isMoney(v.netWorth);
export const isSnapshotList = (v: unknown): v is Snapshot[] => Array.isArray(v) && v.length <= 500 && v.every(isSnapshot);

export const STORE_VALIDATORS: Record<StoreKey, (v: unknown) => boolean> = {
  health: isHealthInput,
  debts: isDebtList,
  goals: isGoalList,
  retirement: isRetirementInput,
  snapshots: isSnapshotList,
};

/** Backup file: every saved plan, versioned. */
export interface Backup {
  app: 'finealth';
  version: 1;
  exportedAt: string;
  data: Partial<Record<StoreKey, unknown>>;
}

export type ParsedBackup = { ok: true; sections: Partial<Record<StoreKey, unknown>> } | { ok: false; message: string };

/** Checks a backup file and keeps only the valid sections. Writing them is the caller's job. */
export function parseBackup(json: string): ParsedBackup {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, message: 'That file is not a Finealth backup (it is not valid JSON).' };
  }
  if (!isObj(parsed) || parsed.app !== 'finealth' || parsed.version !== 1 || !isObj(parsed.data)) {
    return { ok: false, message: 'That file is not a Finealth backup.' };
  }
  const sections: Partial<Record<StoreKey, unknown>> = {};
  for (const k of Object.values(KEYS)) {
    const v = (parsed.data as Record<string, unknown>)[k];
    if (v !== undefined && STORE_VALIDATORS[k](v)) sections[k] = v;
  }
  return Object.keys(sections).length ? { ok: true, sections } : { ok: false, message: 'The backup had nothing we could restore.' };
}
