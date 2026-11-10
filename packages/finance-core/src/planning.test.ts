import { describe, expect, it } from 'vitest';
import {
  compareDebtStrategies,
  comparePrepayment,
  financialHealth,
  gradeOf,
  limitFor,
  monthlySavingFactor,
  planDebtPayoff,
  planGoal,
  planGoals,
  projectRetirement,
  retirementOdds,
  retirementTargetMultiple,
  seededRandom,
  toCsv,
  type Debt,
  type HealthInput,
  type RetirementInput,
} from './index';

/*
 * Golden cases. Expected values come from an independent Python re-implementation of the published formulas
 * (decimal rounding, half-up) and closed-form checks, not from running this code. Recorded in tests/testdata/shared/golden.json.
 */

describe('financial health score', () => {
  const base: HealthInput = {
    monthlyIncome: 100_000,
    monthlyExpenses: 60_000,
    monthlyDebtPayments: 15_000,
    emergencyFund: 225_000,
    costlyDebt: 60_000,
    investments: 1_200_000,
    age: 35,
    dependents: 2,
    lifeCover: 5_000_000,
    hasHealthCover: true,
  };

  it('scores the worked example: 75 / Good', () => {
    const r = financialHealth(base);
    expect(r.score).toBe(75);
    expect(r.grade).toBe('Good');
    const by = Object.fromEntries(r.pillars.map((p) => [p.id, p.score]));
    expect(by).toEqual({ savings: 100, emergency: 50, debtLoad: 88, costlyDebt: 90, retirement: 50, protection: 71 });
    expect(r.metrics.emergencyMonths).toBe(3);
    expect(r.metrics.retirementTargetMultiple).toBe(2);
  });

  it('ranks actions by the score they can win back', () => {
    const r = financialHealth(base);
    expect(r.actions.map((a) => a.pillar)).toEqual(['emergency', 'retirement', 'protection', 'debtLoad', 'costlyDebt']);
    expect(r.actions[0].amount).toBe(225_000); // 6 × 75,000 − 225,000
    for (let i = 1; i < r.actions.length; i++) expect(r.actions[i - 1].pointsAvailable).toBeGreaterThanOrEqual(r.actions[i].pointsAvailable);
  });

  it('gives 100 when every rule of thumb is met', () => {
    const r = financialHealth({ ...base, emergencyFund: 600_000, costlyDebt: 0, monthlyDebtPayments: 5_000, investments: 5_000_000, lifeCover: 20_000_000 });
    expect(r.score).toBe(100);
    expect(r.actions).toHaveLength(0);
  });

  it('handles zero income and negative or junk inputs without NaN', () => {
    const r = financialHealth({ ...base, monthlyIncome: 0, monthlyExpenses: -5, investments: Number.NaN });
    expect(Number.isFinite(r.score)).toBe(true);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });

  it('flags a monthly shortfall', () => {
    const r = financialHealth({ ...base, monthlyExpenses: 95_000 });
    expect(r.metrics.monthlySurplus).toBe(-10_000);
    expect(r.actions.find((a) => a.pillar === 'savings')?.title).toBe('Stop the monthly shortfall');
  });

  it('follows the savings-by-age curve and grades', () => {
    expect(retirementTargetMultiple(22)).toBe(0);
    expect(retirementTargetMultiple(30)).toBe(1);
    expect(retirementTargetMultiple(45)).toBe(4.5);
    expect(retirementTargetMultiple(80)).toBe(10);
    expect([gradeOf(80), gradeOf(60), gradeOf(40), gradeOf(39)]).toEqual(['Excellent', 'Good', 'Fair', 'Needs attention']);
  });
});

