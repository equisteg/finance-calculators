/**
 * Glassy icon tiles: a gradient glass square with a soft top highlight and a
 * white line glyph inside it. The glyph is always sized relative to the tile,
 * so it can never spill out of its box. Original artwork, drawn for Finealth.
 */
import type { CSSProperties } from 'react';

const GLYPHS = {
  health: ['M20.5 8.8a4.8 4.8 0 0 0-8.5-3 4.8 4.8 0 0 0-8.5 3c0 5.2 8.5 10.2 8.5 10.2s8.5-5 8.5-10.2Z', 'M4 12h3.5l1.8-2.8 2.8 5.6 1.8-2.8H20'],
  debt: ['M3.5 6.5h17a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-17a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Z', 'M2.5 10h19', 'M6.5 14.5h4'],
  goal: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Z', 'M12 12.8a.8.8 0 1 0 0-1.6.8.8 0 0 0 0 1.6Z'],
  retirement: ['M3.5 18.5h17', 'M7 18.5a5 5 0 0 1 10 0', 'M12 4.5v2.5', 'M5.3 10.3l1.8 1.8', 'M18.7 10.3l-1.8 1.8', 'M3.5 15h1.8', 'M18.7 15h1.8'],
  // Calendar with fast-forward arrows: pay early, finish sooner.
  prepay: ['M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19V7A1.5 1.5 0 0 1 5 5.5Z', 'M3.5 9.5h17', 'M8 3.5v4', 'M16 3.5v4', 'M8.5 12.5l3 2.5-3 2.5', 'M12.5 12.5l3 2.5-3 2.5'],
  calculator: ['M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z', 'M8.5 7h7', 'M8.5 11.5h.01', 'M12 11.5h.01', 'M15.5 11.5h.01', 'M8.5 15h.01', 'M12 15h.01', 'M15.5 15v2.5', 'M8.5 18h.01', 'M12 18h.01'],
  grid: ['M4 4h6.5v6.5H4z', 'M13.5 4H20v6.5h-6.5z', 'M4 13.5h6.5V20H4z', 'M13.5 13.5H20V20h-6.5z'],
  gem: ['M7 4h10l4 5-9 11L3 9l4-5Z', 'M3 9h18', 'M9.5 4 12 9l2.5-5', 'M12 9v11'],
  receipt: ['M6 3h12v18l-2.5-1.6L13 21l-2.5-1.6L8 21l-2-1.6V3Z', 'M9 8h6', 'M9 12h6', 'M9 16h3.5'],
  coins: ['M12 4.5c4.1 0 7.5 1.2 7.5 2.8s-3.4 2.8-7.5 2.8-7.5-1.2-7.5-2.8S7.9 4.5 12 4.5Z', 'M4.5 7.3V12c0 1.6 3.4 2.8 7.5 2.8s7.5-1.2 7.5-2.8V7.3', 'M4.5 12v4.7c0 1.6 3.4 2.8 7.5 2.8s7.5-1.2 7.5-2.8V12'],
  home: ['M3.5 11 12 4l8.5 7', 'M5.5 9.6V20h13V9.6', 'M10 20v-5.5h4V20'],
  wallet: ['M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3', 'M4 7.5V18a2 2 0 0 0 2 2h14V9H6.5A2.5 2.5 0 0 1 4 7.5Z', 'M16 14.5h.01'],
  briefcase: ['M4 7.5h16a1 1 0 0 1 1 1V19a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8.5a1 1 0 0 1 1-1Z', 'M9 7.5V5.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2', 'M3 13h18'],
  globe: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M3 12h18', 'M12 3c2.4 2.5 3.6 5.5 3.6 9s-1.2 6.5-3.6 9', 'M12 3c-2.4 2.5-3.6 5.5-3.6 9s1.2 6.5 3.6 9'],
  trend: ['M3 17l6-6 4 4 8-8', 'M15 7h6v6'],
  chart: ['M4.5 11h3v9h-3z', 'M10.5 5h3v15h-3z', 'M16.5 14h3v6h-3z', 'M3 20h18'],
  shield: ['M12 3l7.5 3v5.5c0 4.6-3.2 7.8-7.5 9.5-4.3-1.7-7.5-4.9-7.5-9.5V6L12 3Z', 'M9 12l2.2 2.2L15.5 10'],
  spark: ['M12 3.5l2.2 5.8 5.8 2.2-5.8 2.2L12 19.5l-2.2-5.8L4 11.5l5.8-2.2L12 3.5Z'],
  plan: ['M8 4h8a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z', 'M9.5 4h5v2.5h-5z', 'M9 11.5h6', 'M9 15.5h4'],
  percent: ['M19 5 5 19', 'M6.5 8.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z', 'M17.5 19.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z'],
  scale: ['M12 4v16', 'M7 20h10', 'M5 7h14', 'M5 7l-2.5 6a3 3 0 0 0 5 0L5 7Z', 'M19 7l-2.5 6a3 3 0 0 0 5 0L19 7Z'],
  clock: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M12 7v5l3 2'],
  key: ['M14.5 10.5a4 4 0 1 0-3.4 3.9L9 16.5H7v2H5v2H3v-2.4l6.1-6.1A4 4 0 0 1 14.5 10.5Z', 'M15.5 8.5h.01'],
  info: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M12 11v5.5', 'M12 7.5h.01'],
  bank: ['M3.5 9.5 12 4l8.5 5.5', 'M4.5 9.5h15', 'M6.5 10.5v6.5', 'M10.5 10.5v6.5', 'M13.5 10.5v6.5', 'M17.5 10.5v6.5', 'M3.5 19.5h17'],
  gold: ['M8 5.5h8l2 5H6Z', 'M4.5 13h7l1.5 5.5H3Z', 'M12.5 13h7l1.5 5.5H11Z'],
  tax: ['M6 3h12v18l-2.5-1.6L13 21l-2.5-1.6L8 21l-2-1.6V3Z', 'M9.5 14.5l5-6', 'M9.8 9h.01', 'M14.2 14h.01'],
  tag: ['M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7a1 1 0 0 1 .7.3l7.6 7.6a1 1 0 0 1 0 1.4l-7.7 7.7a1 1 0 0 1-1.4 0l-7.6-7.6a1 1 0 0 1-.3-.7Z', 'M8 8h.01'],
  inflation: ['M10 20.5a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z', 'M18 11.5v-8', 'M15 6.5l3-3 3 3', 'M8 14.5h4'],
  hourglass: ['M6.5 3.5h11', 'M6.5 20.5h11', 'M7.5 3.5c0 4 4.5 5.5 4.5 8.5s-4.5 4.5-4.5 8.5', 'M16.5 3.5c0 4-4.5 5.5-4.5 8.5s4.5 4.5 4.5 8.5'],
  piggy: ['M5 11.5c0-3.3 3.1-5.5 7-5.5 1.5 0 2.9.3 4 .9l2.5-1.4-.4 3a5 5 0 0 1 1.4 2h1.5v3.5h-1.7a6.6 6.6 0 0 1-2.3 2.5v2.5h-2.5v-1.4a9 9 0 0 1-3 0v1.4H9v-2a5.6 5.6 0 0 1-4-6Z', 'M10 8.8h3', 'M16.5 10.8h.01'],
  stamp: ['M9.5 10.5V8a2.5 2.5 0 1 1 5 0v2.5', 'M5 14a3.5 3.5 0 0 1 3.5-3.5h7A3.5 3.5 0 0 1 19 14v2H5Z', 'M5.5 19.5h13'],
  pie: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M12 3v9l7.8 4.5'],
} as const;

