/**
 * Financial Health Check: a 0-100 score from six pillars, plus a ranked action list.
 *
 * Educational only. Every threshold is a published rule of thumb, not advice for one person.
 * Sources (also listed in docs/LLD.md, re-checked yearly, RSK-005):
 *   - Savings rate 20 %: the 50/30/20 budget rule (E. Warren & A. Warren Tyagi, "All Your Worth", 2005).
 *   - Emergency fund 3-6 months of essential spending: CFPB "An essential guide to building an emergency fund";
 *     RBI/SEBI investor-education material uses the same range. We score against 6 months.
 *   - Debt-to-income: CFPB explains 43 % as the common mortgage limit and 36 % as a healthier ceiling; we give full
 *     marks at or below 10 % and zero at or above 50 %.
 *   - Retirement savings by age (multiple of yearly income): Fidelity's guideline 1x at 30, 3x at 40, 6x at 50,
 *     8x at 60, 10x at 67.
 *   - Life cover about 10x yearly income when someone depends on you: common insurer and regulator guidance
 *     (IRDAI consumer education uses income replacement). Health cover: any active policy.
 */

export type PillarId = 'savings' | 'emergency' | 'debtLoad' | 'costlyDebt' | 'retirement' | 'protection';

export interface HealthInput {
  /** Take-home income per month. */
  monthlyIncome: number;
  /** Everyday spending per month, not counting loan payments. */
  monthlyExpenses: number;
  /** All loan and card payments per month (EMIs, minimum card payments). */
  monthlyDebtPayments: number;
  /** Cash and liquid savings you could use this week. */
  emergencyFund: number;
  /** Balances on credit cards, personal loans and other borrowing above ~12 % a year. */
  costlyDebt: number;
  /** Retirement and long-term investments (EPF, PPF, NPS, 401(k), ISA, mutual funds, shares). */
  investments: number;
  age: number;
  /** Number of people who depend on your income. */
  dependents: number;
  /** Total term life cover. */
  lifeCover: number;
  hasHealthCover: boolean;
}

export type PillarStatus = 'good' | 'fair' | 'poor';

export interface Pillar {
  id: PillarId;
  title: string;
  /** 0-100 */
  score: number;
  /** Share of the overall score, 0..1. */
  weight: number;
  status: PillarStatus;
  /** The measured value, as shown to the user (e.g. "14 %", "2.5 months"). */
  measure: string;
  /** The rule of thumb it is compared with. */
  target: string;
}

export interface HealthAction {
  pillar: PillarId;
  title: string;
  detail: string;
  /** Points the overall score gains if this pillar reaches full marks. */
  pointsAvailable: number;
  /** Amount of money involved (e.g. top-up needed), 0 when not money-shaped. */
  amount: number;
}

export type Grade = 'Excellent' | 'Good' | 'Fair' | 'Needs attention';

export interface HealthReport {
  score: number;
  grade: Grade;
  pillars: Pillar[];
  /** Ranked: biggest score gain first. */
  actions: HealthAction[];
  metrics: {
    savingsRate: number;
    emergencyMonths: number;
    debtToIncome: number;
    costlyDebtToIncome: number;
    retirementMultiple: number;
    retirementTargetMultiple: number;
    lifeCoverMultiple: number;
    monthlySurplus: number;
  };
}

export const PILLAR_WEIGHTS: Record<PillarId, number> = {
  savings: 0.2,
  emergency: 0.2,
  debtLoad: 0.2,
  costlyDebt: 0.1,
  retirement: 0.15,
  protection: 0.15,
};

export const TARGETS = {
  savingsRate: 0.2,
  emergencyMonths: 6,
  debtToIncomeFull: 0.1,
  debtToIncomeZero: 0.5,
  costlyDebtToIncomeZero: 0.5,
  lifeCoverMultiple: 10,
} as const;

/** Fidelity's savings-by-age guideline as [age, multiple of yearly income]. */
const RETIREMENT_CURVE: [number, number][] = [
  [25, 0],
  [30, 1],
  [40, 3],
  [50, 6],
  [60, 8],
  [67, 10],
];

const clamp01 = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);
const nonNeg = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);
const pct = (n: number) => `${Math.round(n * 100)} %`;
const oneDp = (n: number) => (Math.round(n * 10) / 10).toString();
/** Rounds a score to a whole number after trimming float noise (87.4999999 → 87.5 → 88). */
const roundScore = (n: number) => Math.round(Math.round(n * 1e6) / 1e6);

