/**
 * Universal money tools that work in any currency and any country.
 *
 * Every function is pure, takes plain numbers and returns plain numbers, so the
 * web pages, the app and the golden tests share one copy of every formula.
 * Inputs that make no sense (negative amounts, NaN) are treated as 0 rather
 * than throwing, so a half-typed form never crashes the page.
 *
 * Formula sources are listed in docs/LLD.md §3 ("Universal tools").
 */

const num = (n: number) => (Number.isFinite(n) ? n : 0);
const pos = (n: number) => Math.max(0, num(n));
const r2 = (n: number) => Math.round(n * 100) / 100;

/* ------------------------------------------------------------------ */
/* Growth, inflation and returns                                        */
/* ------------------------------------------------------------------ */

export interface InflationResult {
  /** What the same basket will cost after `years`. */
  futureCost: number;
  /** What today's amount will buy after `years`, in today's money. */
  purchasingPower: number;
  /** Share of value lost, 0..100. */
  lossPct: number;
}

/** Compound inflation: FV = PV x (1 + i)^n. */
export function inflationImpact(amount: number, inflationPct: number, years: number): InflationResult {
  const a = pos(amount);
  const factor = Math.pow(1 + num(inflationPct) / 100, pos(years));
  const purchasingPower = factor > 0 ? a / factor : 0;
  return {
    futureCost: Math.round(a * factor),
    purchasingPower: Math.round(purchasingPower),
    lossPct: a > 0 ? r2((1 - purchasingPower / a) * 100) : 0,
  };
}

/** Real (inflation-adjusted) return by the Fisher equation: (1 + n) / (1 + i) - 1, in %. */
export function realReturnPct(nominalPct: number, inflationPct: number): number {
  return r2(((1 + num(nominalPct) / 100) / (1 + num(inflationPct) / 100) - 1) * 100);
}

/** Compound annual growth rate in %: (end / start)^(1 / years) - 1. Null when undefined. */
export function cagr(startValue: number, endValue: number, years: number): number | null {
  const s = num(startValue);
  const e = num(endValue);
  const y = num(years);
  if (s <= 0 || e < 0 || y <= 0) return null;
  return r2((Math.pow(e / s, 1 / y) - 1) * 100);
}

export interface DoublingTime {
  /** Rule of 72 estimate, in years. */
  ruleOf72: number;
  /** Exact answer ln 2 / ln(1 + r), in years. */
  exact: number;
}

/** Years for money to double at `ratePct` a year, compounded yearly. Null for rates <= 0. */
export function doublingTime(ratePct: number): DoublingTime | null {
  const r = num(ratePct);
  if (r <= 0) return null;
  return { ruleOf72: r2(72 / r), exact: r2(Math.log(2) / Math.log(1 + r / 100)) };
}

export interface InterestResult {
  principal: number;
  interest: number;
  maturity: number;
}

/** Simple interest: I = P x r x t. */
export function simpleInterest(principal: number, ratePct: number, years: number): InterestResult {
  const p = pos(principal);
  const interest = (p * pos(ratePct) * pos(years)) / 100;
  return { principal: Math.round(p), interest: Math.round(interest), maturity: Math.round(p + interest) };
}

/**
 * Recurring deposit with quarterly compounding (the method Indian banks use).
 * Each monthly instalment is paid at the start of its month and earns
 * compound interest for the time it stays in the account:
 *   M = sum over k = 1..n of P x (1 + r/4)^(4 x (n - k + 1) / 12)
 */
export function recurringDeposit(monthly: number, ratePct: number, months: number): InterestResult {
  const p = pos(monthly);
  const n = Math.round(pos(months));
  const q = pos(ratePct) / 400;
  let maturity = 0;
  for (let k = 1; k <= n; k++) maturity += p * Math.pow(1 + q, (4 * (n - k + 1)) / 12);
  const principal = p * n;
  return { principal: Math.round(principal), interest: Math.round(maturity - principal), maturity: Math.round(maturity) };
}

/**
 * Yearly deposit at the start of each year, compounded yearly (PPF, many
 * pension and long-term savings schemes): annuity-due.
 */
export function yearlyDepositGrowth(yearly: number, ratePct: number, years: number): InterestResult {
  const p = pos(yearly);
  const r = num(ratePct) / 100;
  const n = Math.round(pos(years));
  let balance = 0;
  for (let y = 0; y < n; y++) balance = (balance + p) * (1 + r);
  const principal = p * n;
  return { principal: Math.round(principal), interest: Math.round(balance - principal), maturity: Math.round(balance) };
}

