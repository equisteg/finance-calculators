/**
 * The global tools library: one entry per calculator page under /tools/<slug>/.
 *
 * Each entry declares its inputs, calls one pure function from
 * @finealth/finance-core and says where its rule or rate comes from. The page
 * shows that source, the "rates last checked" date and the disclaimer next to
 * every result. Pakistan is deliberately not covered (founder decision, Nov 2026).
 */
import {
  australiaTax,
  breakEven,
  budget503020,
  CA_SALES_TAX,
  cagr,
  canadaTax,
  compareIndiaRegimes,
  consumptionTax,
  creditCardPayoff,
  discount,
  doublingTime,
  effectiveLoanRatePct,
  emergencyFund,
  flatRateLoan,
  indiaGratuity,
  indiaHraExemption,
  india80D,
  inflationImpact,
  irr,
  loanAffordability,
  marginMarkup,
  monthlySavingForTarget,
  netWorth,
  newZealandTax,
  npv,
  percentChange,
  percentOf,
  RATES_LAST_CHECKED,
  realReturnPct,
  recurringDeposit,
  rentVsBuy,
  retirementCorpusNeeded,
  salaryBreakdown,
  simpleInterest,
  singaporeTax,
  stampDutyLandTax,
  tipSplit,
  usPaycheck,
  WORLD_VAT_RATES,
  xirr,
  yearlyDepositGrowth,
  type IndiaAgeBand,
  type SdltBuyer,
} from '@finealth/finance-core';

export type Category = 'Everyday' | 'Saving & investing' | 'Borrowing' | 'Housing' | 'Tax & salary' | 'Business';

export interface Field {
  key: string;
  label: string;
  kind?: 'number' | 'select' | 'toggle' | 'text';
  /** Default; `inr` is used when the site currency is INR and the tool has no fixed currency. */
  def: number | string | boolean;
  inr?: number;
  suffix?: string;
  hint?: string;
  options?: Array<{ value: string; label: string }>;
  max?: number;
  step?: number;
}

export interface Row {
  label: string;
  value: string;
  tone?: 'ok' | 'warn' | 'bad';
  sub?: string;
}

export interface Fmt {
  money: (n: number, digits?: number) => string;
  pct: (n: number | null) => string;
  num: (n: number) => string;
}

export type Values = Record<string, number | string | boolean>;

export interface ToolDef {
  slug: string;
  title: string;
  /** One sentence for the index card and the meta description. */
  summary: string;
  category: Category;
  /** 'Global' or a country name. */
  region: string;
  /** Fixed currency for a country tool; otherwise the site currency is used. */
  currency?: string;
  fields: Field[];
  compute: (v: Values, f: Fmt) => { rows: Row[]; note?: string };
  /** Where the rule or rate comes from, shown under the result. */
  source: string;
  /** Official calculator or page to double-check against. */
  official?: { label: string; url: string };
  /** What the tool does not cover, shown in the disclaimer box. */
  limits?: string;
  /** True when the tool uses statutory rates that change by budget. */
  statutory?: boolean;
}

const n = (v: Values, k: string) => {
  const x = Number(v[k]);
  return Number.isFinite(x) ? x : 0;
};
const yrs = (m: number | null) => (m === null ? 'Never at this payment' : m < 12 ? `${m} months` : `${Math.floor(m / 12)} yr ${m % 12} mo`);
const parseList = (s: string) =>
  s
    .split(/[\s,;]+/)
    .map((x) => Number(x))
    .filter((x) => Number.isFinite(x));

