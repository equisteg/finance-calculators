import { describe, expect, it } from 'vitest';
import { exampleDebts, isDebtList, KEYS, STORE_PREFIX } from '@finealth/finance-core';
import { APP_TOOLS, APP_TOOL_BY_SLUG, CATEGORIES, TOOLS } from '@finealth/finance-core/catalog';
import { makeFmt } from '../src/lib/fmt';
import { createStore, type Backend } from '../src/lib/store';

function memoryBackend(seed: Record<string, string> = {}): Backend & { data: Map<string, string> } {
  const data = new Map(Object.entries(seed));
  return {
    data,
    multiGet: async (keys) => keys.map((k) => [k, data.get(k) ?? null] as const),
    setItem: async (k, v) => void data.set(k, v),
    multiRemove: async (keys) => keys.forEach((k) => data.delete(k)),
  };
}

describe('on-device store (TC-M-DATA-001..003)', () => {
  it('loads saved values, validates them and falls back on junk', async () => {
    const b = memoryBackend({ [STORE_PREFIX + KEYS.debts]: JSON.stringify(exampleDebts('INR')), [STORE_PREFIX + KEYS.goals]: '{bad json' });
    const s = createStore(b);
    await s.ready;
    expect(s.get(KEYS.debts, null, isDebtList)).toHaveLength(3);
    expect(s.get(KEYS.goals, 'fallback', (v): v is string => typeof v === 'string')).toBe('fallback');
    expect(s.getSettings().currency).toBe('INR');
  });

  it('backup → restore round-trips in the web format; foreign files are refused', async () => {
    const a = createStore(memoryBackend());
    await a.ready;
    a.set(KEYS.debts, exampleDebts('USD'));
    const file = JSON.stringify(a.exportBackup(new Date('2026-11-11T00:00:00Z')));
    const b = createStore(memoryBackend());
    await b.ready;
    expect(b.importBackup(file)).toEqual({ ok: true, restored: ['debts'] });
    expect(b.get(KEYS.debts, null, isDebtList)).toEqual(exampleDebts('USD'));
    expect(b.importBackup('{"app":"other"}').ok).toBe(false);
    expect(b.importBackup('not json').ok).toBe(false);
  });

  it('delete all removes every saved plan from disk', async () => {
    const be = memoryBackend();
    const s = createStore(be);
    await s.ready;
    s.set(KEYS.debts, exampleDebts('INR'));
    await new Promise((r) => setTimeout(r, 0));
    await s.clearAll();
    expect([...be.data.keys()].filter((k) => k !== STORE_PREFIX + 'settings')).toEqual([]);
    expect(s.get(KEYS.debts, null, isDebtList)).toBeNull();
  });
});

describe('calculator list in the app (TC-M-CALC-001)', () => {
  it('lists every web tool plus the app extras, with unique slugs and known categories', () => {
    expect(APP_TOOLS.length).toBe(TOOLS.length + 6);
    expect(new Set(APP_TOOLS.map((t) => t.slug)).size).toBe(APP_TOOLS.length);
    for (const t of APP_TOOLS) expect(CATEGORIES).toContain(t.category);
  });

  it('every tool computes its defaults without throwing, in INR and USD', () => {
    for (const cur of ['INR', 'USD']) {
      const f = makeFmt(cur);
      for (const t of APP_TOOLS) {
        const v = Object.fromEntries(t.fields.map((x) => [x.key, cur === 'INR' && !t.currency && x.inr !== undefined ? x.inr : x.def]));
        const r = t.compute(v, f);
        expect(r.rows.length, t.slug).toBeGreaterThan(0);
      }
    }
  });

  it('golden: EMI ₹25,00,000 at 8.75 % for 20 years = ₹22,093 a month', () => {
    const t = APP_TOOL_BY_SLUG['emi-calculator'];
    const r = t.compute({ principal: 2_500_000, rate: 8.75, years: 20 }, makeFmt('INR'));
    expect(r.rows[0].value).toBe('₹22,093');
  });

  it('golden: SIP ₹10,000 a month at 12 % for 10 years matures at ₹23,23,391', () => {
    const t = APP_TOOL_BY_SLUG['sip-calculator'];
    const r = t.compute({ monthly: 10_000, rate: 12, years: 10, stepUp: 0 }, makeFmt('INR'));
    expect(r.rows[0].value).toBe('₹23,23,391');
  });
});