/** Monthly saving needed to reach `target` in `years` at `ratePct` (end-of-month deposits). */
export function monthlySavingForTarget(target: number, currentSavings: number, ratePct: number, years: number): number {
  const months = Math.round(pos(years) * 12);
  if (months === 0) return Math.max(0, Math.round(pos(target) - pos(currentSavings)));
  const r = num(ratePct) / 1200;
  const grownSavings = pos(currentSavings) * Math.pow(1 + r, months);
  const gap = pos(target) - grownSavings;
  if (gap <= 0) return 0;
  const factor = r === 0 ? months : (Math.pow(1 + r, months) - 1) / r;
  return Math.round(gap / factor);
}

/* ------------------------------------------------------------------ */
/* Investment appraisal: NPV, IRR, XIRR                                 */
/* ------------------------------------------------------------------ */

/** Net present value; cashFlows[0] happens now (t = 0), then one per period. */
export function npv(ratePct: number, cashFlows: number[]): number {
  const r = num(ratePct) / 100;
  return r2(cashFlows.reduce((sum, cf, t) => sum + num(cf) / Math.pow(1 + r, t), 0));
}

/**
 * Solves f(rate) = 0 by bisection. The lower bound starts at -99.99% and moves
 * toward 0 while f overflows there (long series make (1 + r)^-n huge), so long
 * loans and 100+ period series still solve. Returns the rate as a fraction, or null.
 */
function solveRate(f: (r: number) => number): number | null {
  let lo = -0.9999;
  while (!Number.isFinite(f(lo)) && lo < -1e-6) lo /= 2;
  let hi = 10_000;
  let flo = f(lo);
  const fhi = f(hi);
  if (!Number.isFinite(flo) || !Number.isFinite(fhi) || flo * fhi > 0) return null;
  for (let i = 0; i < 300; i++) {
    const mid = (lo + hi) / 2;
    const fm = f(mid);
    if (Math.abs(fm) < 1e-9 || hi - lo < 1e-12) return mid;
    if (flo * fm < 0) hi = mid;
    else {
      lo = mid;
      flo = fm;
    }
  }
  return (lo + hi) / 2;
}

/** Number of sign changes in a series (zeros skipped). More than one means IRR may not be unique. */
export function signChanges(cashFlows: number[]): number {
  let changes = 0;
  let last = 0;
  for (const cf of cashFlows.map(num)) {
    if (cf === 0) continue;
    if (last !== 0 && Math.sign(cf) !== Math.sign(last)) changes++;
    last = cf;
  }
  return changes;
}

/**
 * Internal rate of return per period, in %. Needs at least one negative and
 * one positive flow and exactly one sign change (otherwise there may be several
 * rates; use NPV instead). Null when no single rate gives NPV 0.
 */
export function irr(cashFlows: number[]): number | null {
  const flows = cashFlows.map(num);
  if (signChanges(flows) !== 1) return null;
  const r = solveRate((x) => flows.reduce((s, cf, t) => s + cf / Math.pow(1 + x, t), 0));
  return r === null ? null : r2(r * 100);
}

export interface DatedFlow {
  /** ISO date, YYYY-MM-DD. */
  date: string;
  amount: number;
}

/** Parses YYYY-MM-DD as UTC midnight; null for malformed or impossible dates such as 2026-02-30. */
export function parseIsoDate(date: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
  if (!m) return null;
  const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(t);
  return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3]) ? t : null;
}

/** Annualised return for irregular dated flows (same convention as spreadsheet XIRR, 365-day year). */
export function xirr(flows: DatedFlow[]): number | null {
  const parsed = flows
    .map((f) => ({ t: parseIsoDate(f.date), a: num(f.amount) }))
    .filter((f): f is { t: number; a: number } => f.t !== null);
  if (parsed.length < 2 || !parsed.some((f) => f.a < 0) || !parsed.some((f) => f.a > 0)) return null;
  const t0 = Math.min(...parsed.map((f) => f.t));
  const yearsOf = (t: number) => (t - t0) / (365 * 86_400_000);
  const r = solveRate((x) => parsed.reduce((s, f) => s + f.a / Math.pow(1 + x, yearsOf(f.t)), 0));
  return r === null ? null : r2(r * 100);
}

/* ------------------------------------------------------------------ */
/* Borrowing                                                            */
/* ------------------------------------------------------------------ */

export interface CardPayoff {
  /** Months to clear the balance, or null if the payment never clears it. */
  months: number | null;
  totalInterest: number;
  totalPaid: number;
  /** The smallest fixed payment that beats the first month's interest. */
  minimumToMakeProgress: number;
}

