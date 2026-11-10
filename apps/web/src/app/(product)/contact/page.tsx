import type { Metadata } from 'next';
import { LegalPage } from '@/components/site/LegalPage';
import { config } from '@/lib/config';

export const metadata: Metadata = { title: 'Contact', description: 'Contact the Finealth team at Equisteg.', alternates: { canonical: '/contact/' } };

export default function Page() {
  return (
    <LegalPage title="Contact">
      <p>
        Email <a href={`mailto:${config.contactEmail}`}>{config.contactEmail}</a>. We reply within two working days. For Pro questions, include your payment or subscription ID, never your card details.
      </p>
      <h2>Business details</h2>
      <p>Equisteg · {config.businessAddress}</p>
    </LegalPage>
  );
}
