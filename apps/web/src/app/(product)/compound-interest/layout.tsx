import type { Metadata } from 'next';

// The page is a client component, so its title, description and canonical live here.
export const metadata: Metadata = {
  title: 'Compound interest calculator',
  description: 'See how a lump sum and yearly contributions grow with compound interest over the years. Free, no login, your numbers stay on your device.',
  alternates: { canonical: '/compound-interest/' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
