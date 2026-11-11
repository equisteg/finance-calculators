import type { Metadata } from 'next';

// The page is a client component, so its title, description and canonical live here.
export const metadata: Metadata = {
  title: 'SIP calculator: monthly investment growth',
  description: 'See what a monthly SIP or regular investment grows to, with an optional yearly step-up. Free, no login, your numbers stay on your device.',
  alternates: { canonical: '/sip-calculator/' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
