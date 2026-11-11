/**
 * Goal planner: what a goal will cost in the future, and the monthly saving that gets there.
 *
 * Formulas (docs/LLD.md):
 *   future cost      = cost today × (1 + inflation)^years
 *   savings grow to  = current savings × (1 + r/12)^(12 × years)            (monthly compounding)
 *   monthly saving   = gap ÷ F, where F is the future value of saving 1 a month at the start of each month
 *                      (annuity-due, the same convention as sipFutureValue), raised by `stepUpPct` every year.
 *   Without step-up F = ((1 + i)^n − 1) / i × (1 + i), i = r/12, n = 12 × years (standard annuity-due FV).
 */

export interface Goal {
  id: string;
  name: string;
  /** What the goal costs in today's money. */
  costToday: number;
  years: number;
  inflationPct: number;
  /** Expected yearly return on the money saved for this goal. */
  returnPct: number;
  /** Already saved towards this goal. */
  currentSavings: number;
  /** Raise the monthly saving by this % each year (0 = flat). */
  stepUpPct?: number;
}

export interface GoalPlan {
  id: string;
  name: string;
  futureCost: number;
  savingsGrowTo: number;
  gap: number;
  /** First-year monthly saving needed (later years rise by stepUpPct). */
  monthlyNeeded: number;
}

const nonNeg = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

/** Future value of saving 1 a month at the start of each month for `years`, stepping up yearly. */
export function monthlySavingFactor(returnPct: number, years: number, stepUpPct = 0): number {
  const i = nonNeg(returnPct) / 1200;
  // At most 100 years (1,200 months), whatever the inputs say, so the step-up loop stays short.
  const n = Math.min(1200, Math.round(nonNeg(years) * 12));
  if (n === 0) return 0;
  if (!stepUpPct) return i === 0 ? n : ((Math.pow(1 + i, n) - 1) / i) * (1 + i);
  let fv = 0;
  let deposit = 1;
  for (let m = 0; m < n; m++) {
    if (m > 0 && m % 12 === 0) deposit *= 1 + stepUpPct / 100;
    fv = (fv + deposit) * (1 + i);
  }
  return fv;
}

export function planGoal(goal: Goal): GoalPlan {
  const years = nonNeg(goal.years);
  const futureCost = nonNeg(goal.costToday) * Math.pow(1 + (goal.inflationPct || 0) / 100, years);
  const savingsGrowTo = nonNeg(goal.currentSavings) * Math.pow(1 + nonNeg(goal.returnPct) / 1200, Math.round(years * 12));
  const gap = Math.max(0, futureCost - savingsGrowTo);
  const factor = monthlySavingFactor(goal.returnPct, years, goal.stepUpPct ?? 0);
  return {
    id: goal.id,
    name: goal.name,
    futureCost: Math.round(futureCost),
    savingsGrowTo: Math.round(savingsGrowTo),
    gap: Math.round(gap),
    monthlyNeeded: gap === 0 ? 0 : factor > 0 ? Math.ceil(gap / factor) : Math.round(gap),
  };
}

export interface FundedGoal extends GoalPlan {
  /** Monthly amount this goal gets from the budget, in priority order. */
  allocated: number;
  /** 0..1 share of the needed monthly saving that is covered. */
  funded: number;
}

export interface GoalsPlan {
  goals: FundedGoal[];
  totalNeeded: number;
  budget: number;
  /** Positive = left over after every goal is funded; negative = shortfall. */
  surplus: number;
}

/** Funds goals in the order given (highest priority first) from one monthly budget. */
export function planGoals(goals: Goal[], monthlyBudget: number): GoalsPlan {
  let left = nonNeg(monthlyBudget);
  const planned = goals.map((g) => {
    const p = planGoal(g);
    const allocated = Math.min(left, p.monthlyNeeded);
    left -= allocated;
    return { ...p, allocated, funded: p.monthlyNeeded === 0 ? 1 : allocated / p.monthlyNeeded };
  });
  const totalNeeded = planned.reduce((s, g) => s + g.monthlyNeeded, 0);
  return { goals: planned, totalNeeded, budget: nonNeg(monthlyBudget), surplus: nonNeg(monthlyBudget) - totalNeeded };
}