describe('debt payoff', () => {
  it('single loan matches the closed form (n = 10.59 → 11 months)', () => {
    const p = planDebtPayoff([{ id: 'a', name: 'Card', balance: 1000, aprPct: 12, minPayment: 100 }], 100, 'avalanche');
    expect(p.feasible).toBe(true);
    expect(p.months).toBe(11);
    expect(p.totalInterest).toBe(58.98);
    expect(p.totalPaid).toBe(1058.98);
    expect(p.schedule.at(-1)?.balance).toBe(0);
  });

  const debts: Debt[] = [
    { id: 'card', name: 'Credit card', balance: 2000, aprPct: 24, minPayment: 60 },
    { id: 'loan', name: 'Small loan', balance: 500, aprPct: 10, minPayment: 25 },
  ];

  it('avalanche beats snowball on interest; snowball clears a debt sooner', () => {
    const c = compareDebtStrategies(debts, 300);
    expect(c.avalanche.months).toBe(10);
    expect(c.avalanche.totalInterest).toBe(214.1);
    expect(c.avalanche.payoffs.map((p) => p.month)).toEqual([8, 10]);
    expect(c.snowball.months).toBe(10);
    expect(c.snowball.totalInterest).toBe(251.64);
    expect(c.snowball.payoffs.map((p) => [p.id, p.month])).toEqual([['loan', 3], ['card', 10]]);
    expect(c.minimum.months).toBe(56);
    expect(c.minimum.totalInterest).toBe(1378.1);
    expect(c.best).toBe('avalanche');
    expect(c.interestSaved).toBe(1164);
    expect(c.monthsSaved).toBe(46);
  });

  it('refuses a budget below the minimums and a debt that never shrinks', () => {
    expect(planDebtPayoff(debts, 50, 'avalanche').feasible).toBe(false);
    const growing = planDebtPayoff([{ id: 'x', name: 'X', balance: 10_000, aprPct: 36, minPayment: 100 }], 100, 'avalanche');
    expect(growing.feasible).toBe(false);
    expect(growing.reason).toMatch(/interest/);
  });

  it('treats no debt as already done', () => {
    const p = planDebtPayoff([], 100, 'snowball');
    expect(p.feasible).toBe(true);
    expect(p.months).toBe(0);
  });
});

describe('goals', () => {
  it('inflates the cost and finds the monthly saving (annuity-due)', () => {
    const g = planGoal({ id: 'g', name: 'Car', costToday: 1_000_000, years: 10, inflationPct: 6, returnPct: 12, currentSavings: 0 });
    expect(g.futureCost).toBe(1_790_848);
    expect(g.monthlyNeeded).toBe(7708);
    const withSavings = planGoal({ id: 'g', name: 'Car', costToday: 1_000_000, years: 10, inflationPct: 6, returnPct: 12, currentSavings: 100_000 });
    expect(withSavings.savingsGrowTo).toBe(330_039);
    expect(withSavings.monthlyNeeded).toBe(6288);
  });

  it('step-up lowers the first-year saving, 0 % return is plain division', () => {
    expect(monthlySavingFactor(12, 10, 10)).toBeGreaterThan(monthlySavingFactor(12, 10, 0));
    expect(monthlySavingFactor(0, 2)).toBe(24);
    expect(planGoal({ id: 'g', name: 'G', costToday: 2400, years: 2, inflationPct: 0, returnPct: 0, currentSavings: 0 }).monthlyNeeded).toBe(100);
  });

  it('funds goals in priority order from one budget', () => {
    const goals = [
      { id: 'a', name: 'A', costToday: 2400, years: 2, inflationPct: 0, returnPct: 0, currentSavings: 0 },
      { id: 'b', name: 'B', costToday: 4800, years: 2, inflationPct: 0, returnPct: 0, currentSavings: 0 },
    ];
    const p = planGoals(goals, 200);
    expect(p.goals.map((g) => [g.allocated, g.funded])).toEqual([[100, 1], [100, 0.5]]);
    expect(p.surplus).toBe(-100);
  });
});

