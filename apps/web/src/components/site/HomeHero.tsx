'use client';

import Link from 'next/link';
import { useMemo, type PointerEvent, type ReactNode } from 'react';
import { exampleHealth, financialHealth, FREE_LIMITS, PLAN_PRICES, PRO_FEATURES, WORLD_VAT_RATES } from '@finealth/finance-core';
import { AREA_ICON, GlassIcon, toolIcon, type GlyphName, type Tone } from '../GlassIcon';
import { TOOLS } from '@/lib/toolCatalog';
import { ScoreRing, Stat, useMoney } from '../ui';

/*
 * Home page sections (v11 "Warm Editorial" home). Every section heading uses <SectionHead>, every section is a sibling
 * in the `.home-stack` of app/page.tsx, so spacing and heading style are the same all the way down the page. The
 * quick calculators and market prices live on their own page (/quick-calculators/); QuickAnswers links to it.
 */

/** One heading style for every home section: terracotta eyebrow, Fraunces title with one italic accent, short lede. */
export function SectionHead(props: { id: string; eyebrow: string; title: string; accent?: string; lede?: ReactNode; action?: ReactNode }) {
  return (
    <div className="section-head">
      <div className="min-w-0">
        <span className="eyebrow">{props.eyebrow}</span>
        <h2 id={props.id} className="section-title">
          {props.title}
          {props.accent && <> <span className="gradient-text">{props.accent}</span></>}
        </h2>
        {props.lede && <p className="section-lede">{props.lede}</p>}
      </div>
      {props.action}
    </div>
  );
}

const TRUST: Array<{ icon: GlyphName; tone: Tone; text: string }> = [
  { icon: 'shield', tone: 'emerald', text: 'No login, no bank link' },
  { icon: 'calculator', tone: 'cyan', text: `${TOOLS.length}+ free calculators` },
  { icon: 'globe', tone: 'sky', text: `Tax for 7 countries, VAT for ${Object.keys(WORLD_VAT_RATES).length}` },
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
    <section aria-labelledby="hero-title" className="hero glass glass-strong fade-up grid gap-8 p-6 sm:p-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-center" data-testid="home-hero">
      <div className="grid gap-5 min-w-0 content-center">
        <span className="eyebrow">Private money check-up · free</span>
        <h1 id="hero-title" className="heading-hero">
          Know your money&apos;s health <span className="gradient-text">in two minutes.</span>
        </h1>
        <p className="m-0 text-base sm:text-lg text-zinc-300 leading-relaxed max-w-xl">
          A score out of 100, the one change that lifts it most, and a plan for your debts, goals and retirement. Nothing you type
          leaves your device.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/health-check/" className="btn btn-primary btn-lg" data-testid="hero-start">
            Start free health check
          </Link>
          <Link href="/tools/" className="btn btn-secondary btn-lg" data-testid="hero-tools">
            See all calculators
          </Link>
        </div>
        <ul className="fitgrid grid gap-2.5 m-0 p-0 list-none" data-testid="hero-trust">
          {trust.map((t) => (
            <li key={t.text} className="trust-chip">
              <GlassIcon name={t.icon} tone={t.tone} size={28} />
              <span>{t.text}</span>
            </li>
          ))}
        </ul>
      </div>

      <figure className="hero-card parallax-slow grid gap-5 min-w-0 m-0" data-testid="hero-card">
        <figcaption className="flex flex-wrap items-center justify-between gap-2">
          <span className="eyebrow !text-zinc-500">Example household</span>
          <span className="pill pill-ok">Live engine</span>
        </figcaption>
        <div className="flex flex-wrap items-center gap-5">
          <ScoreRing score={report.score} label={report.grade} />
          <div className="grid gap-1.5 min-w-0 flex-1 basis-48">
            <span className="text-2xl font-serif font-semibold text-white" data-testid="hero-grade">{report.grade}</span>
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
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.08] p-3.5" data-testid="hero-top-action">
            <GlassIcon name="trend" tone="emerald" size={34} />
            <div className="min-w-0">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-300">Top priority · +{top.pointsAvailable} pts</span>
              <span className="block text-sm font-semibold text-white">{top.title}</span>
            </div>
          </div>
        )}
      </figure>
    </section>
  );
}

/** One quiet line of facts under the hero: what you get, in numbers that are true by construction. */
export function ProofStrip() {
  const facts = [
    { value: '6', label: 'planners for debts, goals and retirement' },
    { value: `${TOOLS.length}+`, label: 'calculators, free to use' },
    { value: '0', label: 'numbers sent to a server' },
    { value: '2 min', label: 'to your first score' },
  ];
  return (
    <section aria-label="Finealth in numbers" className="proof-strip" data-testid="proof-strip">
      {facts.map((f) => (
        <div key={f.label} className="proof-item">
          <span className="proof-value">{f.value}</span>
          <span className="proof-label">{f.label}</span>
        </div>
      ))}
    </section>
  );
}

