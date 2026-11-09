'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { financialHealth, PLAN_PRICES } from '@finealth/finance-core';
import { exampleHealth } from '../tools/HealthCheck';
import { AREA_ICON, GlassIcon, type GlyphName, type Tone } from '../GlassIcon';
import { ScoreRing, Stat, useMoney } from '../ui';

const TRUST: Array<{ icon: GlyphName; tone: Tone; text: string }> = [
  { icon: 'shield', tone: 'emerald', text: 'No login, no bank link' },
  { icon: 'calculator', tone: 'cyan', text: '55+ free calculators' },
  { icon: 'globe', tone: 'sky', text: 'Tax for 7 countries, VAT for 67' },
  { icon: 'gem', tone: 'amber', text: 'Pro from ₹17 a month' },
];

/** Landing hero: what Finealth does, two clear actions, and a live example result built by the real engine. */
export function HomeHero() {
  const { currency, money } = useMoney();
  const report = useMemo(() => financialHealth(exampleHealth(currency), money), [currency, money]);
  const top = report.actions[0];
  const yearly = PLAN_PRICES.find((p) => p.plan === 'pro_yearly');
  const trust = TRUST.map((t) =>
    t.icon === 'gem' && yearly ? { ...t, text: currency === 'INR' ? 'Pro from ₹17 a month' : `Pro ${yearly.intl} a year` } : t
  );

  return (
    <section aria-label="Plan your money" className="hero glass glass-strong fade-up mb-6 grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-center" data-testid="home-hero">
      <div className="grid gap-5 min-w-0 content-center">
        <span className="eyebrow">Private money check-up · free</span>
        <h1 className="heading-hero">
          Know your money&apos;s health <span className="gradient-text">in two minutes.</span>
        </h1>
        <p className="m-0 text-base sm:text-lg text-zinc-300 leading-relaxed max-w-xl">
          A score out of 100, the one change that lifts it most, and a plan for your debts, goals and retirement. Nothing you type
          leaves your device.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/health-check/" className="btn btn-primary btn-lg">
            Start free health check
          </Link>
          <Link href="/tools/" className="btn btn-secondary btn-lg">
            Browse all calculators
          </Link>
        </div>
        <ul className="fitgrid grid gap-2.5 m-0 p-0 list-none">
          {trust.map((t) => (
            <li key={t.text} className="trust-chip">
              <GlassIcon name={t.icon} tone={t.tone} size={28} />
              <span>{t.text}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="hero-card grid gap-5 min-w-0" aria-label="Example result">
        <div className="flex items-center justify-between gap-3">
          <span className="eyebrow !text-zinc-400">Example household</span>
          <span className="pill pill-ok">Live engine</span>
        </div>
        <div className="flex flex-wrap items-center gap-5">
          <ScoreRing score={report.score} label={report.grade} />
          <div className="grid gap-1.5 min-w-0 flex-1 basis-48">
            <span className="text-2xl font-serif font-semibold text-white">{report.grade}</span>
            <p className="m-0 text-sm text-zinc-400">
              Keeps <b className="text-white tabular-nums">{money(report.metrics.monthlySurplus)}</b> a month after spending and
              loan payments.
            </p>
          </div>
        </div>
        <div className="fitgrid grid gap-2.5">
          <Stat label="Savings rate" value={`${Math.round(report.metrics.savingsRate * 100)} %`} tone={report.metrics.savingsRate >= 0.2 ? 'ok' : 'bad'} />
          <Stat label="Emergency fund" value={`${report.metrics.emergencyMonths.toFixed(1)} mo`} tone={report.metrics.emergencyMonths >= 6 ? 'ok' : 'bad'} />
          <Stat label="Loan payments" value={`${Math.round(report.metrics.debtToIncome * 100)} %`} />
        </div>
        {top && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] p-3.5">
            <GlassIcon name="trend" tone="emerald" size={34} />
            <div className="min-w-0">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-300">Top priority · +{top.pointsAvailable} pts</span>
              <span className="block text-sm font-semibold text-white">{top.title}</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

const PLANNERS: Array<{ href: string; title: string; text: string; tag: string }> = [
  { href: '/health-check/', title: 'Health Check', text: 'Score out of 100 and your next best move', tag: 'Free' },
  { href: '/debt-payoff/', title: 'Debt Payoff', text: 'Avalanche or snowball, with a debt-free date', tag: 'Free · 3 debts' },
  { href: '/goal-planner/', title: 'Goal Planner', text: 'What each goal costs after inflation', tag: 'Free · 1 goal' },
  { href: '/retirement-planner/', title: 'Retirement', text: 'Projection free, 1,000-run odds with Pro', tag: 'Free + Pro' },
  { href: '/loan-prepayment/', title: 'Loan Prepayment', text: 'Lower the EMI or finish sooner?', tag: 'Free' },
];

/** The five planners as one row of cards, each with its own icon. */
export function PlannerCards() {
  return (
    <nav aria-label="Planners" className="fitgrid planner-grid grid gap-3 mb-8">
      {PLANNERS.map((p) => {
        const icon = AREA_ICON[p.href];
        return (
          <Link key={p.href} href={p.href} className="card lift planner-card grid gap-3 p-4 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <GlassIcon name={icon.name} tone={icon.tone} size={46} />
              <span className="pill pill-ok !text-[10px]">{p.tag}</span>
            </div>
            <span className="min-w-0">
              <span className="block font-semibold text-white">{p.title}</span>
              <span className="block text-xs text-zinc-400 leading-snug mt-1">{p.text}</span>
            </span>
            <span className="text-xs font-semibold text-emerald-300" aria-hidden="true">
              Open →
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
