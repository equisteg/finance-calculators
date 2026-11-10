import type { Metadata } from 'next';
import { DebtPlanner } from '@/components/tools/DebtPlanner';

export const metadata: Metadata = {
  title: 'Debt Payoff Planner: snowball vs avalanche',
  description: 'Find your debt-free date and the interest you save. Compare the snowball and avalanche methods with your own debts. Free, private, no sign-up.',
  alternates: { canonical: '/debt-payoff/' },
};

export default function Page() {
  return <DebtPlanner />;
}
