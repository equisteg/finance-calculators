import type { Metadata } from 'next';

// The page is a client component, so its title, description and canonical live here.
export const metadata: Metadata = {
  title: 'Quick calculators: EMI, SIP, income tax, GST/VAT and market prices',
  description:
    'Loan EMI or mortgage and SIP growth for India, the US, the UK and Europe, income tax for India, the US and the UK, plus GST, sales tax, VAT and stamp duty, next to reference gold, silver and index prices. Free, no login, your numbers stay on your device.',
  alternates: { canonical: '/quick-calculators/' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
