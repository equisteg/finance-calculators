'use client';

import Link from 'next/link';
import { useMemo, type PointerEvent } from 'react';
import { financialHealth, PLAN_PRICES } from '@finealth/finance-core';
import { exampleHealth } from '../tools/HealthCheck';
import { AREA_ICON, GlassIcon, toolIcon, type GlyphName, type Tone } from '../GlassIcon';
import { TOOLS } from '@/lib/toolCatalog';
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
    <section aria-label="Plan your money" className="hero glass glass-strong fade-up mb-12 grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-center" data-testid="home-hero">
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

      <div className="hero-card parallax-slow grid gap-5 min-w-0" aria-label="Example result">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="eyebrow !text-zinc-500">Example household</span>
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
        <div className="hero-stats grid grid-cols-3 gap-2">
          <Stat label="Savings rate" value={`${Math.round(report.metrics.savingsRate * 100)} %`} tone={report.metrics.savingsRate >= 0.2 ? 'ok' : 'bad'} />
          <Stat label="Emergency fund" value={`${report.metrics.emergencyMonths.toFixed(1)} mo`} tone={report.metrics.emergencyMonths >= 6 ? 'ok' : 'bad'} />
          <Stat label="Loan payments" value={`${Math.round(report.metrics.debtToIncome * 100)} %`} />
        </div>
        {top && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.08] p-3.5">
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

const PLANNERS: Array<{ href: string; title: string; text: string; more: string; tag: string; cls: string }> = [
  { href: '/health-check/', title: 'Health Check', text: 'A score out of 100 and your next best move.', more: 'Each rule shows how many points you can still win.', tag: 'Free', cls: 'b-health' },
  { href: '/debt-payoff/', title: 'Debt Payoff', text: 'Avalanche or snowball, with a debt-free date.', more: 'See the interest you save and the order to pay each debt.', tag: 'Free · 3 debts', cls: 'b-debt' },
  { href: '/goal-planner/', title: 'Goal Planner', text: 'What each goal costs after inflation.', more: 'Monthly saving needed, with a yearly step-up.', tag: 'Free · 1 goal', cls: 'b-goals' },
  { href: '/loan-prepayment/', title: 'Loan Prepayment', text: 'Lower the EMI or finish sooner?', more: 'Both options side by side with the interest saved.', tag: 'Free', cls: 'b-prepay' },
  { href: '/retirement-planner/', title: 'Retirement', text: 'A projection for free, 1,000-run odds with Pro.', more: 'Inflation, returns and withdrawals in one picture of your later years.', tag: 'Free + Pro', cls: 'b-retire' },
  { href: '/my-plan/', title: 'My Plan', text: 'All your results on one page.', more: 'Back up everything for free; progress snapshots with Pro.', tag: 'Free + Pro', cls: 'b-plan' },
];

const RULES = ['Savings rate', 'Emergency fund', 'Debt payments', 'Costly debt', 'Retirement savings', 'Insurance'];

/** The planners as a bento grid: Health Check is the large cell, and the grid widens toward the card you point at. */
export function PlannerCards() {
  return (
    <section aria-labelledby="planners-title" className="mb-10 reveal">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <span className="eyebrow">Plan every part of your money</span>
          <h2 id="planners-title" className="font-serif text-3xl sm:text-4xl font-medium tracking-tight text-white m-0 mt-2">Six planners, one calm picture</h2>
        </div>
      </div>
      <nav aria-label="Planners" className="bento" data-testid="planner-bento">
        {PLANNERS.map((p) => {
          const icon = AREA_ICON[p.href] ?? { name: 'plan' as const, tone: 'teal' as const };
          const big = p.cls === 'b-health';
          return (
            <Link key={p.href} href={p.href} className={`card lift bento-card min-w-0 ${p.cls}`} onPointerMove={glassRim}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <GlassIcon name={icon.name} tone={icon.tone} size={big ? 56 : 44} />
                <span className="pill pill-ok !text-[10px]">{p.tag}</span>
              </div>
              <span className="min-w-0 grid gap-1.5">
                <span className={`block font-serif font-medium tracking-tight text-white ${big ? 'text-3xl sm:text-4xl' : 'text-xl'}`}>{p.title}</span>
                <span className={`block text-zinc-400 leading-snug ${big ? 'text-base max-w-sm' : 'text-sm'}`}>{p.text}</span>
                <span className="more text-sm text-zinc-500 leading-snug">{p.more}</span>
              </span>
              {big && (
                <span className="bento-rules flex flex-wrap gap-2" aria-hidden="true">
                  {RULES.map((r) => (
                    <span key={r} className="chip !text-xs !py-1 !px-2.5">
                      {r}
                    </span>
                  ))}
                </span>
              )}
              <span className="text-sm font-semibold text-brand-400" aria-hidden="true">
                Open →
              </span>
            </Link>
          );
        })}
      </nav>
    </section>
  );
}

