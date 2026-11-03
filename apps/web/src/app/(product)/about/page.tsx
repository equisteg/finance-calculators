import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/site/LegalPage';
import { EQUISTEG_URL } from '@/lib/config';

export const metadata: Metadata = { title: 'About Finealth', description: 'Who makes Finealth, how the numbers are worked out, and our editorial policy.', alternates: { canonical: '/about/' } };

export default function Page() {
  return (
    <LegalPage title="About Finealth">
      <p>
        Finealth is a private money check-up. It turns a few numbers you already know into a health score and a plan: which debt to clear first, how much to save for each goal, and whether your retirement savings are likely to last.
      </p>
      <p>
        It is a product by <a href={EQUISTEG_URL}>Equisteg</a>. There is no sign-up and no bank link. What you type stays in your browser.
      </p>
      <h2>How we work out the numbers</h2>
      <ul>
        <li>Every formula is written down with its source: EMI and amortisation as banks calculate them, annuity-due savings maths for goals, and published rules of thumb for the health score (50/30/20 savings, 3-6 months emergency fund, debt-to-income limits, savings-by-age multiples).</li>
        <li>Each formula has reference tests checked against independent calculations, including edge cases like 0 % interest.</li>
        <li>Tax rates and statutory figures carry the year they apply to and are re-checked every year.</li>
      </ul>
      <h2>Editorial policy</h2>
      <ul>
        <li>We explain and calculate. We do not recommend specific funds, policies, lenders or other products, and we are not paid to.</li>
        <li>We never promise returns. Every projection is an estimate that depends on the assumptions shown next to it.</li>
        <li>Ads on the free plan come from Google AdSense. We do not choose or endorse advertisers.</li>
      </ul>
      <p>
        Found a mistake? Tell us on the <Link href="/contact/">contact page</Link> and we will fix it.
      </p>
    </LegalPage>
  );
}
