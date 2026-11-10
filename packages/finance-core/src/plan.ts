import type { ProPlan } from '@finealth/shared-types';

/**
 * Free vs Pro. Every calculator and a correct answer to "where do I stand?" are free.
 * Pro is the plan built on your own numbers: the full report, unlimited what-ifs, simulations, saving and export.
 * Real prices are set on the server (apps/api/src/config/skus.ts, Razorpay plans) and in Play Console (Android);
 * these are display values only and must match them (docs/RELEASE.md "Prices").
 */
export const FREE_LIMITS = {
  /** Debts in the payoff planner. */
  debts: 3,
  /** Goals in the goal planner. */
  goals: 1,
  /** Health-check actions shown (the full ranked list is Pro). */
  healthActions: 1,
  /** Saved scenarios / health snapshots kept on the device. */
  savedSnapshots: 0,
} as const;

export const PRO_FEATURES = [
  { id: 'no-ads', title: 'No ads', detail: 'No ad scripts load at all.' },
  { id: 'health-report', title: 'Full health report', detail: 'All six pillars explained, every action ranked, printable as PDF.' },
  { id: 'debt-pro', title: 'Debt planner Pro', detail: 'Unlimited debts, month-by-month schedule and extra-payment what-ifs.' },
  { id: 'goals-pro', title: 'Unlimited goals', detail: 'Plan every goal from one budget, in priority order, with yearly step-ups.' },
  { id: 'retirement-odds', title: 'Retirement odds', detail: '1,000-run Monte Carlo simulation of whether your money lasts.' },
  { id: 'snapshots', title: 'Progress tracking', detail: 'Save health-check snapshots on this device and watch your score move.' },
  { id: 'export', title: 'Export and backup', detail: 'Download your plans as CSV or a JSON backup. Nothing is uploaded.' },
] as const;

export type ProFeature = (typeof PRO_FEATURES)[number]['id'];

export interface PlanPrice {
  plan: ProPlan;
  label: string;
  inr: string;
  intl: string;
  note: string;
  /** Monthly is sold only on Google Play: fixed web checkout fees would eat most of a ₹29 sale. */
  androidOnly?: boolean;
}

export const PLAN_PRICES: PlanPrice[] = [
  { plan: 'pro_monthly', label: 'Monthly', inr: '₹29', intl: 'US$0.99', note: 'per month, cancel any time', androidOnly: true },
  { plan: 'pro_yearly', label: 'Yearly', inr: '₹199', intl: 'US$7.99', note: 'per year · about ₹17 a month' },
  { plan: 'pro_lifetime', label: 'Lifetime', inr: '₹499', intl: 'US$19.99', note: 'one payment, yours forever' },
];

/** How many items a free user may use; Pro has no limit. */
export const limitFor = (key: keyof typeof FREE_LIMITS, pro: boolean): number => (pro ? Infinity : FREE_LIMITS[key]);