/** Moves the soft light on a liquid-glass card to follow the pointer. */
function glassRim(e: PointerEvent<HTMLElement>) {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
}

const POPULAR = [
  'india-tax-regime-calculator',
  'world-vat-gst-calculator',
  'xirr-calculator',
  'rent-vs-buy-calculator',
  'budget-50-30-20-calculator',
  'rule-of-72',
  'ppf-calculator',
  'uk-stamp-duty-calculator',
];

/** Eight of the most useful library tools, one tap away from the home page. */
export function PopularTools() {
  const tools = POPULAR.map((slug) => TOOLS.find((t) => t.slug === slug)).filter((t): t is (typeof TOOLS)[number] => Boolean(t));
  return (
    <section className="glass p-5 sm:p-7 mb-10 reveal" aria-label="Popular calculators" data-testid="popular-tools">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <GlassIcon name="grid" tone="teal" size={34} />
          <h2 className="text-xl font-serif font-semibold text-white m-0">Popular calculators</h2>
        </div>
        <Link href="/tools/" className="text-sm font-semibold text-brand-400">
          All {TOOLS.length} tools →
        </Link>
      </div>
      <div className="fitgrid popular-grid grid gap-3">
        {tools.map((t) => {
          const icon = toolIcon(t.slug, t.category);
          return (
            <Link key={t.slug} href={`/tools/${t.slug}/`} className="card lift flex items-center gap-3 p-3.5 min-w-0">
              <GlassIcon name={icon.name} tone={icon.tone} size={40} />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-white leading-snug">{t.title}</span>
                <span className="block text-xs text-zinc-500 mt-0.5">
                  {t.region} · {t.category}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

const STEPS: Array<{ icon: GlyphName; tone: Tone; title: string; text: string }> = [
  { icon: 'wallet', tone: 'teal', title: 'Type ten numbers', text: 'Income, spending, savings and loans. They stay in your browser.' },
  { icon: 'health', tone: 'emerald', title: 'Get your score', text: 'Six rules of thumb money professionals use, scored out of 100.' },
  { icon: 'plan', tone: 'violet', title: 'Follow the plan', text: 'Ranked actions, debt order, goal savings and retirement odds.' },
];

/** Three steps from numbers to a plan. */
export function HowItWorks() {
  return (
    <section className="glass p-5 sm:p-7 mt-10 reveal" aria-label="How it works">
      <div className="flex items-center gap-3 mb-4">
        <GlassIcon name="spark" tone="terra" size={34} />
        <h2 className="text-xl font-serif font-semibold text-white m-0">How it works</h2>
      </div>
      <div className="fitgrid steps-grid grid gap-3">
        {STEPS.map((s, i) => (
          <div key={s.title} className="stat !p-5 flex items-start gap-4">
            <span className="step-num" aria-hidden="true">{i + 1}</span>
            <GlassIcon name={s.icon} tone={s.tone} size={40} />
            <div className="min-w-0">
              <span className="block font-semibold text-white">{s.title}</span>
              <span className="block text-sm text-zinc-400 mt-1 leading-snug">{s.text}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
