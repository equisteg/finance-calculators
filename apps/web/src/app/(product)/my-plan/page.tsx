import type { Metadata } from 'next';
import { MyPlan } from '@/components/tools/MyPlan';

export const metadata: Metadata = {
  title: 'My Plan: progress and backup',
  description: 'Track your financial health score over time and back up your plans. Everything stays on your device.',
  robots: { index: false },
};

export default function Page() {
  return <MyPlan />;
}