/**
 * Credit card payoff with a fixed monthly payment. Interest is charged monthly
 * at APR / 12 on the balance carried, before the payment. Capped at 600 months.
 */
export function creditCardPayoff(balance: number, aprPct: number, monthlyPayment: number): CardPayoff {
  let b = pos(balance);
  const r = pos(aprPct) / 1200;
  const pay = pos(monthlyPayment);
  const minimumToMakeProgress = Math.floor(b * r) + 1;
  let interest = 0;
  let paid = 0;
  let months = 0;
  while (b > 0.005 && months < 600) {
    const i = b * r;
    if (pay <= i) return { months: null, totalInterest: 0, totalPaid: 0, minimumToMakeProgress };
    interest += i;
    b += i;
    const p = Math.min(pay, b);
    b -= p;
    paid += p;
    months++;
  }
  if (b > 0.005) return { months: null, totalInterest: 0, totalPaid: 0, minimumToMakeProgress };
  return { months, totalInterest: Math.round(interest), totalPaid: Math.round(paid), minimumToMakeProgress };
}

export interface Affordability {
  /** Largest new monthly payment that keeps all debt payments within the limit. */
  maxMonthlyPayment: number;
  /** Loan that payment supports at the given rate and term. */
  maxLoan: number;
}

/**
 * How much you can borrow: lenders cap all debt payments at a share of gross
 * monthly income (FOIR in India, debt-to-income ratio elsewhere; 40-50% and
 * 36-43% are common). Present value of the payment over the term.
 */
export function loanAffordability(
  monthlyIncome: number,
  existingMonthlyDebts: number,
  maxDebtSharePct: number,
  ratePct: number,
  years: number
): Affordability {
  const maxMonthlyPayment = Math.max(0, pos(monthlyIncome) * (pos(maxDebtSharePct) / 100) - pos(existingMonthlyDebts));
  const n = Math.round(pos(years) * 12);
  const r = pos(ratePct) / 1200;
  const maxLoan = n === 0 ? 0 : r === 0 ? maxMonthlyPayment * n : (maxMonthlyPayment * (1 - Math.pow(1 + r, -n))) / r;
  return { maxMonthlyPayment: Math.round(maxMonthlyPayment), maxLoan: Math.round(maxLoan) };
}

/**
 * True annual cost of a loan with an up-front fee: the rate at which the money
 * you actually receive (principal - fee) equals the present value of the payments.
 */
export function effectiveLoanRatePct(principal: number, ratePct: number, years: number, upfrontFee: number): number | null {
  const n = Math.round(pos(years) * 12);
  const p = pos(principal);
  if (n === 0 || p === 0) return null;
  const r = pos(ratePct) / 1200;
  const pmt = r === 0 ? p / n : (p * r) / (1 - Math.pow(1 + r, -n));
  const received = p - pos(upfrontFee);
  if (received <= 0) return null;
  const monthly = solveRate((x) => {
    if (x === 0) return pmt * n - received;
    return (pmt * (1 - Math.pow(1 + x, -n))) / x - received;
  });
  return monthly === null ? null : r2(monthly * 1200);
}

export interface FlatRateResult {
  emi: number;
  totalInterest: number;
  /** The reducing-balance rate that gives the same EMI. */
  effectiveRatePct: number | null;
}

/**
 * Flat-rate loans (common for car, two-wheeler and consumer loans): interest
 * is charged on the full original principal for the whole term. Shows the
 * equivalent reducing-balance rate, which is usually close to double.
 */
export function flatRateLoan(principal: number, flatRatePct: number, years: number): FlatRateResult {
  const p = pos(principal);
  const n = Math.round(pos(years) * 12);
  const totalInterest = (p * pos(flatRatePct) * pos(years)) / 100;
  const emi = n === 0 ? 0 : (p + totalInterest) / n;
  const monthly = n === 0 || p === 0 || totalInterest === 0 ? null : solveRate((x) => (x === 0 ? emi * n - p : (emi * (1 - Math.pow(1 + x, -n))) / x - p));
  return {
    emi: Math.round(emi),
    totalInterest: Math.round(totalInterest),
    effectiveRatePct: totalInterest === 0 ? 0 : monthly === null ? null : r2(monthly * 1200),
  };
}

/* ------------------------------------------------------------------ */
/* Housing: rent or buy                                                 */
/* ------------------------------------------------------------------ */

