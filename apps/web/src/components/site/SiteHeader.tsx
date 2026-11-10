'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCurrency } from '@/app/context/CurrencyContext';
import { usePro } from '@/components/ProProvider';
import { AREA_ICON, GlassIcon } from '@/components/GlassIcon';
import { ThemeToggle } from '@/components/ThemeToggle';

export const NAV = [
  { href: '/health-check/', label: 'Health Check' },
  { href: '/debt-payoff/', label: 'Debt Planner' },
  { href: '/goal-planner/', label: 'Goals' },
  { href: '/retirement-planner/', label: 'Retirement' },
  { href: '/loan-prepayment/', label: 'Prepayment' },
  { href: '/tools/', label: 'All tools' },
];

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 shrink-0" aria-label="Finealth home">
      <GlassIcon name="spark" tone="terra" size={34} />
      <span className="hidden min-[400px]:block">
        <span className="block text-[17px] font-serif font-semibold tracking-tight text-white leading-none">Finealth</span>
        <span className="block text-[10px] uppercase tracking-[0.18em] text-zinc-500 mt-1">by Equisteg</span>
      </span>
    </Link>
  );
}

export function SiteHeader() {
  const path = usePathname();
  const { baseCurrency, setBaseCurrency } = useCurrency();
  const { isPro } = usePro();
  const active = (href: string) => (href === '/' ? path === '/' : path?.startsWith(href.replace(/\/$/, '')));

  const links = (compact = true) =>
    NAV.map((n) => {
      const icon = AREA_ICON[n.href];
      const on = active(n.href);
      return (
        <Link
          key={n.href}
          href={n.href}
          aria-current={on ? 'page' : undefined}
          className={compact ? 'chip !py-1 !pl-1' : `flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-sm transition ${on ? 'bg-white/[0.08] text-white' : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'}`}
        >
          {icon && <GlassIcon name={icon.name} tone={on ? icon.tone : 'slate'} size={compact ? 24 : 26} />}
          <span className="whitespace-nowrap">{n.label}</span>
        </Link>
      );
    });

  return (
    <header className="no-print sticky top-0 z-50 px-3 sm:px-4">
      <div className="navbar max-w-6xl">
      <div className="px-3 sm:px-4 h-16 flex items-center justify-between gap-3">
        <Logo />
        <div className="flex items-center gap-2 shrink-0">
          <ThemeToggle />
          <select
            aria-label="Currency"
            value={baseCurrency}
            onChange={(e) => setBaseCurrency(e.target.value)}
            className="input !w-auto !py-1.5 !pl-2.5 !text-xs !rounded-lg"
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
        </div>
      </div>
      {/* One horizontal tab rail at every width; it scrolls sideways when it does not fit. */}
      <nav aria-label="Main" className="px-3 sm:px-4 pb-2.5 rail">
        {links(true)}
      </nav>
      </div>
    </header>
  );
}
