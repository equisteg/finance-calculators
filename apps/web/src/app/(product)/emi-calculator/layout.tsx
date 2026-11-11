import type { Metadata } from 'next';

// The page is a client component, so its title, description and canonical live here.
export const metadata: Metadata = {
  title: 'EMI calculator: loan instalment and schedule',
  description: 'Work out the monthly EMI on a home, car or personal loan, the total interest and the year-by-year schedule. Free, no login, your numbers stay on your device.',
  alternates: { canonical: '/emi-calculator/' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