/** Soft filled layer under the line glyph (duotone), so icons read as solid objects rather than thin outlines. */
const FILLS: Partial<Record<keyof typeof GLYPHS, string[]>> = {
  health: ['M20.5 8.8a4.8 4.8 0 0 0-8.5-3 4.8 4.8 0 0 0-8.5 3c0 5.2 8.5 10.2 8.5 10.2s8.5-5 8.5-10.2Z'],
  debt: ['M3.5 6.5h17a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-17a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Z'],
  goal: ['M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Z'],
  retirement: ['M7 18.5a5 5 0 0 1 10 0Z'],
  prepay: ['M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v2.5h-17V7A1.5 1.5 0 0 1 5 5.5Z'],
  calculator: ['M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z'],
  grid: ['M4 4h6.5v6.5H4z', 'M13.5 13.5H20V20h-6.5z'],
  gem: ['M7 4h10l4 5-9 11L3 9l4-5Z'],
  receipt: ['M6 3h12v18l-2.5-1.6L13 21l-2.5-1.6L8 21l-2-1.6V3Z'],
  coins: ['M12 4.5c4.1 0 7.5 1.2 7.5 2.8s-3.4 2.8-7.5 2.8-7.5-1.2-7.5-2.8S7.9 4.5 12 4.5Z'],
  home: ['M5.5 9.6V20h13V9.6L12 4.8Z'],
  wallet: ['M4 7.5V18a2 2 0 0 0 2 2h14V9H6.5A2.5 2.5 0 0 1 4 7.5Z'],
  briefcase: ['M4 7.5h16a1 1 0 0 1 1 1V19a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8.5a1 1 0 0 1 1-1Z'],
  globe: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z'],
  trend: ['M3 17l6-6 4 4 8-8V20H3Z'],
  chart: ['M4.5 11h3v9h-3z', 'M10.5 5h3v15h-3z', 'M16.5 14h3v6h-3z'],
  shield: ['M12 3l7.5 3v5.5c0 4.6-3.2 7.8-7.5 9.5-4.3-1.7-7.5-4.9-7.5-9.5V6L12 3Z'],
  spark: ['M12 3.5l2.2 5.8 5.8 2.2-5.8 2.2L12 19.5l-2.2-5.8L4 11.5l5.8-2.2L12 3.5Z'],
  plan: ['M8 4h8a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z'],
  percent: ['M6.5 8.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z', 'M17.5 19.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z'],
  clock: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z'],
  key: ['M14.5 10.5a4 4 0 1 0-3.4 3.9L9 16.5H7v2H5v2H3v-2.4l6.1-6.1A4 4 0 0 1 14.5 10.5Z'],
  info: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z'],
  bank: ['M3.5 9.5 12 4l8.5 5.5Z'],
  gold: ['M8 5.5h8l2 5H6Z', 'M4.5 13h7l1.5 5.5H3Z', 'M12.5 13h7l1.5 5.5H11Z'],
  tax: ['M6 3h12v18l-2.5-1.6L13 21l-2.5-1.6L8 21l-2-1.6V3Z'],
  tag: ['M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7a1 1 0 0 1 .7.3l7.6 7.6a1 1 0 0 1 0 1.4l-7.7 7.7a1 1 0 0 1-1.4 0l-7.6-7.6a1 1 0 0 1-.3-.7Z'],
  inflation: ['M10 20.5a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z'],
  hourglass: ['M9 19.5c.6-2 3-3 3-4.5 0 1.5 2.4 2.5 3 4.5Z', 'M9.5 6.5h5c-.6 1.5-2.5 2.6-2.5 3.5 0-.9-1.9-2-2.5-3.5Z'],
  piggy: ['M5 11.5c0-3.3 3.1-5.5 7-5.5 1.5 0 2.9.3 4 .9l2.5-1.4-.4 3a5 5 0 0 1 1.4 2h1.5v3.5h-1.7a6.6 6.6 0 0 1-2.3 2.5v2.5h-2.5v-1.4a9 9 0 0 1-3 0v1.4H9v-2a5.6 5.6 0 0 1-4-6Z'],
  stamp: ['M5 14a3.5 3.5 0 0 1 3.5-3.5h7A3.5 3.5 0 0 1 19 14v2H5Z'],
  pie: ['M12 3a9 9 0 0 1 7.8 13.5L12 12Z'],
};

