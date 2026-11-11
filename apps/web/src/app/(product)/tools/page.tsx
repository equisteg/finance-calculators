import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { CATEGORIES, CHECKED_LABEL, TOOLS } from '@/lib/toolCatalog';
import { AREA_ICON, CATEGORY_ICON, GlassIcon, toolIcon } from '@/components/GlassIcon';
import { FitArea } from '@/components/ui';
import { WORLD_VAT_RATES } from '@finealth/finance-core';

export const metadata: Metadata = {
  title: 'All money tools: tax, loans, savings and business calculators',
  description: 'Free calculators for tax and salary in India, the US, UK, Canada, Australia, Singapore and New Zealand, plus VAT/GST for 60+ countries, loans, savings, inflation, NPV, IRR and XIRR.',
  alternates: { canonical: '/tools/' },
};

const PLANNERS = [
  { href: '/health-check/', title: 'Financial Health Check', summary: 'A 0-100 score with your next best actions.' },
  { href: '/debt-payoff/', title: 'Debt Payoff Planner', summary: 'Snowball vs avalanche, with a debt-free date.' },
  { href: '/goal-planner/', title: 'Goal Planner', summary: 'Monthly saving for each goal and what fits.' },
  { href: '/retirement-planner/', title: 'Retirement Planner', summary: 'Projection and Monte Carlo odds.' },
  { href: '/loan-prepayment/', title: 'Loan Prepayment', summary: 'Reduce EMI or reduce tenure?' },
  { href: '/quick-calculators/', title: 'Quick calculators', summary: 'EMI, SIP, mortgage, GST, PAYE, CTC and market prices.' },
];

const slug = (c: string) => c.toLowerCase().replace(/[^a-z]+/g, '-');

export default function ToolsIndex() {
  return (
    <FitArea className="fade-up">
      <section className="glass glass-strong p-6 sm:p-8 mb-6 grid gap-6 md:grid-cols-[1.4fr_1fr] md:items-center">
        <div className="min-w-0">
          <span className="eyebrow block mb-2">{TOOLS.length + PLANNERS.length} free tools · 7 countries · {Object.keys(WORLD_VAT_RATES).length} VAT rates</span>
          <h1 className="heading-xl">
            Every money tool, <span className="gradient-text">in one calm place</span>
          </h1>
          <p className="text-zinc-400 mt-3 max-w-2xl leading-relaxed">
            Tax and salary for India, the US, UK, Canada, Australia, Singapore and New Zealand, VAT and GST worldwide, and universal tools for loans,
            savings and business. Everything runs in your browser; nothing you type is sent to us.
          </p>
        </div>
        <div className="notice notice-warn text-sm flex items-start gap-3" data-testid="tools-disclaimer">
          <GlassIcon name="info" tone="amber" size={32} />
          <p className="m-0 min-w-0 leading-relaxed">
            <strong>Estimates only, not advice.</strong> Each tool shows how it is worked out, what it leaves out and, for tax tools, the date we last
            checked the rates ({CHECKED_LABEL}). Confirm anything important with the official source or a qualified professional.
          </p>
        </div>
      </section>

      <nav aria-label="Jump to a category" className="rail mb-8 sticky top-[7.5rem] z-30 p-2 bg-ground/70 backdrop-blur-xl rounded-2xl border border-white/[0.06]">
        <a href="#planners" className="chip !pl-1.5">
          <GlassIcon name="spark" tone="terra" size={22} />
          Planners
        </a>
        {CATEGORIES.map((c) => (
          <a key={c} href={`#${slug(c)}`} className="chip !pl-1.5">
            <GlassIcon name={CATEGORY_ICON[c].name} tone={CATEGORY_ICON[c].tone} size={22} />
            {c}
          </a>
        ))}
      </nav>

      <section id="planners" className="mb-10 scroll-mt-40">
        <SectionTitle icon={<GlassIcon name="spark" tone="terra" size={30} />} title="Planners" count={PLANNERS.length} />
        <div className="fitgrid grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PLANNERS.map((p) => {
            const icon = AREA_ICON[p.href];
            return <ToolCard key={p.href} href={p.href} icon={<GlassIcon name={icon.name} tone={icon.tone} size={44} />} title={p.title} summary={p.summary} />;
          })}
        </div>
      </section>

      {CATEGORIES.map((c) => (
        <section key={c} id={slug(c)} className="mb-10 scroll-mt-40">
          <SectionTitle icon={<GlassIcon name={CATEGORY_ICON[c].name} tone={CATEGORY_ICON[c].tone} size={30} />} title={c} count={TOOLS.filter((t) => t.category === c).length} />
          <div className="fitgrid grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TOOLS.filter((t) => t.category === c).map((t) => {
              const icon = toolIcon(t.slug, t.category);
              return (
                <ToolCard
                  key={t.slug}
                  href={`/tools/${t.slug}/`}
                  testId={`tool-card-${t.slug}`}
                  icon={<GlassIcon name={icon.name} tone={icon.tone} size={44} />}
                  region={t.region}
                  title={t.title}
                  summary={t.summary}
                />
              );
            })}
          </div>
        </section>
      ))}
    </FitArea>
  );
}

function SectionTitle({ icon, title, count }: { icon: ReactNode; title: string; count: number }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      {icon}
      <h2 className="text-xl font-serif font-semibold text-white">{title}</h2>
      <span className="pill pill-ok">{count}</span>
    </div>
  );
}

/** Horizontal card: icon on the left, text on the right, everything inside the box. */
function ToolCard(props: { href: string; icon: ReactNode; title: string; summary: string; region?: string; testId?: string }) {
  return (
    <Link href={props.href} className="card lift p-4 flex items-start gap-4 group" data-testid={props.testId}>
      {props.icon}
      <span className="min-w-0 flex-1">
        {props.region && <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300">{props.region}</span>}
        <span className="block font-semibold text-white leading-snug mt-0.5">{props.title}</span>
        <span className="block text-sm text-zinc-400 mt-1 leading-snug line-clamp-2">{props.summary}</span>
      </span>
      <svg viewBox="0 0 24 24" className="w-4 h-4 mt-1 shrink-0 text-zinc-600 group-hover:text-emerald-300 group-hover:translate-x-0.5 transition" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M9 6l6 6-6 6" />
      </svg>
    </Link>
  );
}
