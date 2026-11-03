import { beforeEach, describe, expect, it } from 'vitest';
import { exportBackup, importBackup, isHealthInput, load, save, STORE_PREFIX, isDebtList } from './storage';

const health = {
  monthlyIncome: 100000, monthlyExpenses: 60000, monthlyDebtPayments: 15000, emergencyFund: 225000, costlyDebt: 60000,
  investments: 1200000, age: 35, dependents: 2, lifeCover: 5000000, hasHealthCover: true,
};

describe('local storage', () => {
  beforeEach(() => localStorage.clear());

  it('round-trips valid data and rejects junk', () => {
    save('health', health);
    expect(load('health', null, isHealthInput as never)).toEqual(health);
    localStorage.setItem(STORE_PREFIX + 'health', '{"monthlyIncome":"lots"}');
    expect(load('health', 'fallback', isHealthInput as never)).toBe('fallback');
    localStorage.setItem(STORE_PREFIX + 'debts', 'not json');
    expect(load('debts', [], isDebtList)).toEqual([]);
  });

  it('exports and restores a backup, skipping invalid sections', () => {
    save('health', health);
    save('debts', [{ id: 'a', name: 'Card', balance: 1000, aprPct: 36, minPayment: 50 }]);
    const backup = exportBackup(new Date('2026-11-03T00:00:00Z'));
    localStorage.clear();
    const json = JSON.stringify({ ...backup, data: { ...backup.data, goals: [{ bad: true }] } });
    const r = importBackup(json);
    expect(r).toEqual({ ok: true, restored: ['health', 'debts'] });
    expect(JSON.parse(localStorage.getItem(STORE_PREFIX + 'health')!)).toEqual(health);
  });

  it('refuses files that are not Finealth backups', () => {
    expect(importBackup('nope').ok).toBe(false);
    expect(importBackup('{"app":"other","version":1,"data":{}}').ok).toBe(false);
  });
});
