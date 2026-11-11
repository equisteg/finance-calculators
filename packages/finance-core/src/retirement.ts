/**
 * Retirement planning: a straight-line projection (free) and a Monte Carlo "odds" simulation (Pro).
 *
 * Yearly model, money at the start of each year:
 *   working years:  corpus = (corpus + 12 × monthly saving) × (1 + return)
 *   retired years:  corpus = (corpus − spending) × (1 + return), spending grows with inflation every year
 * Spending entered in today's money is inflated to the first retirement year.
 * Monte Carlo draws each year's return from a normal distribution (mean = expected return, sd = volatility) using a
 * seeded generator, so the same inputs always give the same answer. Normal returns are a simplification; real
 * markets have fatter tails (stated on the page). Success = money lasts to the end of the plan.
 */

export interface RetirementInput {
  currentAge: number;
  retireAge: number;
  /** Plan until this age. */
  planToAge: number;
  currentSavings: number;
  monthlySaving: number;
  /** Yearly spending in retirement, in today's money. */
  yearlySpendingToday: number;
  inflationPct: number;
  /** Expected yearly return before retirement. */
  returnPct: number;
  /** Expected yearly return after retirement (usually lower: safer mix). */
  retiredReturnPct: number;
  /** Standard deviation of yearly returns, e.g. 15 for a mostly-equity mix. */
  volatilityPct: number;
}

export interface RetirementProjection {
  corpusAtRetirement: number;
  /** Corpus needed at retirement so the money lasts to planToAge on the expected returns. */
  corpusNeeded: number;
  firstYearSpending: number;
  /** Age at which the money runs out on expected returns; null when it lasts. */
  runsOutAt: number | null;
  onTrack: boolean;
}

const nonNeg = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

/** A plan never spans more than 120 years, whatever the inputs say (keeps every loop short). */
const MAX_YEARS = 120;
const clampYears = (n: number) => (Number.isFinite(n) ? Math.min(MAX_YEARS, Math.max(0, Math.round(n))) : 0);

function yearsOf(input: RetirementInput) {
  const working = clampYears(input.retireAge - input.currentAge);
  const retired = clampYears(input.planToAge - Math.max(input.retireAge, input.currentAge));
  return { working, retired };
}

/** Runs one path. `ret(y)` gives the return for year y (0-based across the whole plan). */
function runPath(input: RetirementInput, ret: (year: number, retired: boolean) => number) {
  const { working, retired } = yearsOf(input);
  let corpus = nonNeg(input.currentSavings);
  const yearlySaving = nonNeg(input.monthlySaving) * 12;
  for (let y = 0; y < working; y++) corpus = (corpus + yearlySaving) * (1 + ret(y, false));
  const atRetirement = corpus;
  let spending = nonNeg(input.yearlySpendingToday) * Math.pow(1 + input.inflationPct / 100, working);
  let runsOutAt: number | null = null;
  for (let y = 0; y < retired; y++) {
    corpus -= spending;
    if (corpus < 0) {
      runsOutAt = Math.round(Math.max(input.retireAge, input.currentAge) + y);
      corpus = 0;
      break;
    }
    corpus *= 1 + ret(working + y, true);
    spending *= 1 + input.inflationPct / 100;
  }
  return { atRetirement, runsOutAt, end: corpus };
}

export function projectRetirement(input: RetirementInput): RetirementProjection {
  const { working, retired } = yearsOf(input);
  const path = runPath(input, (_y, isRetired) => (isRetired ? input.retiredReturnPct : input.returnPct) / 100);
  const firstYearSpending = nonNeg(input.yearlySpendingToday) * Math.pow(1 + input.inflationPct / 100, working);
  // Present value at retirement of a growing annuity-due: spending grows by g, money earns r.
  const r = input.retiredReturnPct / 100;
  const g = input.inflationPct / 100;
  let needed = 0;
  for (let y = 0; y < retired; y++) needed += (firstYearSpending * Math.pow(1 + g, y)) / Math.pow(1 + r, y);
  return {
    corpusAtRetirement: Math.round(path.atRetirement),
    corpusNeeded: Math.round(needed),
    firstYearSpending: Math.round(firstYearSpending),
    runsOutAt: path.runsOutAt,
    onTrack: path.runsOutAt === null,
  };
}

/** mulberry32: small, fast, seeded PRNG (public domain). Returns floats in [0, 1). */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Standard normal draw (Box-Muller). */
function normal(rand: () => number): number {
  let u = 0;
  while (u === 0) u = rand();
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export interface RetirementOdds {
  runs: number;
  /** 0..1 share of runs where the money lasts to planToAge. */
  successRate: number;
  /** Corpus at retirement: 10th, 50th and 90th percentile. */
  atRetirement: { p10: number; p50: number; p90: number };
  /** Median age the money runs out, among the runs where it does; null when no run fails. */
  medianRunOutAge: number | null;
}

const percentile = (sorted: number[], p: number) =>
  sorted.length === 0 ? 0 : sorted[Math.min(sorted.length - 1, Math.max(0, Math.round((p / 100) * (sorted.length - 1))))];

export function retirementOdds(input: RetirementInput, runs = 1000, seed = 20261103): RetirementOdds {
  const rand = seededRandom(seed);
  const sd = nonNeg(input.volatilityPct) / 100;
  // Volatility scales down after retirement in proportion to the lower expected return (safer mix).
  const sdRetired = input.returnPct > 0 ? sd * Math.min(1, nonNeg(input.retiredReturnPct) / input.returnPct) : sd;
  const totals: number[] = [];
  const failures: number[] = [];
  let ok = 0;
  const n = Math.max(1, Math.min(10_000, Math.round(runs)));
  for (let i = 0; i < n; i++) {
    const path = runPath(input, (_y, isRetired) => {
      const mean = (isRetired ? input.retiredReturnPct : input.returnPct) / 100;
      // A year cannot lose more than everything.
      return Math.max(-0.95, mean + (isRetired ? sdRetired : sd) * normal(rand));
    });
    totals.push(path.atRetirement);
    if (path.runsOutAt === null) ok++;
    else failures.push(path.runsOutAt);
  }
  totals.sort((a, b) => a - b);
  failures.sort((a, b) => a - b);
  return {
    runs: n,
    successRate: ok / n,
    atRetirement: {
      p10: Math.round(percentile(totals, 10)),
      p50: Math.round(percentile(totals, 50)),
      p90: Math.round(percentile(totals, 90)),
    },
    medianRunOutAge: failures.length ? percentile(failures, 50) : null,
  };
}