export const CHECKED_LABEL = new Date(`${RATES_LAST_CHECKED}T00:00:00Z`).toLocaleDateString('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

const vatOptions = Object.entries(WORLD_VAT_RATES)
  .sort((a, b) => a[1].name.localeCompare(b[1].name))
  .map(([code, v]) => ({ value: code, label: `${v.name} (${v.rate}% ${v.tax})` }));

export const TOOLS: ToolDef[] = [
  /* ---------------- Saving & investing ---------------- */
  {
    slug: 'inflation-calculator',
    title: 'Inflation Calculator',
    summary: 'See what today’s money will cost in future and how much buying power inflation takes away.',
    category: 'Saving & investing',
    region: 'Global',
    fields: [
      { key: 'amount', label: 'Amount today', def: 1_000, inr: 100_000 },
      { key: 'rate', label: 'Inflation per year', def: 3, inr: 6, suffix: '%', max: 100 },
      { key: 'years', label: 'Years', def: 10, max: 100, step: 1 },
    ],
    compute: (v, f) => {
      const r = inflationImpact(n(v, 'amount'), n(v, 'rate'), n(v, 'years'));
      return {
        rows: [
          { label: 'Same things will cost', value: f.money(r.futureCost), tone: 'warn' },
          { label: 'Today’s amount will buy', value: f.money(r.purchasingPower), sub: 'in today’s money' },
          { label: 'Buying power lost', value: f.pct(r.lossPct), tone: 'bad' },
        ],
      };
    },
    source: 'Compound inflation, FV = PV × (1 + i)ⁿ. Use your country’s official CPI figure for the rate.',
  },
  {
    slug: 'real-return-calculator',
    title: 'Real Return Calculator',
    summary: 'Turn an investment return into its real, after-inflation return with the Fisher equation.',
    category: 'Saving & investing',
    region: 'Global',
    fields: [
      { key: 'nominal', label: 'Return per year', def: 7, inr: 10, suffix: '%' },
      { key: 'inflation', label: 'Inflation per year', def: 3, inr: 6, suffix: '%' },
    ],
    compute: (v, f) => ({
      rows: [
        { label: 'Real return', value: f.pct(realReturnPct(n(v, 'nominal'), n(v, 'inflation'))), tone: 'ok' },
        { label: 'Simple subtraction would say', value: f.pct(n(v, 'nominal') - n(v, 'inflation')), sub: 'slightly too high' },
      ],
    }),
    source: 'Fisher equation: (1 + nominal) ÷ (1 + inflation) − 1.',
  },
  {
    slug: 'cagr-calculator',
    title: 'CAGR Calculator',
    summary: 'Compound annual growth rate between a start value and an end value.',
    category: 'Saving & investing',
    region: 'Global',
    fields: [
      { key: 'start', label: 'Start value', def: 10_000, inr: 100_000 },
      { key: 'end', label: 'End value', def: 20_000, inr: 200_000 },
      { key: 'years', label: 'Years', def: 5, max: 100 },
    ],
    compute: (v, f) => {
      const r = cagr(n(v, 'start'), n(v, 'end'), n(v, 'years'));
      return { rows: [{ label: 'CAGR', value: r === null ? 'Enter a start value and years above 0' : f.pct(r), tone: 'ok' }] };
    },
    source: 'CAGR = (end ÷ start)^(1 ÷ years) − 1. Past growth does not predict future returns.',
  },
  {
    slug: 'rule-of-72',
    title: 'Rule of 72: Doubling Time',
    summary: 'How long money takes to double, by the Rule of 72 and the exact formula.',
    category: 'Saving & investing',
    region: 'Global',
    fields: [{ key: 'rate', label: 'Return per year', def: 8, suffix: '%' }],
    compute: (v) => {
      const r = doublingTime(n(v, 'rate'));
      if (!r) return { rows: [{ label: 'Doubling time', value: 'Needs a rate above 0%' }] };
      return {
        rows: [
          { label: 'Rule of 72 estimate', value: `${r.ruleOf72} years` },
          { label: 'Exact', value: `${r.exact} years`, tone: 'ok' },
        ],
      };
    },
    source: 'Exact doubling time = ln 2 ÷ ln(1 + r); the Rule of 72 approximates it as 72 ÷ r.',
  },
  {
    slug: 'simple-interest-calculator',
    title: 'Simple Interest Calculator',
    summary: 'Interest on a principal at a flat yearly rate, with no compounding.',
    category: 'Saving & investing',
    region: 'Global',
    fields: [
      { key: 'p', label: 'Principal', def: 10_000, inr: 100_000 },
      { key: 'r', label: 'Rate per year', def: 5, inr: 8, suffix: '%' },
      { key: 't', label: 'Years', def: 3 },
    ],
    compute: (v, f) => {
      const r = simpleInterest(n(v, 'p'), n(v, 'r'), n(v, 't'));
      return { rows: [{ label: 'Interest', value: f.money(r.interest), tone: 'ok' }, { label: 'Total', value: f.money(r.maturity) }] };
    },
    source: 'I = P × r × t.',
  },
  {
    slug: 'recurring-deposit-calculator',
    title: 'Recurring Deposit (RD) Calculator',
    summary: 'Maturity of a monthly deposit compounded quarterly, the way most banks calculate an RD.',
    category: 'Saving & investing',
    region: 'Global',
    fields: [
      { key: 'm', label: 'Monthly deposit', def: 200, inr: 5_000 },
      { key: 'r', label: 'Interest rate', def: 5, inr: 7, suffix: '%' },
      { key: 'months', label: 'Months', def: 12, max: 600, step: 1 },
    ],
    compute: (v, f) => {
      const r = recurringDeposit(n(v, 'm'), n(v, 'r'), n(v, 'months'));
      return {
        rows: [
          { label: 'Maturity', value: f.money(r.maturity), tone: 'ok' },
          { label: 'You deposit', value: f.money(r.principal) },
          { label: 'Interest earned', value: f.money(r.interest) },
        ],
      };
    },
    source: 'Each instalment compounds quarterly for the time it is held: M = Σ P × (1 + r/4)^(4 × months left ÷ 12). Interest may be taxed and TDS deducted.',
  },
  {
    slug: 'savings-goal-calculator',
    title: 'Savings Goal Calculator',
    summary: 'How much to save each month to reach a target by a date.',
    category: 'Saving & investing',
    region: 'Global',
    fields: [
      { key: 'target', label: 'Target amount', def: 50_000, inr: 1_000_000 },
      { key: 'have', label: 'Saved already', def: 5_000, inr: 100_000 },
      { key: 'r', label: 'Expected return', def: 5, inr: 8, suffix: '%' },
      { key: 'y', label: 'Years', def: 5 },
    ],
    compute: (v, f) => ({
      rows: [{ label: 'Save each month', value: f.money(monthlySavingForTarget(n(v, 'target'), n(v, 'have'), n(v, 'r'), n(v, 'y'))), tone: 'ok' }],
    }),
    source: 'Future value of an ordinary annuity, after growing what you have already saved.',
  },
  {
    slug: 'retirement-corpus-calculator',
    title: 'Retirement Corpus Calculator',
    summary: 'The pot you need at retirement to pay for your monthly costs, rising with inflation.',
    category: 'Saving & investing',
    region: 'Global',
    fields: [
      { key: 'exp', label: 'Monthly costs today', def: 3_000, inr: 50_000 },
      { key: 'to', label: 'Years to retirement', def: 25 },
      { key: 'in', label: 'Years in retirement', def: 25 },
      { key: 'inf', label: 'Inflation', def: 3, inr: 6, suffix: '%' },
      { key: 'ret', label: 'Return in retirement', def: 5, inr: 7, suffix: '%' },
    ],
    compute: (v, f) => {
      const r = retirementCorpusNeeded(n(v, 'exp'), n(v, 'to'), n(v, 'in'), n(v, 'inf'), n(v, 'ret'));
      return {
        rows: [
          { label: 'Pot needed at retirement', value: f.money(r.corpus), tone: 'warn' },
          { label: 'First month’s costs then', value: f.money(r.firstYearMonthlyExpense) },
        ],
      };
    },
    source: 'Present value of a growing annuity-due, month by month. Ignores pensions, tax and longevity risk; see the Retirement Planner for odds.',
  },
  {
    slug: 'ppf-calculator',
    title: 'PPF Calculator',
    summary: 'Public Provident Fund maturity for a yearly deposit compounded annually.',
    category: 'Saving & investing',
    region: 'India',
    currency: 'INR',
    statutory: true,
    fields: [
      { key: 'y', label: 'Yearly deposit', def: 150_000, hint: '₹500 to ₹1,50,000 a year' },
      { key: 'r', label: 'Interest rate', def: 7.1, suffix: '%', hint: 'Set by the government each quarter' },
      { key: 't', label: 'Years', def: 15, hint: '15-year lock-in, extendable in 5-year blocks' },
    ],
    compute: (v, f) => {
      const dep = Math.min(n(v, 'y'), 150_000);
      const r = yearlyDepositGrowth(dep, n(v, 'r'), n(v, 't'));
      return {
        rows: [
          { label: 'Maturity', value: f.money(r.maturity), tone: 'ok' },
          { label: 'You deposit', value: f.money(r.principal) },
          { label: 'Interest', value: f.money(r.interest) },
        ],
        note: n(v, 'y') > 150_000 ? 'Capped at ₹1,50,000 a year, the PPF maximum.' : undefined,
      };
    },
    source: 'PPF Scheme 2019: interest compounds yearly; deposit before the 5th of April to earn the full year. Rate 7.1% is the rate notified for the current quarter at last check.',
    official: { label: 'National Savings Institute (nsiindia.gov.in)', url: 'https://www.nsiindia.gov.in/' },
  },

  /* ---------------- Borrowing ---------------- */
  {
    slug: 'credit-card-payoff-calculator',
    title: 'Credit Card Payoff Calculator',
    summary: 'How long a fixed monthly payment takes to clear a card, and the interest it costs.',
    category: 'Borrowing',
    region: 'Global',
    fields: [
      { key: 'b', label: 'Card balance', def: 5_000, inr: 100_000 },
      { key: 'apr', label: 'APR', def: 24, inr: 42, suffix: '%' },
      { key: 'pay', label: 'Monthly payment', def: 200, inr: 6_000 },
    ],
    compute: (v, f) => {
      const r = creditCardPayoff(n(v, 'b'), n(v, 'apr'), n(v, 'pay'));
      if (r.months === null)
        return { rows: [{ label: 'Paid off in', value: 'Never', tone: 'bad', sub: `Pay more than ${f.money(r.minimumToMakeProgress)} a month to reduce the balance` }] };
      return {
        rows: [
          { label: 'Paid off in', value: yrs(r.months), tone: 'ok' },
          { label: 'Interest', value: f.money(r.totalInterest), tone: 'bad' },
          { label: 'Total paid', value: f.money(r.totalPaid) },
        ],
      };
    },
    source: 'Monthly interest at APR ÷ 12 on the balance carried. Real cards add fees and may charge daily interest, late fees and GST/VAT on charges.',
  },
  {
    slug: 'loan-affordability-calculator',
    title: 'Loan Affordability Calculator',
    summary: 'The largest loan a debt-to-income (FOIR) limit allows on your income.',
    category: 'Borrowing',
    region: 'Global',
    fields: [
      { key: 'inc', label: 'Gross monthly income', def: 6_000, inr: 100_000 },
      { key: 'debts', label: 'Existing monthly debt payments', def: 500, inr: 10_000 },
      { key: 'share', label: 'Debt limit', def: 36, inr: 50, suffix: '%', hint: 'Lenders often use 36-43% (DTI) or 40-60% (FOIR)' },
      { key: 'r', label: 'Interest rate', def: 6.5, inr: 8.5, suffix: '%' },
      { key: 'y', label: 'Term (years)', def: 30, inr: 20 },
    ],
    compute: (v, f) => {
      const r = loanAffordability(n(v, 'inc'), n(v, 'debts'), n(v, 'share'), n(v, 'r'), n(v, 'y'));
      return {
        rows: [
          { label: 'Largest loan', value: f.money(r.maxLoan), tone: 'ok' },
          { label: 'Monthly payment', value: f.money(r.maxMonthlyPayment) },
        ],
      };
    },
    source: 'Present value of the largest payment that fits the limit. Each lender sets its own rules, credit checks and down-payment needs.',
  },
  {
    slug: 'loan-true-cost-calculator',
    title: 'Loan True Cost (APR with fees)',
    summary: 'The real yearly rate of a loan once an up-front processing fee is counted.',
    category: 'Borrowing',
    region: 'Global',
    fields: [
      { key: 'p', label: 'Loan amount', def: 20_000, inr: 500_000 },
      { key: 'r', label: 'Quoted rate', def: 9, inr: 11, suffix: '%' },
      { key: 'y', label: 'Years', def: 5 },
      { key: 'fee', label: 'Up-front fees', def: 400, inr: 10_000 },
    ],
    compute: (v, f) => {
      const r = effectiveLoanRatePct(n(v, 'p'), n(v, 'r'), n(v, 'y'), n(v, 'fee'));
      return { rows: [{ label: 'True yearly rate', value: r === null ? 'Check the inputs' : f.pct(r), tone: 'warn', sub: `Quoted ${f.pct(n(v, 'r'))}` }] };
    },
    source: 'Rate at which the money you receive (loan − fees) equals the present value of the payments, × 12. Regulators’ APR definitions vary by country.',
  },
  {
    slug: 'flat-rate-loan-calculator',
    title: 'Flat Rate vs Reducing Rate',
    summary: 'Shows the real reducing-balance rate behind a flat-rate car or personal loan quote.',
    category: 'Borrowing',
    region: 'Global',
    fields: [
      { key: 'p', label: 'Loan amount', def: 10_000, inr: 500_000 },
      { key: 'r', label: 'Flat rate', def: 6, inr: 7, suffix: '%' },
      { key: 'y', label: 'Years', def: 3 },
    ],
    compute: (v, f) => {
      const r = flatRateLoan(n(v, 'p'), n(v, 'r'), n(v, 'y'));
      return {
        rows: [
          { label: 'Monthly payment', value: f.money(r.emi) },
          { label: 'Total interest', value: f.money(r.totalInterest) },
          { label: 'Equivalent reducing rate', value: f.pct(r.effectiveRatePct), tone: 'bad' },
        ],
      };
    },
    source: 'Flat interest = P × r × t charged on the original amount; the equivalent rate solves the reducing-balance EMI formula for the same payment.',
  },

  /* ---------------- Housing ---------------- */
  {
    slug: 'rent-vs-buy-calculator',
    title: 'Rent vs Buy Calculator',
    summary: 'Compares your net worth after renting and investing the difference with buying a home.',
    category: 'Housing',
    region: 'Global',
    fields: [
      { key: 'price', label: 'Home price', def: 300_000, inr: 8_000_000 },
      { key: 'down', label: 'Down payment', def: 60_000, inr: 1_600_000 },
      { key: 'lr', label: 'Loan rate', def: 6.5, inr: 8.5, suffix: '%' },
      { key: 'ly', label: 'Loan term (years)', def: 30, inr: 20 },
      { key: 'buyc', label: 'Buying costs', def: 3, inr: 7, suffix: '%', hint: 'Stamp duty, registration, fees' },
      { key: 'own', label: 'Ownership costs a year', def: 1.5, inr: 0.5, suffix: '%', hint: 'Maintenance, insurance, property tax' },
      { key: 'hg', label: 'Home price growth', def: 3, inr: 5, suffix: '%' },
      { key: 'rent', label: 'Monthly rent', def: 1_400, inr: 25_000 },
      { key: 'rg', label: 'Rent increase a year', def: 3, inr: 5, suffix: '%' },
      { key: 'inv', label: 'Investment return', def: 6, inr: 10, suffix: '%' },
      { key: 'y', label: 'Years you stay', def: 10 },
      { key: 'sell', label: 'Selling costs', def: 5, inr: 2, suffix: '%' },
    ],
    compute: (v, f) => {
      const r = rentVsBuy({
        homePrice: n(v, 'price'), downPayment: n(v, 'down'), loanRatePct: n(v, 'lr'), loanYears: n(v, 'ly'), buyingCostsPct: n(v, 'buyc'),
        ownershipCostsPct: n(v, 'own'), homeGrowthPct: n(v, 'hg'), monthlyRent: n(v, 'rent'), rentGrowthPct: n(v, 'rg'),
        investReturnPct: n(v, 'inv'), years: n(v, 'y'), sellingCostsPct: n(v, 'sell'),
      });
      return {
        rows: [
          { label: 'Comes out ahead', value: r.better === 'buy' ? 'Buying' : 'Renting', tone: 'ok', sub: `by ${f.money(r.difference)}` },
          { label: 'Buyer’s net worth', value: f.money(r.buyerWealth) },
          { label: 'Renter’s net worth', value: f.money(r.renterWealth) },
        ],
      };
    },
    source: 'Both start with the same cash and spend the same each month; whoever pays less invests the difference. Ignores tax, which differs by country, and the non-money value of owning.',
  },
  {
    slug: 'uk-stamp-duty-calculator',
    title: 'UK Stamp Duty (SDLT) Calculator',
    summary: 'Stamp Duty Land Tax in England and Northern Ireland, including first-time buyer relief and surcharges.',
    category: 'Housing',
    region: 'United Kingdom',
    currency: 'GBP',
    statutory: true,
    fields: [
      { key: 'price', label: 'Purchase price', def: 350_000 },
      {
        key: 'buyer', label: 'Buyer', kind: 'select', def: 'standard',
        options: [
          { value: 'standard', label: 'Home mover' },
          { value: 'first-time', label: 'First-time buyer' },
          { value: 'additional', label: 'Additional property (+5%)' },
        ],
      },
      { key: 'nonres', label: 'Non-UK resident (+2%)', kind: 'toggle', def: false },
    ],
    compute: (v, f) => {
      const r = stampDutyLandTax(n(v, 'price'), v.buyer as SdltBuyer, v.nonres === true);
      return {
        rows: [
          { label: 'Stamp duty', value: f.money(r.tax), tone: 'warn' },
          { label: 'Effective rate', value: f.pct(r.effectiveRatePct) },
        ],
        note: r.reliefUnavailable ? 'First-time buyer relief only applies up to £500,000, so standard rates are used.' : undefined,
      };
    },
    source: 'HMRC SDLT residential rates from 1 April 2025; 5% higher rates for additional dwellings; 2% non-resident surcharge. Scotland (LBTT) and Wales (LTT) differ.',
    official: { label: 'GOV.UK SDLT calculator', url: 'https://www.tax.service.gov.uk/calculate-stamp-duty-land-tax/' },
    limits: 'Does not cover Scotland, Wales, shared ownership, mixed-use or non-residential property, or multiple-dwellings cases.',
  },

  /* ---------------- Tax & salary ---------------- */
  {
    slug: 'india-tax-regime-calculator',
    title: 'India Old vs New Regime (detailed)',
    summary: 'Old and new regime tax for salaried residents, with age, 80C, 80D for self and parents, HRA and other deductions.',
    category: 'Tax & salary',
    region: 'India',
    currency: 'INR',
    statutory: true,
    fields: [
      { key: 'gross', label: 'Gross salary (year)', def: 1_500_000 },
      {
        key: 'age', label: 'Your age', kind: 'select', def: 'below60',
        options: [
          { value: 'below60', label: 'Below 60' },
          { value: '60to79', label: '60 to 79' },
          { value: '80plus', label: '80 or over' },
        ],
      },
      { key: 'c80', label: '80C investments', def: 150_000, hint: 'Capped at ₹1,50,000' },
      { key: 'd80', label: '80D premium: self & family', def: 25_000, hint: 'Cap ₹25,000 (₹50,000 if 60+)' },
      { key: 'd80p', label: '80D premium: parents', def: 0, hint: 'Cap ₹25,000 (₹50,000 if a parent is 60+)' },
      { key: 'psen', label: 'A parent is 60 or over', kind: 'toggle', def: false },
      { key: 'hra', label: 'HRA exemption', def: 0, hint: 'Use the HRA calculator' },
      { key: 'other', label: 'Other old-regime deductions', def: 0, hint: '80CCD(1B), 24(b), 80E, 80G...' },
    ],
    compute: (v, f) => {
      const age = v.age as IndiaAgeBand;
      const d = {
        section80C: n(v, 'c80'), section80D: n(v, 'd80'), section80DParents: n(v, 'd80p'), selfSenior: age !== 'below60',
        parentsSenior: v.psen === true, hraExemption: n(v, 'hra'), other: n(v, 'other'),
      };
      const r = compareIndiaRegimes(n(v, 'gross'), d, age);
      return {
        rows: [
          { label: 'New regime tax', value: f.money(r.newTax), tone: r.recommended === 'NEW REGIME' ? 'ok' : undefined },
          { label: 'Old regime tax', value: f.money(r.oldTax), tone: r.recommended === 'OLD REGIME' ? 'ok' : undefined },
          { label: 'Lower tax', value: r.recommended === 'NEW REGIME' ? 'New regime' : 'Old regime', sub: `saves ${f.money(r.savings)}` },
          { label: '80D allowed', value: f.money(india80D(d)) },
        ],
      };
    },
    source: 'Income-tax slabs for FY 2025-26, unchanged for tax year 2026-27 (Budget 2026); 87A rebate with marginal relief; surcharge with marginal relief; 4% cess.',
    official: { label: 'Income Tax Department tax calculator', url: 'https://www.incometax.gov.in/iec/foportal/income-tax-calculator' },
    limits: 'Salary income only. Does not cover capital gains, business income, agricultural income, or deductions not listed. Surcharge rules for special-rate income are not modelled.',
  },
  {
    slug: 'hra-exemption-calculator',
    title: 'HRA Exemption Calculator',
    summary: 'The tax-free part of your house rent allowance under the old regime.',
    category: 'Tax & salary',
    region: 'India',
    currency: 'INR',
    statutory: true,
    fields: [
      { key: 'basic', label: 'Basic + DA (year)', def: 600_000 },
      { key: 'hra', label: 'HRA received (year)', def: 240_000 },
      { key: 'rent', label: 'Rent paid (year)', def: 300_000 },
      { key: 'metro', label: '50% city (Delhi, Mumbai, Kolkata, Chennai)', kind: 'toggle', def: true, hint: 'Check whether your city is on the current notified list' },
    ],
    compute: (v, f) => {
      const r = indiaHraExemption(n(v, 'basic'), n(v, 'hra'), n(v, 'rent'), v.metro === true);
      return {
        rows: [
          { label: 'Tax-free HRA', value: f.money(r.exempt), tone: 'ok' },
          { label: 'Taxable HRA', value: f.money(r.taxable) },
        ],
        note: `Least of: HRA received ${f.money(r.limits.hraReceived)}; rent − 10% of basic ${f.money(r.limits.rentMinus10PctBasic)}; ${v.metro === true ? '50%' : '40%'} of basic ${f.money(r.limits.pctOfBasic)}.`,
      };
    },
    source: 'Section 10(13A) of the Income-tax Act 1961 and Rule 2A (carried into the Income-tax Act 2025). Not available under the new regime.',
    limits: 'Assumes the same rent, salary and city all year. You need rent receipts, and the landlord’s PAN if rent is above ₹1 lakh a year.',
  },
  {
    slug: 'gratuity-calculator',
    title: 'Gratuity Calculator (India)',
    summary: 'Gratuity under the Payment of Gratuity Act: 15 days’ wages for every year of service.',
    category: 'Tax & salary',
    region: 'India',
    currency: 'INR',
    statutory: true,
    fields: [
      { key: 'wage', label: 'Last monthly basic + DA', def: 50_000 },
      { key: 'y', label: 'Years of service', def: 10, step: 1 },
      { key: 'm', label: 'Extra months', def: 7, step: 1, max: 11 },
    ],
    compute: (v, f) => {
      const r = indiaGratuity(n(v, 'wage'), n(v, 'y'), n(v, 'm'));
      return {
        rows: [
          { label: 'Gratuity', value: f.money(r.gratuity), tone: 'ok' },
          { label: 'Years counted', value: String(r.yearsCounted), sub: 'more than 6 months rounds up' },
        ],
        note: r.capped ? 'Capped at ₹20 lakh, the statutory ceiling.' : n(v, 'y') < 5 ? 'Usually needs 5 years’ service (1 year for fixed-term staff under the Code on Social Security), except on death or disablement.' : undefined,
      };
    },
    source: 'Payment of Gratuity Act 1972, s.4: wage × 15 ÷ 26 × years, ceiling ₹20 lakh; the Code on Social Security 2020 keeps the formula.',
    limits: 'For employees covered by the Act. Employers not covered may follow their own scheme. Government employees have different rules and a higher tax exemption.',
  },
  {
    slug: 'us-federal-tax-calculator',
    title: 'US Federal Tax & Paycheck',
    summary: '2026 federal income tax and FICA for single or married-joint filers.',
    category: 'Tax & salary',
    region: 'United States',
    currency: 'USD',
    statutory: true,
    fields: [
      { key: 'g', label: 'Wages (year)', def: 85_000 },
      {
        key: 'status', label: 'Filing status', kind: 'select', def: 'single',
        options: [
          { value: 'single', label: 'Single' },
          { value: 'joint', label: 'Married filing jointly' },
        ],
      },
      { key: 's', label: 'State income tax rate', def: 0, suffix: '%', hint: 'Flat estimate; 0 for states without income tax' },
    ],
    compute: (v, f) => {
      const r = usPaycheck(n(v, 'g'), n(v, 's'), v.status === 'joint' ? 'joint' : 'single');
      return {
        rows: [
          { label: 'Take-home a month', value: f.money(r.netMonthly), tone: 'ok' },
          { label: 'Federal income tax', value: f.money(r.federalTax) },
          { label: 'FICA', value: f.money(r.fica) },
          { label: 'State (estimate)', value: f.money(r.stateTax) },
          { label: 'Effective rate', value: f.pct(r.effectiveTaxRatePct) },
        ],
      };
    },
    source: 'IRS Rev. Proc. 2025-32 (2026 brackets and standard deduction); SSA 2026 wage base $184,500; Additional Medicare Tax 0.9%.',
    official: { label: 'IRS Tax Withholding Estimator', url: 'https://www.irs.gov/individuals/tax-withholding-estimator' },
    limits: 'Standard deduction only; no credits (child tax credit etc.), pre-tax 401(k)/HSA, itemised deductions or local taxes. State tax is a flat-rate estimate.',
  },
  {
    slug: 'australia-income-tax-calculator',
    title: 'Australia Income Tax Calculator',
    summary: '2026-27 resident income tax, low income tax offset and Medicare levy.',
    category: 'Tax & salary',
    region: 'Australia',
    currency: 'AUD',
    statutory: true,
    fields: [{ key: 'g', label: 'Taxable income (year)', def: 90_000 }],
    compute: (v, f) => {
      const r = australiaTax(n(v, 'g'));
      return {
        rows: [
          { label: 'Take-home a month', value: f.money(r.netMonthly), tone: 'ok' },
          { label: 'Income tax (after LITO)', value: f.money(r.incomeTax) },
          { label: 'Medicare levy', value: f.money(r.medicareLevy) },
          { label: 'Effective rate', value: f.pct(r.effectiveRatePct) },
        ],
      };
    },
    source: 'ATO resident rates from 1 July 2026 (15% / 30% / 37% / 45%), low income tax offset, 2% Medicare levy with low-income shade-in.',
    official: { label: 'ATO simple tax calculator', url: 'https://www.ato.gov.au/calculators-and-tools/simple-tax-calculator' },
    limits: 'Residents for the full year only. Excludes the Medicare levy surcharge, HELP/student loan repayments, family thresholds and other offsets. Super is paid on top by the employer.',
  },
  {
    slug: 'canada-income-tax-calculator',
    title: 'Canada Income Tax Calculator',
    summary: '2026 federal tax, CPP and EI for an employee, with a provincial estimate.',
    category: 'Tax & salary',
    region: 'Canada',
    currency: 'CAD',
    statutory: true,
    fields: [
      { key: 'g', label: 'Employment income (year)', def: 75_000 },
      { key: 'p', label: 'Provincial tax rate', def: 6, suffix: '%', hint: 'Flat estimate of your provincial rate' },
    ],
    compute: (v, f) => {
      const r = canadaTax(n(v, 'g'), n(v, 'p'));
      return {
        rows: [
          { label: 'Take-home a month', value: f.money(r.netMonthly), tone: 'ok' },
          { label: 'Federal tax', value: f.money(r.federalTax) },
          { label: 'Provincial (estimate)', value: f.money(r.provincialTax) },
          { label: 'CPP + CPP2', value: f.money(r.cpp) },
          { label: 'EI', value: f.money(r.ei) },
        ],
      };
    },
    source: 'CRA 2026: federal brackets (14% lowest rate), basic personal amount, Canada employment amount; CPP 5.95% to YMPE, CPP2 4% to YAMPE; EI 1.63%.',
    official: { label: 'CRA payroll deductions calculator', url: 'https://www.canada.ca/en/revenue-agency/services/e-services/payroll-deductions-online-calculator.html' },
    limits: 'Outside Quebec (QPP/QPIP differ). Provincial tax, surtaxes and health premiums are approximated by one flat rate. No RRSP, union dues or other credits.',
  },
  {
    slug: 'singapore-income-tax-calculator',
    title: 'Singapore Income Tax Calculator',
    summary: 'Resident income tax with CPF and earned income relief.',
    category: 'Tax & salary',
    region: 'Singapore',
    currency: 'SGD',
    statutory: true,
    fields: [
      { key: 'g', label: 'Annual salary', def: 72_000 },
      { key: 'rel', label: 'Other reliefs', def: 0, hint: 'Spouse, child, course fees, SRS...' },
      { key: 'cpf', label: 'Citizen or PR (pays CPF)', kind: 'toggle', def: true },
    ],
    compute: (v, f) => {
      const r = singaporeTax(n(v, 'g'), n(v, 'rel'), v.cpf === true);
      return {
        rows: [
          { label: 'Take-home a month', value: f.money(r.netMonthly), tone: 'ok' },
          { label: 'Income tax', value: f.money(r.incomeTax) },
          { label: 'Employee CPF', value: f.money(r.cpfEmployee) },
          { label: 'Chargeable income', value: f.money(r.chargeableIncome) },
        ],
      };
    },
    source: 'IRAS resident rates from YA 2024 (0% to 24%); CPF employee 20% (age 55 and below) up to the S$8,000 monthly wage ceiling from 2026; earned income relief S$1,000.',
    official: { label: 'IRAS tax calculators', url: 'https://www.iras.gov.sg/taxes/individual-income-tax/basics-of-individual-income-tax/tax-residency-and-tax-rates/individual-income-tax-rates' },
    limits: 'Age 55 and below, steady salary, no bonus. Excludes the yearly CPF ceiling on bonuses, the personal relief cap and any one-off Budget tax rebate.',
  },
  {
    slug: 'new-zealand-income-tax-calculator',
    title: 'New Zealand Income Tax Calculator',
    summary: 'PAYE income tax and the ACC earners’ levy for an employee.',
    category: 'Tax & salary',
    region: 'New Zealand',
    currency: 'NZD',
    statutory: true,
    fields: [
      { key: 'g', label: 'Annual income', def: 80_000 },
      { key: 'acc', label: 'ACC earners’ levy', def: 1.75, suffix: '%', hint: 'Changes each 1 April; check IRD' },
    ],
    compute: (v, f) => {
      const r = newZealandTax(n(v, 'g'), n(v, 'acc'));
      return {
        rows: [
          { label: 'Take-home a month', value: f.money(r.netMonthly), tone: 'ok' },
          { label: 'Income tax', value: f.money(r.incomeTax) },
          { label: 'ACC levy', value: f.money(r.acc) },
          { label: 'Effective rate', value: f.pct(r.effectiveRatePct) },
        ],
      };
    },
    source: 'IRD individual rates from 31 July 2024 (10.5% to 39%). ACC levy rate and maximum earnings are editable because they change every April.',
    official: { label: 'IRD PAYE calculator', url: 'https://www.ird.govt.nz/income-tax/income-tax-for-individuals/tax-codes-and-tax-rates-for-individuals/tax-rates-for-individuals' },
    limits: 'Excludes KiwiSaver, student loan repayments, the independent earner tax credit and secondary tax codes.',
  },
  {
    slug: 'salary-converter',
    title: 'Salary Converter',
    summary: 'Annual salary to monthly, weekly, daily and hourly pay.',
    category: 'Tax & salary',
    region: 'Global',
    fields: [
      { key: 'a', label: 'Annual salary', def: 52_000, inr: 1_200_000 },
      { key: 'h', label: 'Hours a week', def: 40, inr: 48 },
      { key: 'w', label: 'Paid weeks a year', def: 52 },
    ],
    compute: (v, f) => {
      const r = salaryBreakdown(n(v, 'a'), n(v, 'h'), n(v, 'w'));
      return {
        rows: [
          { label: 'Monthly', value: f.money(r.monthly) },
          { label: 'Weekly', value: f.money(r.weekly) },
          { label: 'Daily (5-day week)', value: f.money(r.daily) },
          { label: 'Hourly', value: f.money(r.hourly, 2), tone: 'ok' },
        ],
      };
    },
    source: 'Gross pay divided evenly; before tax.',
  },
  {
    slug: 'world-vat-gst-calculator',
    title: 'World VAT / GST Calculator',
    summary: 'Add or remove VAT, GST or sales tax at the standard rate for 60+ countries.',
    category: 'Business',
    region: 'Global',
    statutory: true,
    fields: [
      { key: 'c', label: 'Country', kind: 'select', def: 'GB', options: vatOptions },
      { key: 'amt', label: 'Amount (in that country’s currency)', def: 1_000 },
      { key: 'incl', label: 'Amount already includes tax', kind: 'toggle', def: false },
    ],
    compute: (v, f) => {
      const c = WORLD_VAT_RATES[String(v.c)] ?? WORLD_VAT_RATES.GB;
      const r = consumptionTax(n(v, 'amt'), c.rate, v.incl === true);
      // Shown without a currency symbol: the amount is in the chosen country's currency.
      const plain = (x: number) => x.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return {
        rows: [
          { label: `${c.tax} at ${c.rate}%`, value: plain(r.tax), tone: 'warn' },
          { label: 'Net', value: plain(r.base) },
          { label: 'Gross', value: plain(r.total) },
        ],
        note: c.note,
      };
    },
    source: 'Standard rates from each country’s tax authority; EU rates cross-checked with the European Commission VAT rates table. Reduced, zero and exempt rates are not shown.',
    limits: 'Standard rate only. Your item may be reduced-rate, zero-rated or exempt; registration thresholds and invoicing rules vary.',
  },
  {
    slug: 'canada-sales-tax-calculator',
    title: 'Canada GST / HST / PST Calculator',
    summary: 'Sales tax by province: GST plus PST or QST, or the single HST.',
    category: 'Business',
    region: 'Canada',
    currency: 'CAD',
    statutory: true,
    fields: [
      {
        key: 'prov', label: 'Province or territory', kind: 'select', def: 'ON',
        options: Object.entries(CA_SALES_TAX).map(([k, p]) => ({ value: k, label: p.name })),
      },
      { key: 'amt', label: 'Price before tax', def: 100 },
    ],
    compute: (v, f) => {
      const p = CA_SALES_TAX[String(v.prov)] ?? CA_SALES_TAX.ON;
      const amt = Math.max(0, n(v, 'amt'));
      const gst = Math.round(amt * p.gst) / 100;
      const prov = Math.round(amt * p.provincial) / 100;
      return {
        rows: p.hst
          ? [{ label: `HST ${p.provincial}%`, value: f.money(prov, 2), tone: 'warn' }, { label: 'Total', value: f.money(amt + prov, 2) }]
          : [
              { label: 'GST 5%', value: f.money(gst, 2) },
              { label: p.provincial ? `${String(v.prov) === 'QC' ? 'QST' : 'PST'} ${p.provincial}%` : 'No provincial tax', value: f.money(prov, 2) },
              { label: 'Total', value: f.money(amt + gst + prov, 2), tone: 'warn' },
            ],
      };
    },
    source: 'CRA GST/HST rates (HST 13% ON, 14% NS from 1 April 2025, 15% NB/NL/PE) and provincial PST/QST rates.',
    official: { label: 'CRA GST/HST calculator', url: 'https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses/charge-collect-which-rate/calculator.html' },
  },

  /* ---------------- Everyday ---------------- */
  {
    slug: 'budget-50-30-20-calculator',
    title: '50/30/20 Budget Calculator',
    summary: 'Split take-home pay into needs, wants and savings.',
    category: 'Everyday',
    region: 'Global',
    fields: [
      { key: 't', label: 'Monthly take-home pay', def: 4_000, inr: 80_000 },
      { key: 'n', label: 'Needs', def: 50, suffix: '%' },
      { key: 'w', label: 'Wants', def: 30, suffix: '%' },
    ],
    compute: (v, f) => {
      const r = budget503020(n(v, 't'), n(v, 'n'), n(v, 'w'));
      return {
        rows: [
          { label: 'Needs', value: f.money(r.needs) },
          { label: 'Wants', value: f.money(r.wants) },
          { label: 'Savings & debt payoff', value: f.money(r.savings), tone: 'ok' },
        ],
        note: n(v, 'n') + n(v, 'w') > 100 ? 'Needs and wants add up to more than 100%, so nothing is left to save.' : undefined,
      };
    },
    source: 'Rule of thumb from E. Warren & A. Tyagi, "All Your Worth" (2005). Adjust the split to your situation.',
  },
  {
    slug: 'emergency-fund-calculator',
    title: 'Emergency Fund Calculator',
    summary: 'How big your safety net should be and how long it takes to build.',
    category: 'Everyday',
    region: 'Global',
    fields: [
      { key: 'e', label: 'Essential monthly costs', def: 2_500, inr: 40_000 },
      { key: 'm', label: 'Months of cover', def: 6, step: 1 },
      { key: 's', label: 'Saved already', def: 3_000, inr: 50_000 },
      { key: 'ms', label: 'You can save a month', def: 400, inr: 10_000 },
    ],
    compute: (v, f) => {
      const r = emergencyFund(n(v, 'e'), n(v, 'm'), n(v, 's'), n(v, 'ms'));
      return {
        rows: [
          { label: 'Target', value: f.money(r.target) },
          { label: 'Still to save', value: f.money(r.gap), tone: r.gap ? 'warn' : 'ok' },
          { label: 'Time to reach it', value: r.monthsToTarget === null ? 'Set a monthly saving' : yrs(r.monthsToTarget) },
          { label: 'Months covered now', value: f.num(r.coveredMonths) },
        ],
      };
    },
    source: 'Common guide of 3 to 6 months of essential costs (more if income is irregular).',
  },
  {
    slug: 'net-worth-calculator',
    title: 'Net Worth Calculator',
    summary: 'Everything you own minus everything you owe.',
    category: 'Everyday',
    region: 'Global',
    fields: [
      { key: 'cash', label: 'Cash & bank', def: 10_000, inr: 200_000 },
      { key: 'inv', label: 'Investments & retirement', def: 50_000, inr: 1_000_000 },
      { key: 'prop', label: 'Property', def: 250_000, inr: 6_000_000 },
      { key: 'oth', label: 'Other assets', def: 10_000, inr: 300_000 },
      { key: 'mort', label: 'Mortgage / home loan', def: 180_000, inr: 3_500_000 },
      { key: 'debt', label: 'Other loans & cards', def: 8_000, inr: 200_000 },
    ],
    compute: (v, f) => {
      const r = netWorth([n(v, 'cash'), n(v, 'inv'), n(v, 'prop'), n(v, 'oth')], [n(v, 'mort'), n(v, 'debt')]);
      return {
        rows: [
          { label: 'Net worth', value: f.money(r.netWorth), tone: r.netWorth >= 0 ? 'ok' : 'bad' },
          { label: 'Assets', value: f.money(r.assets) },
          { label: 'Liabilities', value: f.money(r.liabilities) },
          { label: 'Debt to assets', value: f.pct(r.debtToAssetPct) },
        ],
      };
    },
    source: 'Assets − liabilities, at today’s values you enter.',
  },
  {
    slug: 'percentage-calculator',
    title: 'Percentage Calculator',
    summary: 'X% of a number, and the percentage change between two numbers.',
    category: 'Everyday',
    region: 'Global',
    fields: [
      { key: 'p', label: 'Percent', def: 18, suffix: '%' },
      { key: 'v', label: 'Of value', def: 250 },
      { key: 'from', label: 'Change from', def: 80 },
      { key: 'to', label: 'Change to', def: 100 },
    ],
    compute: (v, f) => ({
      rows: [
        { label: `${f.num(n(v, 'p'))}% of ${f.num(n(v, 'v'))}`, value: f.num(percentOf(n(v, 'p'), n(v, 'v'))), tone: 'ok' },
        { label: 'Percentage change', value: f.pct(percentChange(n(v, 'from'), n(v, 'to'))) },
      ],
    }),
    source: 'Change = (new − old) ÷ |old| × 100.',
  },
  {
    slug: 'discount-calculator',
    title: 'Discount Calculator',
    summary: 'Sale price after one or two stacked discounts.',
    category: 'Everyday',
    region: 'Global',
    fields: [
      { key: 'p', label: 'Original price', def: 100, inr: 2_000 },
      { key: 'd1', label: 'Discount', def: 30, suffix: '%' },
      { key: 'd2', label: 'Extra discount', def: 10, suffix: '%' },
    ],
    compute: (v, f) => {
      const r = discount(n(v, 'p'), n(v, 'd1'), n(v, 'd2'));
      return {
        rows: [
          { label: 'You pay', value: f.money(r.finalPrice, 2), tone: 'ok' },
          { label: 'You save', value: f.money(r.saved, 2) },
          { label: 'Total discount', value: f.pct(r.effectivePct), sub: 'stacked discounts multiply, not add' },
        ],
      };
    },
    source: 'Price × (1 − d₁) × (1 − d₂).',
  },
  {
    slug: 'tip-calculator',
    title: 'Tip & Bill Split Calculator',
    summary: 'Tip amount and each person’s share of the bill.',
    category: 'Everyday',
    region: 'Global',
    fields: [
      { key: 'b', label: 'Bill', def: 120, inr: 3_000 },
      { key: 't', label: 'Tip', def: 15, inr: 10, suffix: '%' },
      { key: 'p', label: 'People', def: 4, step: 1 },
    ],
    compute: (v, f) => {
      const r = tipSplit(n(v, 'b'), n(v, 't'), n(v, 'p'));
      return { rows: [{ label: 'Each pays', value: f.money(r.perPerson, 2), tone: 'ok' }, { label: 'Tip', value: f.money(r.tip, 2) }, { label: 'Total', value: f.money(r.total, 2) }] };
    },
    source: 'Bill × (1 + tip %) ÷ people. Some bills already include a service charge.',
  },

  /* ---------------- Business ---------------- */
  {
    slug: 'npv-irr-calculator',
    title: 'NPV & IRR Calculator',
    summary: 'Net present value and internal rate of return for a series of yearly cash flows.',
    category: 'Business',
    region: 'Global',
    fields: [
      { key: 'flows', label: 'Cash flows, one per year (first = today)', kind: 'text', def: '-10000, 3000, 4000, 4000, 3000', hint: 'Use a minus sign for money going out' },
      { key: 'r', label: 'Discount rate', def: 8, suffix: '%' },
    ],
    compute: (v, f) => {
      const flows = parseList(String(v.flows));
      const value = npv(n(v, 'r'), flows);
      return {
        rows: [
          { label: 'NPV', value: f.money(value, 2), tone: value >= 0 ? 'ok' : 'bad' },
          { label: 'IRR', value: irr(flows) === null ? 'Needs money out and money in' : f.pct(irr(flows)) },
        ],
      };
    },
    source: 'NPV = Σ CFₜ ÷ (1 + r)ᵗ; IRR is the rate that makes NPV zero (solved numerically).',
  },
  {
    slug: 'xirr-calculator',
    title: 'XIRR Calculator',
    summary: 'Annualised return on investments made and withdrawn on different dates.',
    category: 'Saving & investing',
    region: 'Global',
    fields: [
      {
        key: 'rows', label: 'One line per cash flow: date, amount', kind: 'text',
        def: '2023-01-01, -10000\n2024-01-01, -10000\n2026-11-01, 24500', hint: 'Invested amounts are negative; today’s value is positive',
      },
    ],
    compute: (v, f) => {
      const flows = String(v.rows)
        .split(/\n+/)
        .map((line) => line.split(','))
        .filter((p) => p.length >= 2)
        .map((p) => ({ date: p[0].trim(), amount: Number(p[1].trim()) }));
      const r = xirr(flows);
      return { rows: [{ label: 'XIRR', value: r === null ? 'Needs at least one negative and one positive dated amount' : f.pct(r), tone: 'ok' }] };
    },
    source: 'Same method as spreadsheet XIRR: Σ CFᵢ ÷ (1 + r)^(days ÷ 365) = 0.',
  },
  {
    slug: 'margin-markup-calculator',
    title: 'Profit Margin & Markup Calculator',
    summary: 'Profit, margin and markup from cost and selling price.',
    category: 'Business',
    region: 'Global',
    fields: [
      { key: 'c', label: 'Cost', def: 75, inr: 750 },
      { key: 'p', label: 'Selling price', def: 100, inr: 1_000 },
    ],
    compute: (v, f) => {
      const r = marginMarkup(n(v, 'c'), n(v, 'p'));
      return {
        rows: [
          { label: 'Profit', value: f.money(r.profit, 2), tone: r.profit >= 0 ? 'ok' : 'bad' },
          { label: 'Margin', value: f.pct(r.marginPct), sub: 'profit ÷ price' },
          { label: 'Markup', value: f.pct(r.markupPct), sub: 'profit ÷ cost' },
        ],
      };
    },
    source: 'Margin = (price − cost) ÷ price; markup = (price − cost) ÷ cost. Before tax.',
  },
  {
    slug: 'break-even-calculator',
    title: 'Break-even Calculator',
    summary: 'Units you must sell to cover fixed costs.',
    category: 'Business',
    region: 'Global',
    fields: [
      { key: 'fixed', label: 'Fixed costs', def: 10_000, inr: 200_000 },
      { key: 'price', label: 'Price per unit', def: 50, inr: 500 },
      { key: 'var', label: 'Variable cost per unit', def: 30, inr: 300 },
    ],
    compute: (v, f) => {
      const r = breakEven(n(v, 'fixed'), n(v, 'price'), n(v, 'var'));
      return {
        rows:
          r.units === null
            ? [{ label: 'Break-even', value: 'Never: each sale loses money', tone: 'bad' }]
            : [{ label: 'Units to break even', value: f.num(r.units), tone: 'ok' }, { label: 'Revenue at break-even', value: f.money(r.revenue ?? 0) }],
      };
    },
    source: 'Fixed costs ÷ (price − variable cost per unit), rounded up.',
  },
];

export const TOOL_BY_SLUG: Record<string, ToolDef> = Object.fromEntries(TOOLS.map((t) => [t.slug, t]));

export const CATEGORIES: Category[] = ['Tax & salary', 'Saving & investing', 'Borrowing', 'Housing', 'Everyday', 'Business'];
