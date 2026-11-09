import { describe, expect, it } from 'vitest';
import { formatMoney } from '@finealth/finance-core';
import { TOOLS, CATEGORIES, type Fmt, type Values } from './toolCatalog';

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