export interface RentVsBuyInput {
  homePrice: number;
  downPayment: number;
  loanRatePct: number;
  loanYears: number;
  /** One-off purchase costs (stamp duty, fees), as % of price. */
  buyingCostsPct: number;
  /** Yearly maintenance, insurance and property tax, as % of price. */
  ownershipCostsPct: number;
  homeGrowthPct: number;
  monthlyRent: number;
  rentGrowthPct: number;
  /** What the renter earns by investing the down payment and the monthly difference. */
  investReturnPct: number;
  /** How long you stay. */
  years: number;
  /** Selling costs (agent, legal), as % of the sale price. */
  sellingCostsPct: number;
}

export interface RentVsBuyResult {
  /** Buyer's net worth at the end: home equity after selling costs. */
  buyerWealth: number;
  /** Renter's net worth at the end: investments built from what they did not spend. */
  renterWealth: number;
  better: 'buy' | 'rent';
  difference: number;
}

/**
 * Compares net worth after `years` for a buyer and a renter who start with the
 * same cash and spend the same each month. Whoever pays less in a month
 * invests the difference. Ignores tax, which varies by country.
 */
export function rentVsBuy(input: RentVsBuyInput): RentVsBuyResult {
  const price = pos(input.homePrice);
  const down = Math.min(pos(input.downPayment), price);
  const loan = price - down;
  const n = Math.round(pos(input.loanYears) * 12);
  const lr = pos(input.loanRatePct) / 1200;
  const emi = n === 0 ? 0 : lr === 0 ? loan / n : (loan * lr) / (1 - Math.pow(1 + lr, -n));
  const months = Math.round(pos(input.years) * 12);
  const ir = num(input.investReturnPct) / 1200;
  const hg = Math.max(-0.99, num(input.homeGrowthPct) / 100);

  let balance = loan;
  let rent = pos(input.monthlyRent);
  let homeValue = price;
  let renterPot = down + (price * pos(input.buyingCostsPct)) / 100; // renter keeps the cash the buyer spent up front
  let buyerPot = 0;

  for (let m = 1; m <= months; m++) {
    const ownership = (homeValue * pos(input.ownershipCostsPct)) / 100 / 12;
    let loanPayment = 0;
    if (balance > 0.005) {
      const interest = balance * lr;
      loanPayment = Math.min(emi, balance + interest);
      balance = balance + interest - loanPayment;
    }
    const buyerOut = loanPayment + ownership;
    renterPot *= 1 + ir;
    buyerPot *= 1 + ir;
    if (buyerOut > rent) renterPot += buyerOut - rent;
    else buyerPot += rent - buyerOut;
    homeValue *= Math.pow(1 + hg, 1 / 12);
    if (m % 12 === 0) rent *= 1 + num(input.rentGrowthPct) / 100;
  }

  const equity = homeValue * (1 - pos(input.sellingCostsPct) / 100) - Math.max(0, balance);
  const buyerWealth = Math.round(equity + buyerPot);
  const renterWealth = Math.round(renterPot);
  return {
    buyerWealth,
    renterWealth,
    better: buyerWealth >= renterWealth ? 'buy' : 'rent',
    difference: Math.abs(buyerWealth - renterWealth),
  };
}

/* ------------------------------------------------------------------ */
/* Everyday money                                                       */
/* ------------------------------------------------------------------ */

export interface BudgetSplit {
  needs: number;
  wants: number;
  savings: number;
}

/** The 50/30/20 rule of thumb (Warren & Tyagi, "All Your Worth", 2005), on take-home pay. */
export function budget503020(monthlyTakeHome: number, needsPct = 50, wantsPct = 30): BudgetSplit {
  const t = pos(monthlyTakeHome);
  const needs = Math.round((t * pos(needsPct)) / 100);
  const wants = Math.round((t * pos(wantsPct)) / 100);
  return { needs, wants, savings: Math.max(0, Math.round(t) - needs - wants) };
}

export interface EmergencyFund {
  target: number;
  gap: number;
  /** Months to fill the gap at the given monthly saving, or null if saving is 0. */
  monthsToTarget: number | null;
  coveredMonths: number;
}

/** Emergency fund of `monthsCover` x essential monthly spending (3-6 months is the common guide). */
export function emergencyFund(monthlyEssentials: number, monthsCover: number, saved: number, monthlySaving: number): EmergencyFund {
  const e = pos(monthlyEssentials);
  const target = Math.round(e * pos(monthsCover));
  const gap = Math.max(0, target - Math.round(pos(saved)));
  const s = pos(monthlySaving);
  return {
    target,
    gap,
    monthsToTarget: gap === 0 ? 0 : s > 0 ? Math.ceil(gap / s) : null,
    coveredMonths: e > 0 ? r2(pos(saved) / e) : 0,
  };
}

