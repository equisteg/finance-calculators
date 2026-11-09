'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { formatMoney } from '@finealth/finance-core';
import { useCurrency } from '@/app/context/CurrencyContext';
import AdSenseBanner from './AdSenseBanner';
import { ADSENSE_CLIENT, AD_SLOTS } from '@/lib/ads';
import { usePro } from './ProProvider';
import { GlassIcon, type GlyphName, type Tone } from './GlassIcon';

export type Money = (n: number) => string;

const SUPPORTED = ['INR', 'USD', 'EUR', 'GBP'] as const;
export type ToolCurrency = (typeof SUPPORTED)[number];

/** The site-wide currency and a matching money formatter. */
export function useMoney(): { currency: ToolCurrency; money: Money } {
  const { baseCurrency } = useCurrency();
  const currency = (SUPPORTED as readonly string[]).includes(baseCurrency) ? (baseCurrency as ToolCurrency) : 'INR';
  return { currency, money: (n: number) => formatMoney(n, currency) };
}

export interface Kpi {
  label: string;
  value: string;
  tone?: 'ok' | 'bad' | 'pro';
}

/**
 * Closes the gaps at the end of grid rows: for every `.fieldgrid` and `.fitgrid` inside `root`, picks the column count
 * that leaves the fewest empty cells and stretches the last item of each run across what is left.
 */
export function fitRows(root: ParentNode): void {
  root.querySelectorAll<HTMLElement>('.fieldgrid, .fitgrid').forEach((el) => {
    const kids = Array.from(el.children) as HTMLElement[];
    kids.forEach((c) => {
      if (c.dataset.fit) {
        c.style.gridColumn = '';
        delete c.dataset.fit;
      }
    });
    el.style.gridTemplateColumns = '';
    if (!kids.length) return;
    const css = getComputedStyle(el);
    const tracks = css.gridTemplateColumns.split(' ').filter(Boolean);
    const max = Math.max(1, tracks.length);
    const full = (c: HTMLElement) => getComputedStyle(c).gridColumnStart === '1' && getComputedStyle(c).gridColumnEnd === '-1';
    const stretch = (run: HTMLElement[], cols: number) => {
      const spare = (cols - (run.length % cols)) % cols;
      if (run.length && spare) {
        const last = run[run.length - 1];
        last.style.gridColumn = `span ${spare + 1}`;
        last.dataset.fit = '1';
      }
    };
    if (kids.some(full)) {
      let run: HTMLElement[] = [];
      for (const c of kids) {
        if (full(c)) {
          stretch(run, max);
          run = [];
        } else run.push(c);
      }
      stretch(run, max);
      return;
    }
    const rows = Math.ceil(kids.length / max);
    const cols = Math.ceil(kids.length / rows);
    el.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
    stretch(kids, cols);
  });
}

function useFitRows() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root || typeof ResizeObserver === 'undefined') return;
    let raf = 0;
    const run = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => fitRows(root));
    };
    const ro = new ResizeObserver(run);
    ro.observe(root);
    const mo = new MutationObserver(run);
    mo.observe(root, { childList: true, subtree: true });
    run();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
    };
  }, []);
  return ref;
}

/** Frame for every planning tool: heading with key figures, the tool, the disclaimer, then one ad slot below the result. */
export function ToolPage(props: {
  eyebrow: string;
  title: string;
  intro: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  icon?: { name: GlyphName; tone: Tone };
  kpis?: Kpi[];
}) {
  const ref = useFitRows();
  return (
    <div className="fade-up" ref={ref}>
      <div className="tool-head glass glass-strong p-5 sm:p-6 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-start gap-4 min-w-0">
          {props.icon && (
            <span className="hidden sm:inline-grid shrink-0">
              <GlassIcon name={props.icon.name} tone={props.icon.tone} size={56} />
            </span>
          )}
          <div className="min-w-0">
            <span className="eyebrow block mb-1.5">{props.eyebrow}</span>
            <h1 className="heading-xl">{props.title}</h1>
            <div className="text-zinc-400 mt-2 max-w-2xl leading-relaxed">{props.intro}</div>
          </div>
        </div>
        {(props.actions || props.kpis?.length) && (
          <div className="flex flex-col gap-3 md:items-end md:w-[min(26rem,45%)] shrink-0 min-w-0">
            {props.kpis && props.kpis.length > 0 && (
              <div className="kpis fitgrid w-full" data-testid="tool-kpis">
                {props.kpis.map((k) => (
                  <div key={k.label} className={`kpi ${k.tone ?? ''}`}>
                    <span className="kpi-label">{k.label}</span>
                    <b>{k.value}</b>
                  </div>
                ))}
              </div>
            )}
            {props.actions && <div className="no-print flex flex-wrap gap-2 md:justify-end">{props.actions}</div>}
          </div>
        )}
      </div>
      {props.children}
      <Disclaimer />
      <AdSenseBanner client={ADSENSE_CLIENT} slot={AD_SLOTS.calculator} />
    </div>
  );
}

