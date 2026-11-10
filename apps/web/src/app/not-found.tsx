import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';

export const metadata: Metadata = { title: 'Page not found', robots: { index: false, follow: true } };

// Static 404 (404.html): the same header and footer as every page, and a main#main target for the skip link.
export default function NotFound() {
  return (
    <div className="min-h-screen text-zinc-100">
      <SiteHeader />
      <main id="main" className="wrap pt-12 pb-10 sm:pt-16">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">Error 404</p>
        <h1 className="heading-xl mt-2">This page does not exist</h1>
        <p className="mt-3 text-zinc-400 max-w-prose">The link may be old or mistyped. Your saved plans are safe on this device.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/" className="btn btn-primary">Go to the home page</Link>
          <Link href="/tools/" className="btn btn-secondary">Browse all calculators</Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