export type GlyphName = keyof typeof GLYPHS;

const TONES = {
  // Earth tones (v10): each tile is a warm gradient deep enough for the white glyph.
  terra: ['#d4683fdd', '#8f3d20cc', '#c8653f88'],
  emerald: ['#7fa56fdd', '#3f5c3acc', '#6f9a6288'],
  teal: ['#5e9a8bdd', '#2f5c52cc', '#4e8a7a88'],
  sky: ['#6f8fafdd', '#3b5670cc', '#5b7a9988'],
  violet: ['#9a7a9add', '#5a3f5acc', '#8a6a8a88'],
  amber: ['#d9a441dd', '#8a6214cc', '#c8943388'],
  rose: ['#c8553fdd', '#7a281ecc', '#b4473a88'],
  cyan: ['#6b9aa3dd', '#355a62cc', '#5b8a9388'],
  slate: ['#a39888bb', '#5c544bbb', '#8e847677'],
} as const;

export type Tone = keyof typeof TONES;

export function GlassIcon({ name, tone = 'emerald', size = 40, label }: { name: GlyphName; tone?: Tone; size?: number; label?: string }) {
  const [a, b, glow] = TONES[tone];
  const style = { width: size, height: size, '--gi-a': a, '--gi-b': b, '--gi-glow': glow } as CSSProperties;
  return (
    <span className="gicon" style={style} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        {(FILLS[name] ?? []).map((d) => (
          <path key={'f' + d} d={d} fill="currentColor" fillOpacity={0.3} stroke="none" />
        ))}
        {GLYPHS[name].map((d) => (
          <path key={d} d={d} />
        ))}
      </svg>
    </span>
  );
}