/** Shown under every result (finance category rule): readable size and contrast, never hidden. */
export function Disclaimer() {
  return (
    <div className="notice notice-warn mt-8 text-sm flex items-start gap-3" data-testid="disclaimer">
      <GlassIcon name="info" tone="amber" size={32} />
      <p className="m-0 min-w-0 leading-relaxed">
        <strong>Information only.</strong> These are estimates from the numbers you entered and common rules of thumb. They
        are not financial, tax, investment or legal advice, may contain errors, and tax rates and rules change. Check important
        decisions with the official source or a qualified professional. <Link href="/terms/" className="underline">Terms</Link>
      </p>
    </div>
  );
}

export function Panel(props: { title?: string; children: ReactNode; className?: string; testId?: string }) {
  return (
    <section className={`card p-5 sm:p-6 min-w-0 ${props.className ?? ''}`} data-testid={props.testId}>
      {props.title && <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400 mb-4">{props.title}</h2>}
      {props.children}
    </section>
  );
}

/** Number input that accepts typing freely and reports a finite number (empty = 0). */
export function NumberField(props: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  hint?: string;
  suffix?: string;
  prefix?: string;
  min?: number;
  max?: number;
  step?: number;
  testId?: string;
}) {
  const id = useId();
  return (
    <div className="nf">
      <label htmlFor={id} className="label">
        {props.label}
      </label>
      <div className="relative">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          className={`input tabular-nums ${props.suffix ? '!pr-9' : ''} ${props.prefix ? '!pl-7' : ''}`}
          value={Number.isFinite(props.value) ? props.value : 0}
          min={props.min ?? 0}
          max={props.max}
          step={props.step ?? 'any'}
          onChange={(e) => {
            const n = e.target.value === '' ? 0 : Number(e.target.value);
            props.onChange(Number.isFinite(n) ? n : 0);
          }}
          aria-describedby={props.hint ? `${id}-hint` : undefined}
          data-testid={props.testId}
        />
        {props.prefix && <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">{props.prefix}</span>}
        {props.suffix && <span aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">{props.suffix}</span>}
      </div>
      {props.hint ? (
        <p id={`${id}-hint`} className="hint">
          {props.hint}
        </p>
      ) : (
        <span aria-hidden="true" />
      )}
    </div>
  );
}

export function Stat(props: { label: string; value: string; tone?: 'ok' | 'warn' | 'bad'; testId?: string; sub?: string }) {
  const tone = props.tone === 'ok' ? 'text-emerald-300' : props.tone === 'warn' ? 'text-amber-300' : props.tone === 'bad' ? 'text-red-300' : 'text-white';
  return (
    <div className="stat">
      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400 block leading-snug">{props.label}</span>
      <span className={`stat-value ${tone}`} data-testid={props.testId}>
        {props.value}
      </span>
      {props.sub && <span className="block mt-1 text-xs text-zinc-400 leading-snug">{props.sub}</span>}
    </div>
  );
}

/** Locked Pro content: says what it is and how to get it. Never shows fake or blurred numbers. */
export function ProGate(props: { feature: string; detail: string; children: ReactNode; testId?: string }) {
  const { isPro, status } = usePro();
  if (isPro) return <>{props.children}</>;
  if (status.state === 'checking') return <div className="card p-6 min-h-[160px] animate-pulse" aria-busy="true" />;
  return (
    <div className="card p-6 !border-amber-300/30 flex flex-col sm:flex-row sm:items-start gap-4" data-testid={props.testId ?? 'pro-gate'}>
      <GlassIcon name="spark" tone="amber" size={44} />
      <div className="min-w-0 flex-1">
      <span className="pill pill-pro">Pro</span>
      <h3 className="mt-3 text-lg font-bold text-white">{props.feature}</h3>
      <p className="mt-1 text-zinc-400">{props.detail}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/pricing/" className="btn btn-primary">
          See Pro plans
        </Link>
        <Link href="/pro/" className="btn btn-ghost">
          I already have Pro
        </Link>
      </div>
      </div>
    </div>
  );
}

/** 0-100 score ring. */
export function ScoreRing({ score, label }: { score: number; label: string }) {
  const r = 56;
  const c = 2 * Math.PI * r;
  const s = Math.max(0, Math.min(100, score));
  const colour = s >= 80 ? '#34d399' : s >= 60 ? '#a3e635' : s >= 40 ? '#fbbf24' : '#f87171';
  return (
    <figure className="relative w-40 h-40 shrink-0" role="img" aria-label={`Score ${s} out of 100, ${label}`}>
      <svg className="w-full h-full -rotate-90" viewBox="0 0 140 140" aria-hidden="true">
        <circle cx="70" cy="70" r={r} stroke="#27272a" strokeWidth="14" fill="none" />
        <circle cx="70" cy="70" r={r} stroke={colour} strokeWidth="14" fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (s / 100) * c} />
      </svg>
      <figcaption className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-black font-serif tabular-nums text-white" data-testid="health-score">
          {s}
        </span>
        <span className="text-xs uppercase tracking-wider text-zinc-400">{label}</span>
      </figcaption>
    </figure>
  );
}

/** Simple line chart (one or more series over the same x range). */
export function LineChart(props: {
  series: { name: string; colour: string; points: number[] }[];
  xLabel: (i: number) => string;
  yLabel: (v: number) => string;
  ariaLabel: string;
}) {
  const W = 640;
  const H = 220;
  const pad = { l: 8, r: 8, t: 12, b: 24 };
  const n = Math.max(...props.series.map((s) => s.points.length), 2);
  const max = Math.max(1, ...props.series.flatMap((s) => s.points));
  const x = (i: number) => pad.l + (i / (n - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - v / max) * (H - pad.t - pad.b);
  const ticks = [0, Math.floor((n - 1) / 2), n - 1];
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={props.ariaLabel}>
        <line x1={pad.l} x2={W - pad.r} y1={y(0)} y2={y(0)} stroke="#3f3f46" />
        {props.series.map((s) => (
          <polyline key={s.name} fill="none" stroke={s.colour} strokeWidth="2.5" points={s.points.map((v, i) => `${x(i)},${y(v)}`).join(' ')} />
        ))}
        {ticks.map((t) => (
          <text key={t} x={x(t)} y={H - 6} fill="#a1a1aa" fontSize="11" textAnchor={t === 0 ? 'start' : t === n - 1 ? 'end' : 'middle'}>
            {props.xLabel(t)}
          </text>
        ))}
        <text x={pad.l + 4} y={pad.t + 10} fill="#a1a1aa" fontSize="11">
          {props.yLabel(max)}
        </text>
      </svg>
      <figcaption className="flex flex-wrap gap-4 mt-2 text-xs uppercase tracking-wider text-zinc-400">
        {props.series.map((s) => (
          <span key={s.name} className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 inline-block" style={{ background: s.colour }} /> {s.name}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

/** Horizontal progress bar 0..1. */
export function Bar({ value, tone = 'ok' }: { value: number; tone?: 'ok' | 'warn' | 'bad' }) {
  const v = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  const colour = tone === 'ok' ? 'bg-emerald-400' : tone === 'warn' ? 'bg-amber-400' : 'bg-red-400';
  return (
    <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden" role="presentation">
      <div className={`h-full ${colour}`} style={{ width: `${v * 100}%` }} />
    </div>
  );
}