describe('retirement', () => {
  const input: RetirementInput = {
    currentAge: 30,
    retireAge: 60,
    planToAge: 85,
    currentSavings: 500_000,
    monthlySaving: 20_000,
    yearlySpendingToday: 600_000,
    inflationPct: 6,
    returnPct: 11,
    retiredReturnPct: 7,
    volatilityPct: 15,
  };

  it('projects the corpus and what is needed', () => {
    const p = projectRetirement(input);
    expect(p.firstYearSpending).toBe(3_446_095); // 600,000 × 1.06^30
    expect(p.corpusAtRetirement).toBeGreaterThan(0);
    expect(p.corpusNeeded).toBeGreaterThan(p.firstYearSpending * 20);
  });

  it('zero volatility makes the odds match the straight-line projection', () => {
    const odds = retirementOdds({ ...input, volatilityPct: 0 }, 50);
    const p = projectRetirement(input);
    expect(odds.successRate).toBe(p.onTrack ? 1 : 0);
    expect(odds.atRetirement.p50).toBe(p.corpusAtRetirement);
  });

  it('is reproducible for the same seed and stays within 0..1', () => {
    const a = retirementOdds(input, 500, 7);
    const b = retirementOdds(input, 500, 7);
    expect(a).toEqual(b);
    expect(a.successRate).toBeGreaterThanOrEqual(0);
    expect(a.successRate).toBeLessThanOrEqual(1);
    expect(a.atRetirement.p10).toBeLessThanOrEqual(a.atRetirement.p50);
    expect(a.atRetirement.p50).toBeLessThanOrEqual(a.atRetirement.p90);
  });

  it('seeded random is uniform-ish', () => {
    const r = seededRandom(1);
    let sum = 0;
    for (let i = 0; i < 10_000; i++) sum += r();
    expect(sum / 10_000).toBeCloseTo(0.5, 1);
  });
});

describe('loan prepayment', () => {
  it('compares reduce-tenure with reduce-EMI', () => {
    const r = comparePrepayment({ outstanding: 1_000_000, aprPct: 9, monthsLeft: 240, lumpSum: 100_000, extraMonthly: 0 });
    expect(r.emi).toBe(8997.26);
    expect(r.baseline.months).toBe(240);
    expect(r.reduceEmi.newEmi).toBe(8097.53);
    expect(r.reduceTenure.months).toBe(186); // closed form 185.65 → 186
    expect(r.reduceTenure.monthsSaved).toBe(54);
    expect(r.better).toBe('reduceTenure');
    expect(r.reduceTenure.interestSaved).toBeGreaterThan(r.reduceEmi.interestSaved);
  });

  it('a lump sum that clears the loan leaves nothing to pay', () => {
    const r = comparePrepayment({ outstanding: 50_000, aprPct: 10, monthsLeft: 12, lumpSum: 80_000, extraMonthly: 0 });
    expect(r.reduceTenure.months).toBe(0);
    expect(r.reduceEmi.newEmi).toBe(0);
  });

  it('the loan without prepayment ends exactly on its last month (TC-W-PRE-006)', () => {
    for (const monthsLeft of [12, 240, 480]) {
      const r = comparePrepayment({ outstanding: 50_000, aprPct: 10, monthsLeft, lumpSum: 80_000, extraMonthly: 0 });
      expect(r.baseline.months).toBe(monthsLeft);
      expect(r.reduceTenure.monthsSaved).toBe(monthsLeft);
    }
  });
});

describe('plan limits and CSV', () => {
  it('free has limits, Pro does not', () => {
    expect(limitFor('debts', false)).toBe(3);
    expect(limitFor('debts', true)).toBe(Infinity);
  });

  it('escapes CSV and blocks formula injection', () => {
    expect(toCsv(['a', 'b'], [['x,y', '=SUM(A1)'], [-12.5, 'say "hi"']])).toBe('a,b\r\n"x,y",\'=SUM(A1)\r\n-12.5,"say ""hi"""\r\n');
  });
});
