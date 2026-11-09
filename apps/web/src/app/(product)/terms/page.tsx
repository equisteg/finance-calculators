import type { Metadata } from 'next';
import { LegalPage } from '@/components/site/LegalPage';
import { config } from '@/lib/config';

export const metadata: Metadata = { title: 'Terms of use', description: 'The terms for using Finealth and Finealth Pro.', alternates: { canonical: '/terms/' } };

// Template wording written for a lawyer to review before launch (RSK-006). It is not legal advice.
export default function Page() {
  return (
    <LegalPage title="Terms of use">
      <p>
        These terms are an agreement between you and Equisteg ({config.businessAddress}) for the use of Finealth on the web and on Android, including
        Finealth Pro. By using Finealth, or by buying Pro, you accept them. If you do not accept them, please do not use Finealth.
      </p>

      <h2>1. Information, not advice</h2>
      <p>
        Finealth is a software tool that does calculations on the numbers you enter, using published rules, tax rates and common rules of thumb. It
        gives general information only. It is <strong>not</strong> financial, investment, tax, accounting, insurance, credit or legal advice, and it
        does not recommend, rate or sell any financial product.
      </p>
      <p>
        Equisteg is not registered as an investment adviser, research analyst, financial planner, tax practitioner, insurance intermediary or credit
        provider with SEBI, RBI, IRDAI or any other regulator in any country, and nothing in Finealth creates an adviser, fiduciary or professional
        relationship with you. Paying for Pro buys software features (no ads, extra tools and reports); it does not buy advice.
      </p>

      <h2>2. Accuracy and estimates</h2>
      <ul>
        <li>
          Results are <strong>estimates</strong>. Real outcomes depend on facts Finealth does not know, on future returns, inflation and interest rates
          that nobody can predict, and on rules that change. Projections and Monte Carlo odds are illustrations, not promises.
        </li>
        <li>
          Tax and statutory figures are for the period stated on each tool and were last checked on the date shown there. Governments change them,
          sometimes with retrospective effect. Each tax tool lists what it does not cover and links to an official calculator where one exists.
        </li>
        <li>
          We take care to make the formulas correct and test them against independent calculations, but we do not warrant that Finealth is complete,
          error-free, up to date or suitable for your purpose. Always confirm important figures with the official source or a qualified professional
          before you act, file a return or sign anything.
        </li>
        <li>
          If you find a mistake, please tell us at <a href={`mailto:${config.contactEmail}`}>{config.contactEmail}</a>. We will look into it and correct
          confirmed errors.
        </li>
      </ul>

      <h2>3. Your responsibilities</h2>
      <p>
        You are responsible for the numbers you enter, for checking the results, and for your own decisions. Your data stays on your device: keep your
        own backup, because we cannot recover it for you.
      </p>

      <h2>4. Finealth Pro</h2>
      <ul>
        <li>Pro Yearly is a subscription that renews every year until cancelled. Pro Lifetime is a one-time payment for the life of the product. Pro Monthly is sold only in the Android app through Google Play.</li>
        <li>Prices are shown before you pay. Indian prices include GST. Before paying on the web you confirm that you have read these terms.</li>
        <li>Pro is tied to the licence ID on your receipt, not to an account. Keep it safe; it can be activated in up to 5 browsers.</li>
        <li>If a payment is refunded or charged back, or a subscription ends, Pro stops within 7 days.</li>
        <li>Refunds and cancellation follow the Refund &amp; cancellation policy. Google Play purchases also follow Google Play&apos;s refund rules.</li>
      </ul>

      <h2>5. Acceptable use</h2>
      <p>Do not attempt to bypass licence checks, overload our services, or copy and resell the product.</p>

      <h2>6. No warranty</h2>
      <p>
        Finealth is provided &quot;as is&quot; and &quot;as available&quot;. To the extent the law allows, Equisteg gives no warranty of any kind,
        express or implied, including of accuracy, completeness, fitness for a particular purpose or uninterrupted availability.
      </p>

      <h2>7. Limitation of liability</h2>
      <p>
        To the extent the law allows, Equisteg is not liable for any loss arising from decisions you make or do not make using Finealth, including tax
        assessed, interest, penalties, investment losses or lost profits, or for any indirect or consequential loss. Our total liability to you for any
        claim connected with Finealth is limited to the amount you paid for Pro in the 12 months before the claim (or nothing if you used only the free
        version).
      </p>

      <h2>8. Indemnity</h2>
      <p>
        You agree to compensate Equisteg for losses and reasonable costs caused by your breach of these terms or by your misuse of Finealth, for
        example presenting its results to others as professional advice.
      </p>

      <h2>9. Your statutory rights</h2>
      <p>
        Nothing in these terms limits any right you have under consumer protection law that cannot be excluded or limited by agreement. If a court
        finds part of these terms unenforceable, the rest still applies.
      </p>

      <h2>10. Links to other sites</h2>
      <p>Links to government calculators and other sites are for convenience. We do not control them and are not responsible for their content.</p>

      <h2>11. Changes, law and disputes</h2>
      <p>
        We may update these terms and will change the date above when we do; the version in force when you used Finealth or bought Pro applies to that
        use or purchase. These terms are governed by the laws of India. Please contact us first so we can try to resolve any complaint; otherwise the
        courts at the place of Equisteg&apos;s registered office have jurisdiction, subject to section 9.
      </p>
      <p>
        Contact and grievances: <a href={`mailto:${config.contactEmail}`}>{config.contactEmail}</a>. We aim to acknowledge complaints within 24 hours
        and resolve them within 15 days.
      </p>
    </LegalPage>
  );
}
