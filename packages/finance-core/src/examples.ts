/**
 * Example household per currency, so the first visit (web) or first launch (app) shows a real result.
 * Shared by apps/web and apps/mobile. Non-INR amounts are the INR example divided by 20 and rounded.
 */
import type { Debt } from './debt';
import type { Goal } from './goals';
import type { HealthInput } from './health';
import type { RetirementInput } from './retirement';

export const TOOL_CURRENCIES = ['INR', 'USD', 'EUR', 'GBP'] as const;
export type ToolCurrency = (typeof TOOL_CURRENCIES)[number];
export const isToolCurrency = (c: unknown): c is ToolCurrency => (TOOL_CURRENCIES as readonly unknown[]).includes(c);

const scale = (currency: ToolCurrency) => {
  const k = currency === 'INR' ? 1 : 1 / 20;
  return (n: number) => Math.round(n * k);
};

export function exampleHealth(currency: ToolCurrency): HealthInput {
  const r = scale(currency);
  return {
    monthlyIncome: r(100_000),
    monthlyExpenses: r(60_000),
    monthlyDebtPayments: r(15_000),
    emergencyFund: r(225_000),
    costlyDebt: r(60_000),
    investments: r(1_200_000),
    age: 35,
    dependents: 2,
    lifeCover: r(5_000_000),
    hasHealthCover: true,
  };
}

export function exampleDebts(currency: ToolCurrency): Debt[] {
  const r = scale(currency);
  return [
    { id: 'card', name: 'Credit card', balance: r(80_000), aprPct: 42, minPayment: r(4_000) },
    { id: 'personal', name: 'Personal loan', balance: r(250_000), aprPct: 14, minPayment: r(8_500) },
    { id: 'phone', name: 'Phone EMI', balance: r(30_000), aprPct: 16, minPayment: r(3_000) },
  ];
}

export function exampleGoals(currency: ToolCurrency): Goal[] {
  const r = scale(currency);
  const infl = currency === 'INR' ? 6 : 3;
  return [
    { id: 'home', name: 'Home down payment', costToday: r(2_000_000), years: 7, inflationPct: infl, returnPct: 10, currentSavings: r(300_000), stepUpPct: 0 },
    { id: 'edu', name: "Child's education", costToday: r(2_500_000), years: 15, inflationPct: currency === 'INR' ? 10 : 5, returnPct: 12, currentSavings: 0, stepUpPct: 0 },
    { id: 'car', name: 'New car', costToday: r(900_000), years: 4, inflationPct: infl, returnPct: 7, currentSavings: r(100_000), stepUpPct: 0 },
  ];
}

export function exampleRetirement(currency: ToolCurrency): RetirementInput {
  const inr = currency === 'INR';
  const r = scale(currency);
  return {
    currentAge: 32,
    retireAge: 60,
    planToAge: 85,
    currentSavings: r(800_000),
    monthlySaving: r(25_000),
    yearlySpendingToday: r(720_000),
    inflationPct: inr ? 6 : 3,
    returnPct: inr ? 11 : 7,
    retiredReturnPct: inr ? 7 : 4.5,
    volatilityPct: 15,
  };
}