/** Retirement savings target, as a multiple of yearly income, for an age (linear between guideline points). */
export function retirementTargetMultiple(age: number): number {
  if (!Number.isFinite(age) || age <= RETIREMENT_CURVE[0][0]) return 0;
  for (let i = 1; i < RETIREMENT_CURVE.length; i++) {
    const [a1, m1] = RETIREMENT_CURVE[i];
    if (age <= a1) {
      const [a0, m0] = RETIREMENT_CURVE[i - 1];
      return m0 + ((m1 - m0) * (age - a0)) / (a1 - a0);
    }
  }
  return RETIREMENT_CURVE[RETIREMENT_CURVE.length - 1][1];
}

const statusOf = (score: number): PillarStatus => (score >= 80 ? 'good' : score >= 50 ? 'fair' : 'poor');

export function gradeOf(score: number): Grade {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Needs attention';
}

/**
 * Scores the six pillars and ranks what to do next. Money amounts in the actions are rounded to whole units.
 * `fmt` formats money for the action text (the UI passes its currency formatter).
 */
export function financialHealth(raw: HealthInput, fmt: (n: number) => string = (n) => String(Math.round(n))): HealthReport {
  const income = nonNeg(raw.monthlyIncome);
  const expenses = nonNeg(raw.monthlyExpenses);
  const debtPay = nonNeg(raw.monthlyDebtPayments);
  const fund = nonNeg(raw.emergencyFund);
  const costly = nonNeg(raw.costlyDebt);
  const invested = nonNeg(raw.investments);
  const yearly = income * 12;

  const surplus = income - expenses - debtPay;
  const savingsRate = income > 0 ? surplus / income : 0;
  const essentials = expenses + debtPay;
  const emergencyMonths = essentials > 0 ? fund / essentials : fund > 0 ? TARGETS.emergencyMonths : 0;
  const dti = income > 0 ? debtPay / income : debtPay > 0 ? 1 : 0;
  const costlyRatio = yearly > 0 ? costly / yearly : costly > 0 ? 1 : 0;
  const retirementTarget = retirementTargetMultiple(raw.age);
  const retirementMultiple = yearly > 0 ? invested / yearly : 0;
  const lifeMultiple = yearly > 0 ? nonNeg(raw.lifeCover) / yearly : 0;
  const needsLife = nonNeg(raw.dependents) > 0;

  const scores: Record<PillarId, number> = {
    savings: clamp01(savingsRate / TARGETS.savingsRate) * 100,
    emergency: clamp01(emergencyMonths / TARGETS.emergencyMonths) * 100,
    debtLoad:
      clamp01((TARGETS.debtToIncomeZero - dti) / (TARGETS.debtToIncomeZero - TARGETS.debtToIncomeFull)) * 100,
    costlyDebt: clamp01(1 - costlyRatio / TARGETS.costlyDebtToIncomeZero) * 100,
    retirement: retirementTarget === 0 ? (invested > 0 || savingsRate > 0 ? 100 : 50) : clamp01(retirementMultiple / retirementTarget) * 100,
    protection:
      (needsLife ? clamp01(lifeMultiple / TARGETS.lifeCoverMultiple) * 50 : 50) + (raw.hasHealthCover ? 50 : 0),
  };

  const pillars: Pillar[] = [
    {
      id: 'savings',
      title: 'Savings rate',
      measure: pct(savingsRate),
      target: `${pct(TARGETS.savingsRate)} of take-home pay`,
    },
    {
      id: 'emergency',
      title: 'Emergency fund',
      measure: `${oneDp(emergencyMonths)} months`,
      target: `${TARGETS.emergencyMonths} months of spending and loan payments`,
    },
    {
      id: 'debtLoad',
      title: 'Debt payments',
      measure: `${pct(dti)} of income`,
      target: `${pct(TARGETS.debtToIncomeFull)} or less (above 36 % is a warning sign)`,
    },
    {
      id: 'costlyDebt',
      title: 'Costly debt',
      measure: `${pct(costlyRatio)} of yearly income`,
      target: 'None: cards and personal loans cleared',
    },
    {
      id: 'retirement',
      title: 'Retirement savings',
      measure: `${oneDp(retirementMultiple)}x yearly income`,
      target: retirementTarget === 0 ? 'Start early: any regular saving' : `${oneDp(retirementTarget)}x yearly income at age ${Math.round(raw.age)}`,
    },
    {
      id: 'protection',
      title: 'Insurance protection',
      measure: `${needsLife ? `Life cover ${oneDp(lifeMultiple)}x income` : 'No dependants'} · ${raw.hasHealthCover ? 'health cover' : 'no health cover'}`,
      target: `${needsLife ? `Life cover ${TARGETS.lifeCoverMultiple}x income and ` : ''}health cover`,
    },
  ].map((p) => {
    const id = p.id as PillarId;
    const score = roundScore(scores[id]);
    return { ...p, id, score, weight: PILLAR_WEIGHTS[id], status: statusOf(score) };
  });

  const score = roundScore(pillars.reduce((sum, p) => sum + scores[p.id] * p.weight, 0));

  const actions: HealthAction[] = [];
  const gain = (id: PillarId) => roundScore((100 - scores[id]) * PILLAR_WEIGHTS[id]);

  if (scores.costlyDebt < 100) {
    actions.push({
      pillar: 'costlyDebt',
      title: 'Clear costly debt first',
      detail: `You owe ${fmt(costly)} on cards or personal loans. Interest above 12 % a year usually costs more than investments earn, so pay these down before investing extra. The Debt Payoff Planner shows the fastest order.`,
      pointsAvailable: gain('costlyDebt'),
      amount: Math.round(costly),
    });
  }
  if (scores.emergency < 100) {
    const gap = Math.max(0, essentials * TARGETS.emergencyMonths - fund);
    actions.push({
      pillar: 'emergency',
      title: 'Build your emergency fund',
      detail: `Add ${fmt(gap)} to reach ${TARGETS.emergencyMonths} months of spending and loan payments. Keep it in a savings account or liquid fund you can reach within a day.`,
      pointsAvailable: gain('emergency'),
      amount: Math.round(gap),
    });
  }
  if (scores.savings < 100) {
    const gap = Math.max(0, income * TARGETS.savingsRate - surplus);
    actions.push({
      pillar: 'savings',
      title: surplus < 0 ? 'Stop the monthly shortfall' : 'Raise your savings rate',
      detail:
        surplus < 0
          ? `You spend ${fmt(-surplus)} more than you earn each month. Cut ${fmt(gap)} a month from spending to save 20 %.`
          : `Save ${fmt(gap)} more a month to reach 20 % of take-home pay. Automate it on payday so it happens first.`,
      pointsAvailable: gain('savings'),
      amount: Math.round(gap),
    });
  }
  if (scores.debtLoad < 100) {
    const gap = Math.max(0, debtPay - income * TARGETS.debtToIncomeFull);
    actions.push({
      pillar: 'debtLoad',
      title: 'Lower your loan payments',
      detail: `Loan payments take ${pct(dti)} of your income. Avoid new loans, and use the Loan Prepayment tool to see whether a part-payment would cut ${fmt(gap)} a month or shorten the loan.`,
      pointsAvailable: gain('debtLoad'),
      amount: Math.round(gap),
    });
  }
  if (scores.retirement < 100) {
    const gap = Math.max(0, retirementTarget * yearly - invested);
    actions.push({
      pillar: 'retirement',
      title: 'Catch up on retirement savings',
      detail: `The guideline for your age is about ${oneDp(retirementTarget)}x your yearly income, which is ${fmt(gap)} more than you have. The Goal Planner and Retirement Odds tools show the monthly amount that closes the gap.`,
      pointsAvailable: gain('retirement'),
      amount: Math.round(gap),
    });
  }
  if (scores.protection < 100) {
    const lifeGap = needsLife ? Math.max(0, TARGETS.lifeCoverMultiple * yearly - nonNeg(raw.lifeCover)) : 0;
    const parts = [
      lifeGap > 0 ? `term life cover of about ${fmt(lifeGap)} more, so your dependants are protected` : '',
      raw.hasHealthCover ? '' : 'a health insurance policy, so one hospital bill cannot wipe out your savings',
    ].filter(Boolean);
    actions.push({
      pillar: 'protection',
      title: 'Close your insurance gaps',
      detail: `Consider ${parts.join(', and ')}. Compare plans from several insurers; we do not sell insurance.`,
      pointsAvailable: gain('protection'),
      amount: Math.round(lifeGap),
    });
  }

  actions.sort((a, b) => b.pointsAvailable - a.pointsAvailable);

  return {
    score,
    grade: gradeOf(score),
    pillars,
    actions,
    metrics: {
      savingsRate,
      emergencyMonths,
      debtToIncome: dti,
      costlyDebtToIncome: costlyRatio,
      retirementMultiple,
      retirementTargetMultiple: retirementTarget,
      lifeCoverMultiple: lifeMultiple,
      monthlySurplus: surplus,
    },
  };
}
