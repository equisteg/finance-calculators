import Link from 'next/link';
import { EQUISTEG_URL } from '@/lib/config';

export function SiteFooter() {
  return (
    <footer className="no-print border-t border-white/[0.08] mt-16 py-10 text-sm text-zinc-400">
      <div className="wrap grid gap-6 sm:grid-cols-[2fr_1fr_1fr]">
        <div className="grid gap-2">
          <span className="font-mono font-black text-white">FINEALTH</span>
          <p className="m-0 max-w-md">
            Private money check-ups and plans. No login, no bank link: your numbers stay in your browser.
          </p>
          <p className="m-0">
            A product by{' '}
            <a href={EQUISTEG_URL} className="link">
              Equisteg
            </a>
          </p>
        </div>
        <nav aria-label="Product" className="grid gap-1.5 content-start">
          <Link href="/health-check/">Health Check</Link>
          <Link href="/debt-payoff/">Debt Planner</Link>
          <Link href="/goal-planner/">Goal Planner</Link>
          <Link href="/retirement-planner/">Retirement Planner</Link>
          <Link href="/pricing/">Pricing</Link>
        </nav>
        <nav aria-label="Company" className="grid gap-1.5 content-start">
          <Link href="/about/">About</Link>
          <Link href="/privacy/">Privacy</Link>
          <Link href="/terms/">Terms</Link>
          <Link href="/refund/">Refunds &amp; cancellation</Link>
          <Link href="/contact/">Contact</Link>
          <Link href="/pro/">Restore Pro</Link>
        </nav>
      </div>
      <p className="wrap mt-8 text-xs text-zinc-500">
        Finealth gives general information and estimates only. It is not financial, tax, investment or legal advice, and
        it does not recommend any product. Check important decisions with a qualified professional.
      </p>
    </footer>
  );
}
