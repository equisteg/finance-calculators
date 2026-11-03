import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { CurrencyProvider } from './context/CurrencyContext';
import { ProProvider } from '@/components/ProProvider';
import { AdLoader } from '@/components/AdLoader';
import { config } from '@/lib/config';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(config.siteUrl),
  title: {
    default: 'Finealth: free financial health check, debt and goal planner',
    template: '%s · Finealth',
  },
  description:
    'Check your financial health in two minutes, then get a plan: debt payoff, goals, retirement odds and 20+ calculators. No login, no bank link, your numbers stay on your device.',
  robots: config.noindex ? { index: false, follow: false } : undefined,
  applicationName: 'Finealth',
  publisher: 'Equisteg',
};

const orgJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Finealth',
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Web, Android',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
  publisher: { '@type': 'Organization', name: 'Equisteg', url: 'https://equisteg.com' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased bg-[#050508] text-white`}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
        <ProProvider>
          <AdLoader />
          <CurrencyProvider>{children}</CurrencyProvider>
        </ProProvider>
      </body>
    </html>
  );
}
