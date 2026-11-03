import type { Metadata } from 'next';
import { HealthCheck } from '@/components/tools/HealthCheck';

export const metadata: Metadata = {
  title: 'Financial Health Check: your money score in 2 minutes',
  description: 'Free financial health score out of 100 from six rules of thumb: savings rate, emergency fund, debt, retirement and insurance. No login, nothing uploaded.',
  alternates: { canonical: '/health-check/' },
};

export default function Page() {
  return <HealthCheck />;
}
