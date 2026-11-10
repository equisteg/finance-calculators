import type { Metadata } from 'next';
import { GoalPlanner } from '@/components/tools/GoalPlanner';

export const metadata: Metadata = {
  title: 'Goal Planner: monthly saving for any goal, after inflation',
  description: 'Work out what a home, education or car will cost after inflation and the monthly saving that gets you there. Free and private.',
  alternates: { canonical: '/goal-planner/' },
};

export default function Page() {
  return <GoalPlanner />;
}
