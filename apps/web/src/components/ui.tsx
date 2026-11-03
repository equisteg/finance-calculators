'use client';

import Link from 'next/link';
import { useId, type ReactNode } from 'react';
import { formatMoney } from '@finealth/finance-core';
import { useCurrency } from '@/app/context/CurrencyContext';
import AdSenseBanner from './AdSenseBanner';
import { ADSENSE_CLIENT, AD_SLOTS } from '@/lib/ads';
import { usePro } from './ProProvider';

export type Money = (n: number) => string;

const SUPPORTED = ['INR', 'USD', 'EUR', 'GBP'] as const;
export type ToolCurrency = (typeof SUPPORTED)[number];

/** The site-wide currency and a matching money formatter. */
export function useMoney(): { currency: ToolCurrency; money: Money } {
  const { baseCurrency } = useCurrency();
  const currency = (SUPPORTED as readonly string[]).includes(baseCurrency) ? (baseCurrency as ToolCurrency) : 'INR';
  return { currency, money: (n: number) => formatMoney(n, currency) };
}

/** Frame for every planning tool: heading, the tool, the disclaimer, then one ad slot below the result. */
export function ToolPage(props: { eyebrow: string; title: string; intro: ReactNode; children: ReactNode; actions?: ReactNode }) {
  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/[0.08] pb-6 mb-8">
        <div>
          <span className="eyebrow block mb-2">{props.eyebrow}</span>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white">{props.title}</h1>
          <div className="text-zinc-400 mt-2 max-w-2xl">{props.intro}</div>
        </div>
        {props.actions && <div className="no-print flex flex-wrap gap-2">{props.actions}</div>}
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
    <p className="notice notice-warn mt-8 text-sm" data-testid="disclaimer">
      <strong>Information only.</strong> These are estimates from the numbers you entered and common rules of thumb. They
      are not financial, tax, investment or legal advice. Check important decisions with a qualified professional.
    </p>
  );
}

export function Panel(props: { title?: string; children: ReactNode; className?: string; testId?: string }) {
  return (
    <section className={`card p-5 sm:p-6 ${props.className ?? ''}`} data-testid={props.testId}>
      {props.title && <h2 className="text-sm font-mono uppercase tracking-wider text-zinc-400 mb-4">{props.title}</h2>}
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
  min?: number;
  max?: number;
  step?: number;
  testId?: string;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="label">
        {props.label}
      </label>
      <div className="relative">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          className={`input font-mono ${props.suffix ? 'pr-12' : ''}`}
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
        {props.suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-zinc-500">{props.suffix}</span>}
      </div>
      {props.hint && (
        <p id={`${id}-hint`} className="hint">
          {props.hint}
        </p>
      )}
    </div>
  );
}

export function Stat(props: { label: string; value: string; tone?: 'ok' | 'warn' | 'bad'; testId?: string; sub?: string }) {
  const tone = props.tone === 'ok' ? 'text-emerald-300' : props.tone === 'warn' ? 'text-amber-300' : props.tone === 'bad' ? 'text-red-300' : 'text-white';
  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
      <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block">{props.label}</span>
      <span className={`block mt-1 text-xl sm:text-2xl font-bold font-mono ${tone}`} data-testid={props.testId}>
        {props.value}
      </span>
      {props.sub && <span className="block mt-1 text-xs text-zinc-400">{props.sub}</span>}
    </div>
  );
}

/** Locked Pro content: says what it is and how to get it. Never shows fake or blurred numbers. */
export function ProGate(props: { feature: string; detail: string; children: ReactNode; testId?: string }) {
  const { isPro, status } = usePro();
  if (isPro) return <>{props.children}</>;
  if (status.state === 'checking') return <div className="card p-6 min-h-[160px] animate-pulse" aria-busy="true" />;
  return (
    <div className="card p-6 border-dashed !border-amber-400/40" data-testid={props.testId ?? 'pro-gate'}>
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
        <span className="text-4xl font-black font-mono text-white" data-testid="health-score">
          {s}
        </span>
        <span className="text-xs font-mono text-zinc-400">{label}</span>
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
      <figcaption className="flex flex-wrap gap-4 mt-2 text-xs font-mono text-zinc-400">
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
