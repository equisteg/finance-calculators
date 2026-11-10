/**
 * Debt payoff planner: snowball, avalanche or your own order, month by month.
 *
 * Money is held in integer minor units (paise/cents) inside the simulation. Each month, for every open debt:
 *   1. interest = round(balance × APR / 12 / 100) is added (monthly compounding of a nominal APR, the way
 *      card issuers and lenders state it),
 *   2. the minimum payment (or the whole balance, if smaller) is paid,
 *   3. whatever is left of the monthly budget goes to the first open debt in strategy order; when it is cleared the
 *      rest rolls to the next ("snowball effect").
 * Strategies: avalanche = highest APR first (least interest; Investopedia "Debt Avalanche"), snowball = smallest
 * balance first (quick wins; popularised by D. Ramsey), custom = the order given, minimum = minimums only, no
 * extra and no roll-over (the baseline the others are compared with).
 */

export type DebtStrategy = 'avalanche' | 'snowball' | 'custom' | 'minimum';

export interface Debt {
  id: string;
  name: string;
  balance: number;
  aprPct: number;
  minPayment: number;
}

export interface DebtMonth {
  month: number;
  interest: number;
  paid: number;
  balance: number;
}

export interface DebtPayoff {
  id: string;
  name: string;
  /** 1-based month in which the debt reaches zero; null when it is never cleared within the horizon. */
  month: number | null;
  interest: number;
}

export interface DebtPlan {
  strategy: DebtStrategy;
  /** False when the budget cannot cover the minimums, or a debt never shrinks. */
  feasible: boolean;
  reason?: string;
  months: number;
  totalInterest: number;
  totalPaid: number;
  payoffs: DebtPayoff[];
  schedule: DebtMonth[];
}

/** 50 years: anything longer is reported as not feasible. */
export const MAX_MONTHS = 600;

const toMinor = (n: number) => (Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0);
const fromMinor = (n: number) => n / 100;

export function orderDebts(debts: Debt[], strategy: DebtStrategy): Debt[] {
  const list = [...debts];
  if (strategy === 'avalanche') list.sort((a, b) => b.aprPct - a.aprPct || a.balance - b.balance);
  if (strategy === 'snowball') list.sort((a, b) => a.balance - b.balance || b.aprPct - a.aprPct);
  return list;
}

/**
 * Plans payoff for `debts` with `monthlyBudget` available for debt each month (must cover the minimums).
 * For 'minimum', the budget is ignored and each debt gets only its own minimum.
 */
export function planDebtPayoff(debts: Debt[], monthlyBudget: number, strategy: DebtStrategy): DebtPlan {
  const ordered = orderDebts(debts, strategy);
  const state = ordered.map((d) => ({
    d,
    bal: toMinor(d.balance),
    min: toMinor(d.minPayment),
    rate: Number.isFinite(d.aprPct) && d.aprPct > 0 ? d.aprPct / 1200 : 0,
    interest: 0,
    month: null as number | null,
  }));
  const minTotal = state.reduce((s, x) => s + (x.bal > 0 ? x.min : 0), 0);
  const budget = strategy === 'minimum' ? minTotal : toMinor(monthlyBudget);

  const empty = (reason: string): DebtPlan => ({
    strategy,
    feasible: false,
    reason,
    months: 0,
    totalInterest: 0,
    totalPaid: 0,
    payoffs: state.map((x) => ({ id: x.d.id, name: x.d.name, month: x.bal === 0 ? 0 : null, interest: 0 })),
    schedule: [],
  });

  if (state.every((x) => x.bal === 0)) return { ...empty(''), feasible: true, reason: undefined };
  if (budget < minTotal) return empty('Your monthly budget is less than the total of the minimum payments.');

  const schedule: DebtMonth[] = [];
  let totalInterest = 0;
  let totalPaid = 0;
  let month = 0;

  while (state.some((x) => x.bal > 0) && month < MAX_MONTHS) {
    month++;
    let interestThisMonth = 0;
    let paidThisMonth = 0;
    for (const x of state) {
      if (x.bal <= 0) continue;
      const i = Math.round(x.bal * x.rate);
      x.bal += i;
      x.interest += i;
      interestThisMonth += i;
    }
    let left = budget;
    for (const x of state) {
      if (x.bal <= 0) continue;
      const pay = Math.min(x.min, x.bal, left);
      x.bal -= pay;
      left -= pay;
      paidThisMonth += pay;
    }
    if (strategy !== 'minimum') {
      for (const x of state) {
        if (left <= 0) break;
        if (x.bal <= 0) continue;
        const pay = Math.min(x.bal, left);
        x.bal -= pay;
        left -= pay;
        paidThisMonth += pay;
      }
    }
    for (const x of state) if (x.bal === 0 && x.month === null) x.month = month;
    totalInterest += interestThisMonth;
    totalPaid += paidThisMonth;
    schedule.push({
      month,
      interest: fromMinor(interestThisMonth),
      paid: fromMinor(paidThisMonth),
      balance: fromMinor(state.reduce((s, x) => s + x.bal, 0)),
    });
    // A debt whose minimum does not cover its interest, with nothing extra to spare, never shrinks.
    if (month === 1 && paidThisMonth <= interestThisMonth) {
      return empty('Your payments do not cover the interest, so the debt would keep growing.');
    }
  }

  const done = state.every((x) => x.bal === 0);
  return {
    strategy,
    feasible: done,
    reason: done ? undefined : 'Not paid off within 50 years at this budget.',
    months: month,
    totalInterest: fromMinor(totalInterest),
    totalPaid: fromMinor(totalPaid),
    payoffs: state.map((x) => ({ id: x.d.id, name: x.d.name, month: x.month, interest: fromMinor(x.interest) })),
    schedule,
  };
}

export interface DebtComparison {
  minimum: DebtPlan;
  avalanche: DebtPlan;
  snowball: DebtPlan;
  /** Strategy with the least interest (avalanche wins ties). */
  best: 'avalanche' | 'snowball';
  /** Interest the best plan saves compared with paying only the minimums (0 when the baseline never finishes). */
  interestSaved: number;
  monthsSaved: number;
}

export function compareDebtStrategies(debts: Debt[], monthlyBudget: number): DebtComparison {
  const minimum = planDebtPayoff(debts, monthlyBudget, 'minimum');
  const avalanche = planDebtPayoff(debts, monthlyBudget, 'avalanche');
  const snowball = planDebtPayoff(debts, monthlyBudget, 'snowball');
  const best = snowball.feasible && (!avalanche.feasible || snowball.totalInterest < avalanche.totalInterest) ? 'snowball' : 'avalanche';
  const chosen = best === 'avalanche' ? avalanche : snowball;
  const baselineOk = minimum.feasible && chosen.feasible;
  return {
    minimum,
    avalanche,
    snowball,
    best,
    interestSaved: baselineOk ? Math.max(0, Math.round((minimum.totalInterest - chosen.totalInterest) * 100) / 100) : 0,
    monthsSaved: baselineOk ? Math.max(0, minimum.months - chosen.months) : 0,
  };
}
