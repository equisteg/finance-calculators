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
  prepay: ['M18.5 5.5l-13 13', 'M7.5 9.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z', 'M16.5 18.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z'],
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
  chart: ['M4 20V11', 'M10 20V5', 'M16 20v-6', 'M21 20H3'],
  shield: ['M12 3l7.5 3v5.5c0 4.6-3.2 7.8-7.5 9.5-4.3-1.7-7.5-4.9-7.5-9.5V6L12 3Z', 'M9 12l2.2 2.2L15.5 10'],
  spark: ['M12 3.5l2.2 5.8 5.8 2.2-5.8 2.2L12 19.5l-2.2-5.8L4 11.5l5.8-2.2L12 3.5Z'],
  plan: ['M8 4h8a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z', 'M9.5 4h5v2.5h-5z', 'M9 11.5h6', 'M9 15.5h4'],
  percent: ['M19 5 5 19', 'M6.5 8.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z', 'M17.5 19.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z'],
  scale: ['M12 4v16', 'M7 20h10', 'M5 7h14', 'M5 7l-2.5 6a3 3 0 0 0 5 0L5 7Z', 'M19 7l-2.5 6a3 3 0 0 0 5 0L19 7Z'],
  clock: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M12 7v5l3 2'],
  key: ['M14.5 10.5a4 4 0 1 0-3.4 3.9L9 16.5H7v2H5v2H3v-2.4l6.1-6.1A4 4 0 0 1 14.5 10.5Z', 'M15.5 8.5h.01'],
  info: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M12 11v5.5', 'M12 7.5h.01'],
} as const;

export type GlyphName = keyof typeof GLYPHS;

const TONES = {
  emerald: ['#34d399cc', '#05966999', '#10b98199'],
  teal: ['#2dd4bfcc', '#0f766e99', '#14b8a699'],
  sky: ['#38bdf8cc', '#0369a199', '#0ea5e999'],
  violet: ['#a78bfacc', '#6d28d999', '#8b5cf699'],
  amber: ['#fbbf24cc', '#b4530999', '#f59e0b99'],
  rose: ['#fb7185cc', '#be123c99', '#f43f5e99'],
  cyan: ['#22d3eecc', '#0e749099', '#06b6d499'],
  slate: ['#94a3b8aa', '#33415599', '#64748b88'],
} as const;

export type Tone = keyof typeof TONES;

export function GlassIcon({ name, tone = 'emerald', size = 40, label }: { name: GlyphName; tone?: Tone; size?: number; label?: string }) {
  const [a, b, glow] = TONES[tone];
  const style = { width: size, height: size, '--gi-a': a, '--gi-b': b, '--gi-glow': glow } as CSSProperties;
  return (
    <span className="gicon" style={style} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
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
  '/tools/': { name: 'grid', tone: 'teal' },
  '/pricing/': { name: 'gem', tone: 'amber' },
  '/pro/': { name: 'key', tone: 'amber' },
};

export const CATEGORY_ICON: Record<string, { name: GlyphName; tone: Tone }> = {
  'Tax & salary': { name: 'receipt', tone: 'amber' },
  'Saving & investing': { name: 'coins', tone: 'emerald' },
  Borrowing: { name: 'debt', tone: 'rose' },
  Housing: { name: 'home', tone: 'sky' },
  Everyday: { name: 'wallet', tone: 'violet' },
  Business: { name: 'briefcase', tone: 'cyan' },
};

/** A more specific glyph for some tools; others use their category's icon. */
export function toolIcon(slug: string, category: string): { name: GlyphName; tone: Tone } {
  const base = CATEGORY_ICON[category] ?? { name: 'calculator', tone: 'slate' };
  const rules: Array<[RegExp, GlyphName]> = [
    [/vat|gst|sales-tax/, 'globe'],
    [/inflation|cagr|real-return/, 'trend'],
    [/rule-of-72|xirr|npv/, 'chart'],
    [/retirement/, 'retirement'],
    [/emergency/, 'shield'],
    [/net-worth|break-even|rent-vs-buy/, 'scale'],
    [/percentage|discount|margin|flat-rate/, 'percent'],
    [/goal/, 'goal'],
    [/simple-interest|recurring|ppf/, 'coins'],
    [/salary|gratuity/, 'clock'],
  ];
  const hit = rules.find(([re]) => re.test(slug));
  return hit ? { name: hit[1], tone: base.tone } : base;
}