export interface NetWorth {
  assets: number;
  liabilities: number;
  netWorth: number;
  /** Liabilities as % of assets, or null with no assets. */
  debtToAssetPct: number | null;
}

export function netWorth(assets: number[], liabilities: number[]): NetWorth {
  const a = assets.reduce((s, x) => s + pos(x), 0);
  const l = liabilities.reduce((s, x) => s + pos(x), 0);
  return { assets: Math.round(a), liabilities: Math.round(l), netWorth: Math.round(a - l), debtToAssetPct: a > 0 ? r2((l / a) * 100) : null };
}

/** What is `pct` % of `value`. */
export const percentOf = (pct: number, value: number) => r2((num(pct) * num(value)) / 100);

/** Change from `from` to `to`, in %. Null when `from` is 0. */
export const percentChange = (from: number, to: number) => (num(from) === 0 ? null : r2(((num(to) - num(from)) / Math.abs(num(from))) * 100));

export interface DiscountResult {
  finalPrice: number;
  saved: number;
  /** Combined discount when two discounts stack, in %. */
  effectivePct: number;
}

/** One discount, or two stacked discounts applied one after the other (not added). */
export function discount(price: number, pct: number, secondPct = 0): DiscountResult {
  const p = pos(price);
  const finalPrice = p * (1 - Math.min(100, pos(pct)) / 100) * (1 - Math.min(100, pos(secondPct)) / 100);
  return { finalPrice: r2(finalPrice), saved: r2(p - finalPrice), effectivePct: p > 0 ? r2((1 - finalPrice / p) * 100) : 0 };
}

export interface MarginResult {
  profit: number;
  marginPct: number | null;
  markupPct: number | null;
}

/** Margin is profit / price; markup is profit / cost. They are often confused. */
export function marginMarkup(cost: number, price: number): MarginResult {
  const c = num(cost);
  const p = num(price);
  return { profit: r2(p - c), marginPct: p === 0 ? null : r2(((p - c) / p) * 100), markupPct: c === 0 ? null : r2(((p - c) / c) * 100) };
}

export interface BreakEven {
  /** Units to sell before profit starts, or null when each sale loses money. */
  units: number | null;
  revenue: number | null;
}

export function breakEven(fixedCosts: number, pricePerUnit: number, variableCostPerUnit: number): BreakEven {
  const contribution = num(pricePerUnit) - num(variableCostPerUnit);
  if (contribution <= 0) return { units: null, revenue: null };
  const units = Math.ceil(pos(fixedCosts) / contribution);
  return { units, revenue: r2(units * num(pricePerUnit)) };
}

/** Annual salary to hourly, weekly and monthly, for a given working week. */
export function salaryBreakdown(annual: number, hoursPerWeek = 40, weeksPerYear = 52) {
  const a = pos(annual);
  const w = pos(weeksPerYear) || 52;
  const h = pos(hoursPerWeek) || 40;
  return { monthly: r2(a / 12), weekly: r2(a / w), daily: r2(a / w / 5), hourly: r2(a / w / h) };
}

/** Tip split: total with tip and each person's share. */
export function tipSplit(bill: number, tipPct: number, people: number) {
  const b = pos(bill);
  const tip = (b * pos(tipPct)) / 100;
  const n = Math.max(1, Math.round(pos(people)));
  return { tip: r2(tip), total: r2(b + tip), perPerson: r2((b + tip) / n) };
}

/* ------------------------------------------------------------------ */
/* Retirement income                                                    */
/* ------------------------------------------------------------------ */

/**
 * Corpus needed to fund `monthlyExpense` (in today's money) for `yearsInRetirement`,
 * starting in `yearsToRetire`. Expenses grow with inflation; the corpus earns
 * `returnPct` in retirement. Monthly withdrawals at the start of each month.
 */
export function retirementCorpusNeeded(
  monthlyExpense: number,
  yearsToRetire: number,
  yearsInRetirement: number,
  inflationPct: number,
  returnPct: number
): { firstYearMonthlyExpense: number; corpus: number } {
  const i = num(inflationPct) / 100;
  const firstMonthly = pos(monthlyExpense) * Math.pow(1 + i, pos(yearsToRetire));
  const n = Math.round(pos(yearsInRetirement) * 12);
  const rm = Math.pow(1 + num(returnPct) / 100, 1 / 12) - 1;
  const gm = Math.pow(1 + i, 1 / 12) - 1;
  let corpus = 0;
  for (let k = 0; k < n; k++) corpus += (firstMonthly * Math.pow(1 + gm, k)) / Math.pow(1 + rm, k);
  return { firstYearMonthlyExpense: Math.round(firstMonthly), corpus: Math.round(corpus) };
}
