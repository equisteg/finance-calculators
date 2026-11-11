import Link from 'next/link';
import { EQUISTEG_URL } from '@/lib/config';
import { Logo } from './SiteHeader';

export function SiteFooter() {
  return (
    <footer className="no-print mt-4 sm:mt-6 pb-10 text-sm text-zinc-400">
      <div className="wrap"><div className="glass p-6 sm:p-8 grid gap-8 grid-cols-2 md:grid-cols-[2fr_1fr_1fr]">
        <div className="grid gap-3 col-span-2 md:col-span-1 content-start">
          <Logo />
          <p className="m-0 max-w-md">
            Private money check-ups and plans. No login, no bank link: your numbers stay in your browser.
          </p>
          <p className="m-0">
            A product by{' '}
            <a href={EQUISTEG_URL} className="link">
              Equisteg
            </a>
            {' · '}more free tools at{' '}
            <a href="https://teiqtools.com" className="link">
              TEIQTools.com
            </a>
          </p>
        </div>
        <nav aria-label="Product" className="grid gap-2 content-start [&>a]:transition [&>a:hover]:text-white">
          <Link href="/health-check/">Health Check</Link>
          <Link href="/debt-payoff/">Debt Planner</Link>
          <Link href="/goal-planner/">Goal Planner</Link>
          <Link href="/retirement-planner/">Retirement Planner</Link>
          <Link href="/tools/">All money tools</Link>
          <Link href="/quick-calculators/">Quick calculators</Link>
          <Link href="/pricing/">Pricing</Link>
        </nav>
        <nav aria-label="Company" className="grid gap-2 content-start [&>a]:transition [&>a:hover]:text-white">
          <Link href="/about/">About</Link>
          <Link href="/privacy/">Privacy</Link>
          <Link href="/terms/">Terms</Link>
          <Link href="/refund/">Refunds &amp; cancellation</Link>
          <Link href="/contact/">Contact</Link>
          <Link href="/pro/">Restore Pro</Link>
        </nav>
      </div></div>
      <p className="wrap mt-6 text-xs text-zinc-500 leading-relaxed">
        Finealth gives general information and estimates only. It is not financial, tax, investment or legal advice, and
        it does not recommend any product. Results depend on the numbers you enter and on rules and rates that change; they
        may contain errors and are provided &quot;as is&quot; without warranty. Check important decisions with the official
        source or a qualified professional. See the <Link href="/terms/">Terms</Link>.
      </p>
    </footer>
  );
}
