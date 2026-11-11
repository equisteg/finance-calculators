import type { Metadata } from 'next';
import Link from 'next/link';
import AdSenseBanner from '@/components/AdSenseBanner';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import {
  FinalCta,
  FreeVsPro,
  HomeFaq,
  HomeHero,
  HowItWorks,
  PlannerCards,
  PopularTools,
  PrivacyPromise,
  ProofStrip,
  QuickAnswers,
} from '@/components/site/HomeHero';
import { FitArea } from '@/components/ui';
import { ADSENSE_CLIENT, AD_SLOTS } from '@/lib/ads';

// Title and description come from the root layout; the home page only adds its canonical.
export const metadata: Metadata = { alternates: { canonical: '/' } };

/**
 * The home page is a landing page only: what Finealth is, the planners, how it works, the calculators, Free vs Pro,
 * the privacy promise, questions and one call to action. The working calculators live on their own pages
 * (planners, /tools/ and /quick-calculators/). Ads only ever sit between whole sections.
 */
export default function Home() {
  return (
    <div className="min-h-screen text-zinc-100">
      <SiteHeader />
      <main id="main" className="wrap pt-8 pb-6 sm:pt-12">
        <FitArea className="home-stack">
          <HomeHero />
          <ProofStrip />
          <PlannerCards />
          <HowItWorks />

          <AdSenseBanner client={ADSENSE_CLIENT} slot={AD_SLOTS.top} />

          <PopularTools />
          <QuickAnswers />

          <AdSenseBanner client={ADSENSE_CLIENT} slot={AD_SLOTS.mid} />

          <FreeVsPro />
          <PrivacyPromise />

          <AdSenseBanner client={ADSENSE_CLIENT} slot={AD_SLOTS.bottom} />

          <HomeFaq />
          <FinalCta />

          <p className="notice notice-warn text-sm" data-testid="disclaimer">
            <strong>Information only.</strong> Every figure on Finealth is an estimate from the numbers you enter and the published
            rules and rates for the period shown. It is not financial, tax, investment or legal advice, may contain errors, and
            rates change in each budget. Check important decisions with the official source or a qualified professional.{' '}
            <Link href="/terms/" className="underline">
              Terms
            </Link>
          </p>
        </FitArea>
      </main>
      <SiteFooter />
    </div>
  );
}
