import type { Metadata } from 'next';
import { LegalPage } from '@/components/site/LegalPage';
import { config } from '@/lib/config';

export const metadata: Metadata = { title: 'Terms of use', description: 'The terms for using Finealth and Finealth Pro.', alternates: { canonical: '/terms/' } };

export default function Page() {
  return (
    <LegalPage title="Terms of use">
      <p>These terms are an agreement between you and Equisteg ({config.businessAddress}) for the use of Finealth on the web and on Android.</p>
      <h2>Information, not advice</h2>
      <p>
        Finealth provides general information and calculations based on the numbers you enter and on common rules of thumb. It is not financial, investment, tax, insurance or legal advice, and it does not recommend any product. Results are estimates; real outcomes will differ. You are responsible for your decisions; consider speaking to a qualified professional.
      </p>
      <h2>Finealth Pro</h2>
      <ul>
        <li>Pro Yearly is a subscription that renews every year until cancelled. Pro Lifetime is a one-time payment for the life of the product. Pro Monthly is sold only in the Android app through Google Play.</li>
        <li>Prices are shown before you pay. Indian prices include GST.</li>
        <li>Pro is tied to the licence ID on your receipt, not to an account. Keep it safe; it can be activated in up to 5 browsers.</li>
        <li>If a payment is refunded or charged back, or a subscription ends, Pro stops within 7 days.</li>
      </ul>
      <h2>Acceptable use</h2>
      <p>Do not attempt to bypass licence checks, overload our services, or copy and resell the product.</p>
      <h2>Liability</h2>
      <p>
        Finealth is provided &quot;as is&quot;. To the extent the law allows, Equisteg is not liable for losses arising from decisions made using the calculations, and our total liability is limited to the amount you paid for Pro in the previous 12 months.
      </p>
      <h2>Changes and law</h2>
      <p>We may update these terms and will change the date above when we do. These terms are governed by the laws of India.</p>
      <p>
        Contact: <a href={`mailto:${config.contactEmail}`}>{config.contactEmail}</a>
      </p>
    </LegalPage>
  );
}
