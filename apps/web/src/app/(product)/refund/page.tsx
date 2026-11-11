import type { Metadata } from 'next';
import { LegalPage } from '@/components/site/LegalPage';
import { config } from '@/lib/config';

export const metadata: Metadata = { title: 'Refunds & cancellation', description: 'How to cancel Finealth Pro and get a refund.', alternates: { canonical: '/refund/' } };

export default function Page() {
  return (
    <LegalPage title="Refunds & cancellation">
      <p>Equisteg (&quot;we&quot;) makes Finealth and sells Finealth Pro. This page explains how to cancel Pro and get your money back.</p>
      <h2>14-day refund</h2>
      <p>
        If Pro is not right for you, email <a href={`mailto:${config.contactEmail}`}>{config.contactEmail}</a> within 14 days of paying, with your payment or subscription ID. We refund the full amount to the original payment method. Razorpay usually returns it within 5-7 working days.
      </p>
      <h2>Cancelling Pro Yearly</h2>
      <p>
        Email us with your subscription ID (it starts with <code>sub_</code>) and we cancel the renewal. Pro stays on until the end of the year you paid for. You can also cancel from the link in your Razorpay subscription email.
      </p>
      <h2>Android purchases</h2>
      <p>Purchases made in the Android app are handled by Google Play. Cancel and request refunds in the Play Store under Payments &amp; subscriptions.</p>
      <h2>Calculation errors</h2>
      <p>
        If you think a Pro result is wrong, tell us with the inputs you used. We will check it and fix confirmed errors for everyone. Pro gives estimates for information only (see the Terms); a refund within the 14-day window is the remedy for a purchase you are unhappy with.
      </p>
      <h2>After a refund</h2>
      <p>Pro switches off within 7 days. All your plans stay on your device and keep working on the free plan.</p>
    </LegalPage>
  );
}
