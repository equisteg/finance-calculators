import type { Metadata } from 'next';
import { RetirementPlanner } from '@/components/tools/RetirementPlanner';

export const metadata: Metadata = {
  title: 'Retirement Planner with Monte Carlo odds',
  description: 'Project your retirement pot, how much you need, and the chance your money lasts across 1,000 simulated markets. Private, no sign-up.',
  alternates: { canonical: '/retirement-planner/' },
};

export default function Page() {
  return <RetirementPlanner />;
}
