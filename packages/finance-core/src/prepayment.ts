/**
 * Loan prepayment: pay a lump sum now (and/or extra every month) and compare
 *   A) keep the EMI, finish sooner (reduce tenure), with
 *   B) keep the end date, pay a smaller EMI (reduce EMI).
 * Amortisation runs in integer minor units; interest each month = round(balance × APR / 1200) (reducing balance).
 * EMI formula: P·r·(1+r)^n / ((1+r)^n − 1) (RBI / bank standard), see finance.ts monthlyInstallment.
 */
import { monthlyInstallment } from './finance';

export interface PrepaymentInput {
  /** Loan balance today. */
  outstanding: number;
  aprPct: number;
  /** Months left on the loan. */
  monthsLeft: number;
  /** One-time part-payment made now. */
  lumpSum: number;
  /** Extra paid every month on top of the EMI (reduce-tenure option only). */
  extraMonthly: number;
}

export interface Amortisation {
  months: number;
  totalInterest: number;
}

export interface PrepaymentResult {
  emi: number;
  baseline: Amortisation;
  reduceTenure: Amortisation & { monthsSaved: number; interestSaved: number };
  reduceEmi: Amortisation & { newEmi: number; interestSaved: number };
  /** The option that saves more interest. */
  better: 'reduceTenure' | 'reduceEmi';
}

const minor = (n: number) => (Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0);

/**
 * Pays `payment` (minor units) a month until the balance is zero; caps at 1200 months.
 * `termMonths` (a scheduled loan): the last instalment clears what is left, as banks do, because the rounded EMI can leave
 * a few paise that would otherwise add a 241st month to a 240-month loan.
 */
export function amortise(balanceMinor: number, aprPct: number, paymentMinor: number, termMonths?: number): Amortisation {
  const r = aprPct > 0 ? aprPct / 1200 : 0;
  let bal = balanceMinor;
  let interest = 0;
  let months = 0;
  while (bal > 0 && months < 1200) {
    const i = Math.round(bal * r);
    if (paymentMinor <= i) return { months: Infinity, totalInterest: Infinity };
    bal += i;
    interest += i;
    months++;
    bal -= months === termMonths ? bal : Math.min(paymentMinor, bal);
  }
  return { months, totalInterest: interest / 100 };
}

export function comparePrepayment(input: PrepaymentInput): PrepaymentResult {
  const n = Math.max(1, Math.round(input.monthsLeft));
  const outstanding = minor(input.outstanding);
  const lump = Math.min(minor(input.lumpSum), outstanding);
  const emiMinor = Math.round(monthlyInstallment(outstanding, input.aprPct, n));
  const baseline = amortise(outstanding, input.aprPct, emiMinor, n);

  const afterLump = outstanding - lump;
  const tenure = amortise(afterLump, input.aprPct, emiMinor + minor(input.extraMonthly));
  const newEmiMinor = afterLump > 0 ? Math.round(monthlyInstallment(afterLump, input.aprPct, n)) : 0;
  const emiOpt = afterLump > 0 ? amortise(afterLump, input.aprPct, newEmiMinor, n) : { months: 0, totalInterest: 0 };

  const r2 = (x: number) => Math.round(x * 100) / 100;
  const reduceTenure = {
    ...tenure,
    monthsSaved: Math.max(0, baseline.months - tenure.months),
    interestSaved: r2(Math.max(0, baseline.totalInterest - tenure.totalInterest)),
  };
  const reduceEmi = {
    ...emiOpt,
    newEmi: newEmiMinor / 100,
    interestSaved: r2(Math.max(0, baseline.totalInterest - emiOpt.totalInterest)),
  };
  return {
    emi: emiMinor / 100,
    baseline,
    reduceTenure,
    reduceEmi,
    better: reduceTenure.interestSaved >= reduceEmi.interestSaved ? 'reduceTenure' : 'reduceEmi',
  };
}
