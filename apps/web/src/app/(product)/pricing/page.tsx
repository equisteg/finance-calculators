import type { Metadata } from 'next';
import Link from 'next/link';
import { PriceCards } from '@/components/PriceCards';

export const metadata: Metadata = {
  title: 'Pricing: Finealth Free and Pro',
  description: 'Every calculator and the health check are free. Pro adds the full report, unlimited debts and goals, retirement odds, progress tracking and no ads.',
  alternates: { canonical: '/pricing/' },
};

const FAQ = [
  ['Do I need an account?', 'No. There is no sign-up and no login. Pro is unlocked with the payment or subscription ID from your receipt.'],
  ['Do you see my financial data?', 'No. Everything you enter stays in your browser. Our server only ever sees your licence ID when it checks your purchase.'],
  ['Do you link to my bank?', 'No, on purpose. You type in the numbers that matter, which keeps your data private and the app free of bank-access fees.'],
  ['Can I cancel?', 'Yes. Yearly renews once a year until you cancel, and Pro stays on until the end of the paid year. See the refund policy for details.'],
  ['Is this financial advice?', 'No. Finealth explains common rules of thumb and does the maths. It does not recommend products or tell you what to buy. Pro buys software features, not advice.'],
  ['How accurate are the results?', 'Formulas are tested against independent calculations and tax rates show the date we last checked them, but every result is an estimate and can contain errors. Confirm important figures with the official source or a professional.'],
];

export default function Page() {
  return (
    <div className="grid gap-10">
      <div>
        <span className="eyebrow block mb-2">Simple pricing</span>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white">Free to check. Pro to plan.</h1>
        <p className="text-zinc-400 mt-2 max-w-2xl">
          The calculators and your health score are free forever. Pro turns the score into a plan you can follow, with no ads.
        </p>
      </div>
      <PriceCards />
      <section>
        <h2 className="text-xl font-bold text-white mb-4">Questions</h2>
        <dl className="grid gap-4 sm:grid-cols-2">
          {FAQ.map(([q, a]) => (
            <div key={q} className="card p-5">
              <dt className="font-semibold text-white">{q}</dt>
              <dd className="m-0 mt-1 text-zinc-400">{a}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 text-sm text-zinc-400">
          See also <Link href="/refund/" className="link">Refunds &amp; cancellation</Link> and <Link href="/terms/" className="link">Terms</Link>.
        </p>
      </section>
    </div>
  );
}
