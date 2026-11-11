import { describe, expect, it } from 'vitest';
import { formatMoney } from './format';
import { TOOLS, CATEGORIES, TOOL_BY_SLUG, parseAmount, parseDatedFlows, parseFlows, type Fmt, type Values } from './catalog';

const fmt = (currency: string): Fmt => ({
  money: (n, d = 0) => formatMoney(n, currency, d),
  pct: (n) => (n === null ? '—' : `${n}%`),
  num: (n) => String(n),
});

const defaults = (inr: boolean) => (t: (typeof TOOLS)[number]): Values =>
  Object.fromEntries(t.fields.map((f) => [f.key, inr && !t.currency && f.inr !== undefined ? f.inr : f.def]));

describe('tools library', () => {
  it('has unique slugs and known categories', () => {
    expect(new Set(TOOLS.map((t) => t.slug)).size).toBe(TOOLS.length);
    for (const t of TOOLS) expect(CATEGORIES).toContain(t.category);
    expect(TOOLS.length).toBeGreaterThanOrEqual(35);
  });

  it.each(TOOLS.map((t) => [t.slug, t] as const))('%s computes a clean result from its defaults', (_slug, t) => {
    for (const inr of [false, true]) {
      const r = t.compute(defaults(inr)(t), fmt(t.currency ?? (inr ? 'INR' : 'USD')));
      expect(r.rows.length).toBeGreaterThan(0);
      for (const row of r.rows) expect(row.value).not.toMatch(/NaN|Infinity|undefined/);
    }
  });

  it('every tool names its source; statutory tools say what they leave out or link an official check', () => {
    for (const t of TOOLS) {
      expect(t.source.length).toBeGreaterThan(10);
      if (t.statutory) expect(Boolean(t.limits || t.official || t.slug.includes('vat') || t.slug.includes('sales-tax'))).toBe(true);
    }
  });

  it('does not cover Pakistan', () => {
    const text = JSON.stringify(TOOLS.map((t) => [t.title, t.region, t.summary, t.fields]));
    expect(text).not.toMatch(/pakistan|PKR/i);
  });

  it('survives empty and junk input', () => {
    for (const t of TOOLS) {
      const junk: Values = Object.fromEntries(t.fields.map((f) => [f.key, f.kind === 'toggle' ? false : f.kind === 'select' ? 'zz' : f.kind === 'text' ? 'abc' : 0]));
      const r = t.compute(junk, fmt(t.currency ?? 'USD'));
      for (const row of r.rows) expect(row.value).not.toMatch(/NaN|Infinity|undefined/);
    }
  });
});

describe('cash-flow parsing (review fix)', () => {
  it('keeps grouping commas inside numbers, including Indian style', () => {
    expect(parseAmount('-1,00,000')).toBe(-100000);
    expect(parseAmount('10 000.5')).toBe(10000.5);
    expect(parseAmount('abc')).toBeNull();
    expect(parseFlows('\n-10,000\n3,000;4,000\n').flows).toEqual([-10000, 3000, 4000]);
    expect(parseFlows('-10,000\nabc\n3,000').bad).toEqual([2]);
  });
  it('splits dated lines on the first comma only and reports bad lines', () => {
    const r = parseDatedFlows('2023-01-01, -1,00,000\n2026-02-30, 5\n2026-01-01, 1,20,000');
    expect(r.flows).toEqual([{ date: '2023-01-01', amount: -100000 }, { date: '2026-01-01', amount: 120000 }]);
    expect(r.bad).toEqual([2]);
  });
  it('NPV tool tells the user about lines it skipped and about multiple IRRs', () => {
    const t = TOOL_BY_SLUG['npv-irr-calculator'];
    const out = t.compute({ flows: '-100\n230\n-132\nxyz', r: 10 }, fmt('USD'));
    expect(out.note).toMatch(/Line 4/);
    expect(out.rows[1].value).toMatch(/More than one IRR/);
  });
});