const PLANNERS: Array<{ href: string; title: string; text: string; more: string; tag: string; cls: string }> = [
  { href: '/health-check/', title: 'Health Check', text: 'A score out of 100 and your next best move.', more: 'Each rule shows how many points you can still win.', tag: 'Free', cls: 'b-health' },
  { href: '/debt-payoff/', title: 'Debt Payoff', text: 'Avalanche or snowball, with a debt-free date.', more: 'See the interest you save and the order to pay each debt.', tag: `Free · ${FREE_LIMITS.debts} debts`, cls: 'b-debt' },
  { href: '/goal-planner/', title: 'Goal Planner', text: 'What each goal costs after inflation.', more: 'Monthly saving needed, with a yearly step-up.', tag: `Free · ${FREE_LIMITS.goals} goal`, cls: 'b-goals' },
  { href: '/loan-prepayment/', title: 'Loan Prepayment', text: 'Lower the EMI or finish sooner?', more: 'Both options side by side with the interest saved.', tag: 'Free', cls: 'b-prepay' },
  { href: '/retirement-planner/', title: 'Retirement', text: 'A projection for free, 1,000-run odds with Pro.', more: 'Inflation, returns and withdrawals in one picture of your later years.', tag: 'Free + Pro', cls: 'b-retire' },
  { href: '/my-plan/', title: 'My Plan', text: 'All your results on one page.', more: 'Back up everything for free; progress snapshots with Pro.', tag: 'Free + Pro', cls: 'b-plan' },
];

const RULES = ['Savings rate', 'Emergency fund', 'Debt payments', 'Costly debt', 'Retirement savings', 'Insurance'];

