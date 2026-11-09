import type { Metadata } from 'next';
import Link from 'next/link';
import { CATEGORIES, CHECKED_LABEL, TOOLS } from '@/lib/toolCatalog';

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
  { href: '/', title: 'Regional calculators', summary: 'EMI, SIP, mortgage, GST, PAYE, CTC and more.' },
];

export default function ToolsIndex() {
  return (
    <div>
      <div className="border-b border-white/[0.08] pb-6 mb-8">
        <span className="eyebrow block mb-2">{TOOLS.length + PLANNERS.length} free tools</span>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white">Every money tool in one place</h1>
        <p className="text-zinc-400 mt-2 max-w-2xl">
          Tax and salary for India, the US, UK, Canada, Australia, Singapore and New Zealand, VAT and GST for 60+ countries, and universal tools for
          loans, savings and business. Everything runs in your browser; nothing you type is sent to us.
        </p>
        <p className="notice notice-warn mt-4 text-sm" data-testid="tools-disclaimer">
          <strong>Estimates only, not advice.</strong> Each tool shows how it is worked out, what it leaves out and, for tax tools, the date we last
          checked the rates ({CHECKED_LABEL}). Confirm anything important with the official source or a qualified professional.
        </p>
      </div>

      <section className="mb-10">
        <h2 className="text-sm font-mono uppercase tracking-wider text-zinc-400 mb-4">Planners</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PLANNERS.map((p) => (
            <Link key={p.href} href={p.href} className="card p-4 hover:!border-emerald-400/50 transition">
              <span className="block font-bold text-white">{p.title}</span>
              <span className="block text-sm text-zinc-400 mt-1">{p.summary}</span>
            </Link>
          ))}
        </div>
      </section>

      {CATEGORIES.map((c) => (
        <section key={c} className="mb-10">
          <h2 className="text-sm font-mono uppercase tracking-wider text-zinc-400 mb-4">{c}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TOOLS.filter((t) => t.category === c).map((t) => (
              <Link key={t.slug} href={`/tools/${t.slug}/`} className="card p-4 hover:!border-emerald-400/50 transition" data-testid={`tool-card-${t.slug}`}>
                <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-300">{t.region}</span>
                <span className="block font-bold text-white mt-1">{t.title}</span>
                <span className="block text-sm text-zinc-400 mt-1">{t.summary}</span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
