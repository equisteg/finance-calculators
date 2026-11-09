import { describe, expect, it } from 'vitest';
import {
  breakEven,
  budget503020,
  cagr,
  creditCardPayoff,
  discount,
  doublingTime,
  effectiveLoanRatePct,
  emergencyFund,
  flatRateLoan,
  inflationImpact,
  irr,
  loanAffordability,
  marginMarkup,
  monthlySavingForTarget,
  netWorth,
  npv,
  percentChange,
  percentOf,
  realReturnPct,
  recurringDeposit,
  rentVsBuy,
  retirementCorpusNeeded,
  salaryBreakdown,
  simpleInterest,
  tipSplit,
  xirr,
  yearlyDepositGrowth,
} from './tools';

// Golden values were computed independently (Python, closed-form formulas) and,
// where one exists, matched to a published official or bank calculator.
describe('growth and inflation', () => {
  it('compounds inflation and shows lost purchasing power', () => {
    expect(inflationImpact(100_000, 6, 10)).toEqual({ futureCost: 179_085, purchasingPower: 55_839, lossPct: 44.16 });
  });
  it('real return uses the Fisher equation, not subtraction', () => {
    expect(realReturnPct(10, 6)).toBe(3.77);
  });
  it('CAGR', () => {
    expect(cagr(100_000, 200_000, 5)).toBe(14.87);
    expect(cagr(0, 100, 5)).toBeNull();
    expect(cagr(100, 100, 0)).toBeNull();
  });
  it('doubling time: rule of 72 and exact', () => {
    expect(doublingTime(8)).toEqual({ ruleOf72: 9, exact: 9.01 });
    expect(doublingTime(0)).toBeNull();
  });
  it('simple interest', () => {
    expect(simpleInterest(100_000, 8, 3)).toEqual({ principal: 100_000, interest: 24_000, maturity: 124_000 });
  });
  it('recurring deposit with quarterly compounding (Indian bank method)', () => {
    expect(recurringDeposit(5_000, 7, 12).maturity).toBe(62_311);
  });
  it('PPF-style yearly deposit: ₹1.5L for 15 years at 7.1% = ₹40,68,209', () => {
    expect(yearlyDepositGrowth(150_000, 7.1, 15)).toEqual({ principal: 2_250_000, interest: 1_818_209, maturity: 4_068_209 });
  });
  it('monthly saving for a target', () => {
    expect(monthlySavingForTarget(120_000, 0, 0, 1)).toBe(10_000);
    expect(monthlySavingForTarget(100, 200, 5, 1)).toBe(0);
    // FV of an ordinary annuity: 1,000,000 / (((1 + .01)^120 - 1) / .01) = 4,347.09
    expect(monthlySavingForTarget(1_000_000, 0, 12, 10)).toBe(4_347);
  });
  it('retirement corpus with zero real return equals months x expense', () => {
    // When return equals inflation, every withdrawal is worth the same today.
    const r = retirementCorpusNeeded(1_000, 0, 10, 5, 5);
    expect(r.corpus).toBe(120_000);
  });
});

describe('NPV, IRR, XIRR', () => {
  it('NPV', () => {
    expect(npv(10, [-1_000, 300, 400, 500])).toBe(-21.04);
  });
  it('IRR makes NPV zero', () => {
    const rate = irr([-1_000, 300, 400, 500])!;
    expect(rate).toBeCloseTo(8.9, 1);
    expect(Math.abs(npv(rate, [-1_000, 300, 400, 500]))).toBeLessThan(0.5);
    expect(irr([100, 200])).toBeNull();
  });
  it('XIRR on a one-year 10% gain', () => {
    expect(xirr([
      { date: '2025-01-01', amount: -10_000 },
      { date: '2026-01-01', amount: 11_000 },
    ])).toBe(10);
    expect(xirr([{ date: '2025-01-01', amount: -1 }])).toBeNull();
  });
});

