import type { Metadata } from 'next';
import { LegalPage } from '@/components/site/LegalPage';
import { config } from '@/lib/config';

export const metadata: Metadata = { title: 'Privacy policy', description: 'Finealth keeps your financial numbers on your device. What we process, and why.', alternates: { canonical: '/privacy/' } };

export default function Page() {
  return (
    <LegalPage title="Privacy policy">
      <p>Equisteg (&quot;we&quot;) makes Finealth. This policy explains what happens to your information when you use it.</p>
      <h2>Your financial numbers stay on your device</h2>
      <p>
        Income, spending, debts, goals, savings and every other number you enter are calculated in your browser and saved only in your browser&apos;s local storage. They are never sent to us, never logged and never shared with advertisers or analytics. You can delete them any time from My Plan → Delete my data, or by clearing your browser&apos;s site data.
      </p>
      <h2>What reaches our server</h2>
      <ul>
        <li>When you buy or restore Pro, your browser sends the Razorpay payment or subscription ID (or Google Play purchase token) to our licence service, which checks it with the store and returns a signed Pro token. We do not store it. Our logs keep only a short, irreversible fingerprint of the ID for 3 days.</li>
        <li>Like every website, our hosting provider (Cloudflare) processes your IP address to deliver pages and stop abuse. We do not keep it.</li>
      </ul>
      <h2>Payments</h2>
      <p>Payments are handled by Razorpay (web) and Google Play (Android). They collect the details needed to take your payment under their own privacy policies. We never see your card or bank details.</p>
      <h2>Advertising (free plan only)</h2>
      <p>
        Free users may see Google AdSense ads. Google may use cookies to show and measure ads; in the EEA, UK and Switzerland we ask for your consent first. Pro users load no ad code at all. Learn more at google.com/policies/technologies/ads.
      </p>
      <h2>Children</h2>
      <p>Finealth is for adults managing their own money and is not directed at children under 13.</p>
      <h2>Your rights and contact</h2>
      <p>
        Because we hold no personal data about you, there is usually nothing for us to access or delete. For any privacy question, email <a href={`mailto:${config.contactEmail}`}>{config.contactEmail}</a>.
      </p>
    </LegalPage>
  );
}
