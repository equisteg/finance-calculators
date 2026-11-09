'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useCurrency } from '@/app/context/CurrencyContext';
import { usePro } from '@/components/ProProvider';

export const NAV = [
  { href: '/health-check/', label: 'Health Check' },
  { href: '/debt-payoff/', label: 'Debt Planner' },
  { href: '/goal-planner/', label: 'Goals' },
  { href: '/retirement-planner/', label: 'Retirement' },
  { href: '/loan-prepayment/', label: 'Prepayment' },
  { href: '/', label: 'Calculators' },
  { href: '/tools/', label: 'All tools' },
];

export function SiteHeader() {
  const path = usePathname();
  const { baseCurrency, setBaseCurrency } = useCurrency();
  const { isPro } = usePro();
  const [open, setOpen] = useState(false);
  const active = (href: string) => (href === '/' ? path === '/' : path?.startsWith(href.replace(/\/$/, '')));

  return (
    <header className="no-print border-b border-white/[0.08] bg-[#08080c]/90 backdrop-blur-md sticky top-0 z-50">
      <div className="wrap h-16 flex items-center justify-between gap-3">
        <Link href="/health-check/" className="flex items-center gap-2.5 shrink-0" aria-label="Finealth home">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-4 ring-emerald-400/20" />
          <span className="text-lg font-black tracking-tight text-white font-mono">FINEALTH</span>
        </Link>

        <nav aria-label="Main" className="hidden lg:flex items-center gap-1">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={active(n.href) ? 'page' : undefined}
              className={`px-3 py-1.5 rounded-lg text-sm transition ${active(n.href) ? 'bg-white/[0.08] text-white' : 'text-zinc-400 hover:text-white'}`}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <select
            aria-label="Currency"
            value={baseCurrency}
            onChange={(e) => setBaseCurrency(e.target.value)}
            className="bg-[#121216] text-white border border-white/[0.15] text-xs font-mono rounded-lg px-2 py-1.5"
          >
            <option value="INR">₹ INR</option>
            <option value="USD">$ USD</option>
            <option value="EUR">€ EUR</option>
            <option value="GBP">£ GBP</option>
          </select>
          {isPro ? (
            <Link href="/pro/" className="pill pill-pro" data-testid="pro-badge">
              Pro
            </Link>
          ) : (
            <Link href="/pricing/" className="btn btn-primary btn-sm" data-testid="go-pro">
              Go Pro
            </Link>
          )}
          <button type="button" className="btn btn-ghost btn-sm lg:hidden" aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpen((o) => !o)}>
            Menu
          </button>
        </div>
      </div>
      {open && (
        <nav id="mobile-nav" aria-label="Main" className="lg:hidden border-t border-white/[0.08] wrap py-2 grid">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="py-2 text-sm text-zinc-300 hover:text-white">
              {n.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