/** Icon and colour for each area of the product, used by the nav, index and page headers. */
export const AREA_ICON: Record<string, { name: GlyphName; tone: Tone }> = {
  '/health-check/': { name: 'health', tone: 'emerald' },
  '/debt-payoff/': { name: 'debt', tone: 'rose' },
  '/goal-planner/': { name: 'goal', tone: 'violet' },
  '/retirement-planner/': { name: 'retirement', tone: 'amber' },
  '/loan-prepayment/': { name: 'prepay', tone: 'sky' },
  '/my-plan/': { name: 'plan', tone: 'teal' },
  '/': { name: 'calculator', tone: 'cyan' },
  '/quick-calculators/': { name: 'calculator', tone: 'cyan' },
  '/tools/': { name: 'grid', tone: 'teal' },
  '/pricing/': { name: 'gem', tone: 'amber' },
  '/pro/': { name: 'key', tone: 'amber' },
};

export const CATEGORY_ICON: Record<string, { name: GlyphName; tone: Tone }> = {
  'Tax & salary': { name: 'tax', tone: 'amber' },
  'Saving & investing': { name: 'coins', tone: 'emerald' },
  Borrowing: { name: 'debt', tone: 'rose' },
  Housing: { name: 'home', tone: 'sky' },
  Everyday: { name: 'wallet', tone: 'violet' },
  Business: { name: 'briefcase', tone: 'cyan' },
};

/** A more specific glyph for some tools; others use their category's icon. */
export function toolIcon(slug: string, category: string): { name: GlyphName; tone: Tone } {
  const base = CATEGORY_ICON[category] ?? { name: 'calculator', tone: 'slate' };
  // First match wins, so the most specific patterns come first.
  const rules: Array<[RegExp, GlyphName]> = [
    [/world-vat/, 'globe'],
    [/sales-tax/, 'tag'],
    [/stamp-duty/, 'stamp'],
    [/hra|rent-vs-buy/, 'home'],
    [/inflation/, 'inflation'],
    [/cagr|real-return/, 'trend'],
    [/rule-of-72/, 'hourglass'],
    [/xirr|npv/, 'chart'],
    [/retirement/, 'retirement'],
    [/emergency/, 'shield'],
    [/budget-50/, 'pie'],
    [/net-worth|break-even|affordability/, 'scale'],
    [/discount|margin|tip/, 'tag'],
    [/percentage|flat-rate|simple-interest/, 'percent'],
    [/credit-card/, 'debt'],
    [/true-cost/, 'receipt'],
    [/savings-goal/, 'goal'],
    [/ppf/, 'piggy'],
    [/recurring/, 'bank'],
    [/gratuity/, 'briefcase'],
    [/salary/, 'wallet'],
  ];
  const hit = rules.find(([re]) => re.test(slug));
  return hit ? { name: hit[1], tone: base.tone } : base;
}