/** The planners as a bento grid: Health Check is the large cell, and the grid widens toward the card you point at. */
export function PlannerCards() {
  return (
    <section aria-labelledby="planners-title">
      <SectionHead
        id="planners-title"
        eyebrow="Plan every part of your money"
        title="Six planners,"
        accent="one calm picture"
        lede="Start with the health check, then open the planner for the part of your money that needs work. Each one keeps your numbers on this device."
      />
      <nav aria-label="Planners" className="bento" data-testid="planner-bento">
        {PLANNERS.map((p) => {
          const icon = AREA_ICON[p.href] ?? { name: 'plan' as const, tone: 'teal' as const };
          const big = p.cls === 'b-health';
          return (
            <Link key={p.href} href={p.href} className={`card lift bento-card min-w-0 ${p.cls}`} onPointerMove={glassRim}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <GlassIcon name={icon.name} tone={icon.tone} size={big ? 56 : 44} />
                <span className={`pill ${p.tag.includes('Pro') ? 'pill-soft-pro' : 'pill-ok'} !text-[10px]`}>{p.tag}</span>
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

/** The three stand-alone calculator pages, then the most useful library tools. */
const STANDALONE: Array<{ href: string; title: string; text: string; icon: GlyphName; tone: Tone }> = [
  { href: '/sip-calculator/', title: 'SIP calculator', text: 'Monthly investing, with a return breakdown', icon: 'coins', tone: 'emerald' },
  { href: '/emi-calculator/', title: 'EMI calculator', text: 'Loan instalment and the interest split', icon: 'debt', tone: 'rose' },
  { href: '/compound-interest/', title: 'Compound interest', text: 'Growth with yearly additions', icon: 'trend', tone: 'sky' },
];

const POPULAR = [
  'india-tax-regime-calculator',
  'world-vat-gst-calculator',
  'xirr-calculator',
  'rent-vs-buy-calculator',
  'budget-50-30-20-calculator',
  'ppf-calculator',
];

/** The stand-alone calculators and six of the most useful library tools, one tap away from the home page. */
export function PopularTools() {
  const tools = POPULAR.map((slug) => TOOLS.find((t) => t.slug === slug)).filter((t): t is (typeof TOOLS)[number] => Boolean(t));
  return (
    <section aria-labelledby="popular-title" data-testid="popular-tools">
      <SectionHead
        id="popular-title"
        eyebrow="Calculators"
        title="The ones people"
        accent="use most"
        action={
          <Link href="/tools/" className="btn btn-secondary" data-testid="all-tools-link">
            All {TOOLS.length} tools →
          </Link>
        }
      />
      <nav aria-label="Popular calculators" className="fitgrid popular-grid grid gap-3">
        {STANDALONE.map((t) => (
          <Link key={t.href} href={t.href} className="card lift flex items-center gap-3 p-4 min-w-0">
            <GlassIcon name={t.icon} tone={t.tone} size={40} />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-white leading-snug">{t.title}</span>
              <span className="block text-xs text-zinc-500 mt-0.5">{t.text}</span>
            </span>
          </Link>
        ))}
        {tools.map((t) => {
          const icon = toolIcon(t.slug, t.category);
          return (
            <Link key={t.slug} href={`/tools/${t.slug}/`} className="card lift flex items-center gap-3 p-4 min-w-0">
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
      </nav>
    </section>
  );
}

const QUICK: Array<{ icon: GlyphName; tone: Tone; label: string; at: string }> = [
  { icon: 'debt', tone: 'rose', label: 'Loan EMI and mortgage', at: 'loan' },
  { icon: 'coins', tone: 'emerald', label: 'SIP and savings growth', at: 'growth' },
  { icon: 'calculator', tone: 'cyan', label: 'Income tax and take-home pay', at: 'tax' },
  { icon: 'globe', tone: 'sky', label: 'GST, VAT and sales tax', at: 'indirect' },
  { icon: 'wallet', tone: 'teal', label: 'Salary (CTC) to in-hand (India)', at: 'ctc' },
  { icon: 'gem', tone: 'amber', label: 'Gold, silver and index prices', at: 'markets' },
];

/** One card that sends people to the quick calculators and market prices, which have their own page. */
export function QuickAnswers() {
  return (
    <section aria-labelledby="quick-answers-title" data-testid="quick-answers">
      <div className="card quick-answers grid gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:items-center">
        <div className="grid gap-3 min-w-0">
          <span className="eyebrow">Need one number fast?</span>
          <h2 id="quick-answers-title" className="section-title !m-0">
            Quick calculators <span className="gradient-text">for your country</span>
          </h2>
          <p className="section-lede !m-0">
            Loan instalments and investment growth for India, the US, the UK and Europe, income tax for India, the US and the
            UK, and GST, sales tax or VAT, with the reference prices people check most. All on one page.
          </p>
          <Link href="/quick-calculators/" className="btn btn-primary justify-self-start" data-testid="quick-answers-link">
            Open quick calculators →
          </Link>
        </div>
        <ul className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-2.5 m-0 p-0 list-none" aria-label="On the quick calculators page">
          {QUICK.map((q) => (
            <li key={q.label} className="flex">
              <Link href={`/quick-calculators/#${q.at}`} className="trust-chip lift w-full min-h-12">
                <GlassIcon name={q.icon} tone={q.tone} size={28} />
                <span>{q.label}</span>
              </Link>
            </li>
          ))}
        </ul>
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
    <section aria-labelledby="how-title" data-testid="how-it-works">
      <SectionHead id="how-title" eyebrow="How it works" title="From ten numbers" accent="to a plan" />
      <ol className="fitgrid steps-grid grid gap-3 m-0 p-0 list-none">
        {STEPS.map((s, i) => (
          <li key={s.title} className="card !p-6 flex items-start gap-4">
            <span className="step-num" aria-hidden="true">{i + 1}</span>
            <div className="min-w-0 grid gap-3">
              <GlassIcon name={s.icon} tone={s.tone} size={40} />
              <span className="block font-semibold text-white text-[17px]">{s.title}</span>
              <span className="block text-sm text-zinc-400 leading-snug">{s.text}</span>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

const FREE_LIST = [
  'Every calculator and country tax tool',
  'Health score and your top priority',
  `Debt planner for up to ${FREE_LIMITS.debts} debts`,
  `Goal planner for ${FREE_LIMITS.goals} goal`,
  'Retirement projection and loan prepayment',
  'Backup and restore of your plan',
];

/** Free and Pro side by side, with the price for the visitor's currency. */
export function FreeVsPro() {
  const { currency } = useMoney();
  const price = (plan: string) => {
    const p = PLAN_PRICES.find((x) => x.plan === plan);
    return p ? (currency === 'INR' ? p.inr : p.intl) : '';
  };
  return (
    <section aria-labelledby="plans-title" data-testid="free-vs-pro">
      <SectionHead
        id="plans-title"
        eyebrow="Free and Pro"
        title="Free to start,"
        accent="Pro when you plan"
        lede="Everything you need to see where you stand is free. Pro adds the full plan built on your own numbers, with no ads."
      />
      <div className="plans-grid">
        <div className="card p-6 sm:p-7 grid gap-5" data-testid="plan-free">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-[17px] font-semibold text-white m-0">Free</h3>
            <span className="font-serif text-3xl text-white">{currency === 'INR' ? '₹0' : '$0'}</span>
          </div>
          <ul className="tick-list content-start">
            {FREE_LIST.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          <Link href="/health-check/" className="btn btn-secondary justify-self-start">
            Start free
          </Link>
        </div>
        <div className="card plan-pro p-6 sm:p-7 grid gap-5" data-testid="plan-pro">
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <h3 className="text-[17px] font-semibold text-white m-0 flex items-center gap-2">
              Pro <span className="pill pill-pro !text-[10px]">No ads</span>
            </h3>
            <span className="text-sm text-zinc-400">
              <b className="font-serif text-3xl font-medium text-white" data-testid="plan-pro-price">{price('pro_yearly')}</b> a year · or{' '}
              {price('pro_lifetime')} once
            </span>
          </div>
          <ul className="tick-list tick-pro content-start">
            {PRO_FEATURES.map((f) => (
              <li key={f.id}>
                <b className="text-white font-semibold">{f.title}.</b> {f.detail}
              </li>
            ))}
          </ul>
          <Link href="/pricing/" className="btn btn-primary justify-self-start" data-testid="plans-pricing">
            See plans and prices
          </Link>
        </div>
      </div>
    </section>
  );
}

const PROMISES: Array<{ icon: GlyphName; tone: Tone; title: string; text: string }> = [
  { icon: 'shield', tone: 'emerald', title: 'Stays on this device', text: 'Your numbers are saved in this browser only. There is no account and no database of your money.' },
  { icon: 'key', tone: 'amber', title: 'No bank link, no login', text: 'You type what you know. Finealth never asks for a bank password, a phone number or an email.' },
  { icon: 'info', tone: 'sky', title: 'Sourced rules, not advice', text: 'Each result shows how it is worked out and where the rule comes from. It never tells you what to buy.' },
];

/** The privacy and honesty promise, in plain words. */
export function PrivacyPromise() {
  return (
    <section aria-labelledby="privacy-title" data-testid="privacy-promise">
      <SectionHead id="privacy-title" eyebrow="Private by design" title="Your money stays" accent="yours" />
      <div className="fitgrid steps-grid grid gap-3">
        {PROMISES.map((p) => (
          <div key={p.title} className="card !p-6 grid gap-3 content-start">
            <GlassIcon name={p.icon} tone={p.tone} size={40} />
            <h3 className="text-[17px] font-semibold text-white m-0">{p.title}</h3>
            <p className="m-0 text-sm text-zinc-400 leading-relaxed">{p.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export const FAQ: Array<{ q: string; a: string }> = [
  { q: 'Is Finealth free?', a: 'Yes. Every calculator, the health score with your top priority, and the debt, goal, retirement and prepayment planners are free with ads. Pro is optional and removes the ads.' },
  { q: 'Where are my numbers stored?', a: 'Only in this browser, on this device. None of your financial numbers is sent to a server. Use Back up on My Plan to keep a copy or move it to another device.' },
  { q: 'How is the health score worked out?', a: 'Six rules of thumb: savings rate, emergency fund, loan payments, costly debt, retirement savings and insurance. Each rule gives points, and the score is the total out of 100.' },
  { q: 'Is this financial advice?', a: 'No. Finealth gives estimates and general rules of thumb from the numbers you enter. It does not recommend any product. Check important decisions with a qualified professional.' },
  { q: 'How do I get Pro on another device?', a: 'Open Restore Pro and paste the payment ID from your receipt. There is no account to sign in to.' },
];

/** Short answers to the questions people ask before they type their numbers. */
export function HomeFaq() {
  return (
    <section aria-labelledby="faq-title" data-testid="home-faq">
      <SectionHead id="faq-title" eyebrow="Questions" title="Before you" accent="start" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
          }),
        }}
      />
      <div className="faq-list">
        {FAQ.map((f) => (
          <details key={f.q} className="faq">
            <summary>{f.q}</summary>
            <p>{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

/** Last call to action before the disclaimer and footer. */
export function FinalCta() {
  return (
    <section aria-labelledby="cta-title" className="final-cta" data-testid="final-cta">
      <h2 id="cta-title" className="section-title !m-0">
        Two minutes, <span className="gradient-text">ten numbers.</span>
      </h2>
      <p className="section-lede !mx-auto">See your score and the one change that lifts it most. Free, private, no sign-up.</p>
      <Link href="/health-check/" className="btn btn-primary btn-lg">
        Start free health check
      </Link>
    </section>
  );
}