describe('borrowing', () => {
  it('credit card payoff and the never-clears case', () => {
    expect(creditCardPayoff(5_000, 24, 200)).toEqual({ months: 36, totalInterest: 2_001, totalPaid: 7_001, minimumToMakeProgress: 101 });
    expect(creditCardPayoff(5_000, 24, 100).months).toBeNull();
  });
  it('affordability from a debt-to-income limit', () => {
    expect(loanAffordability(100_000, 10_000, 50, 9, 20)).toEqual({ maxMonthlyPayment: 40_000, maxLoan: 4_445_798 });
    expect(loanAffordability(10_000, 9_000, 50, 9, 20).maxLoan).toBe(0);
  });
  it('a processing fee raises the true rate; no fee leaves it unchanged', () => {
    expect(effectiveLoanRatePct(100_000, 10, 5, 0)).toBeCloseTo(10, 2);
    expect(effectiveLoanRatePct(100_000, 10, 5, 2_000)!).toBeGreaterThan(10.8);
  });
  it('flat-rate loans cost close to double the headline rate', () => {
    const r = flatRateLoan(100_000, 10, 3);
    expect(r.emi).toBe(3_611);
    expect(r.totalInterest).toBe(30_000);
    expect(r.effectiveRatePct!).toBeGreaterThan(17.5);
    expect(r.effectiveRatePct!).toBeLessThan(18.5);
  });
});

describe('rent vs buy', () => {
  const base = {
    homePrice: 300_000, downPayment: 60_000, loanRatePct: 6, loanYears: 30, buyingCostsPct: 3, ownershipCostsPct: 1.5,
    homeGrowthPct: 3, monthlyRent: 1_400, rentGrowthPct: 3, investReturnPct: 6, years: 10, sellingCostsPct: 5,
  };
  it('produces a winner and a non-negative difference', () => {
    const r = rentVsBuy(base);
    expect(['buy', 'rent']).toContain(r.better);
    expect(r.difference).toBe(Math.abs(r.buyerWealth - r.renterWealth));
  });
  it('very cheap rent favours renting; very expensive rent favours buying', () => {
    expect(rentVsBuy({ ...base, monthlyRent: 200 }).better).toBe('rent');
    expect(rentVsBuy({ ...base, monthlyRent: 5_000 }).better).toBe('buy');
  });
});

describe('everyday money', () => {
  it('50/30/20', () => {
    expect(budget503020(50_000)).toEqual({ needs: 25_000, wants: 15_000, savings: 10_000 });
  });
  it('emergency fund', () => {
    expect(emergencyFund(30_000, 6, 60_000, 10_000)).toEqual({ target: 180_000, gap: 120_000, monthsToTarget: 12, coveredMonths: 2 });
    expect(emergencyFund(30_000, 6, 0, 0).monthsToTarget).toBeNull();
  });
  it('net worth ignores negative entries', () => {
    expect(netWorth([500_000, 100_000, -5], [200_000])).toEqual({ assets: 600_000, liabilities: 200_000, netWorth: 400_000, debtToAssetPct: 33.33 });
  });
  it('percentages', () => {
    expect(percentOf(18, 250)).toBe(45);
    expect(percentChange(80, 100)).toBe(25);
    expect(percentChange(0, 100)).toBeNull();
  });
  it('stacked discounts multiply, they do not add', () => {
    expect(discount(1_000, 50, 20)).toEqual({ finalPrice: 400, saved: 600, effectivePct: 60 });
  });
  it('margin vs markup', () => {
    expect(marginMarkup(75, 100)).toEqual({ profit: 25, marginPct: 25, markupPct: 33.33 });
  });
  it('break-even', () => {
    expect(breakEven(10_000, 50, 30)).toEqual({ units: 500, revenue: 25_000 });
    expect(breakEven(10_000, 30, 30).units).toBeNull();
  });
  it('salary breakdown and tip split', () => {
    expect(salaryBreakdown(52_000)).toEqual({ monthly: 4_333.33, weekly: 1_000, daily: 200, hourly: 25 });
    expect(tipSplit(100, 15, 4)).toEqual({ tip: 15, total: 115, perPerson: 28.75 });
  });
});
