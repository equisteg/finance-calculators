/**
 * Finealth calculation engines.
 *
 * Every formula the UI shows lives here, so the pages, the standalone calculator
 * routes and the unit tests all exercise the same code.
 *
 * This file is kept byte-identical in apps/web and apps/mobile; each app has a
 * unit test that fails if the two copies drift apart.
 *
 * Statutory figures and the periods they apply to:
 *   India  - Income-tax slabs for FY 2025-26, unchanged for tax year 2026-27 (Budget 2026)
 *            GST 2.0 slabs effective 22 Sep 2025 (12% and 28% abolished)
 *   US     - Federal brackets and standard deduction for 2026 (IRS Rev. Proc. 2025-32),
 *            Social Security wage base 2026
 *   UK     - Income tax and Class 1 NI for 2026/27 (England, Wales & NI)
 *            SDLT residential rates from 1 April 2025 (England & NI)
 */

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */

/** A progressive band: income up to `upTo` is taxed at `rate`. */
export interface TaxBand {
  upTo: number;
  rate: number;
}

/** Tax on `income` across progressive `bands` (ordered, last band upTo = Infinity). */
export function progressiveTax(income: number, bands: TaxBand[]): number {
  let tax = 0;
  let lower = 0;
  for (const band of bands) {
    if (income <= lower) break;
    tax += (Math.min(income, band.upTo) - lower) * band.rate;
    lower = band.upTo;
  }
  return tax;
}

/** Rounds to paise / cents. */
export const round2 = (n: number) => Math.round(n * 100) / 100;

const clampMin0 = (n: number) => (Number.isFinite(n) ? Math.max(0, n) : 0);

/* ------------------------------------------------------------------ */
/* Loans                                                               */
/* ------------------------------------------------------------------ */

/** Monthly installment on a diminishing-balance loan. Handles a 0% rate. */
export function monthlyInstallment(principal: number, annualRatePct: number, months: number): number {
  if (months <= 0) return 0;
  const r = annualRatePct / 12 / 100;
  if (r === 0) return principal / months;
  const growth = Math.pow(1 + r, months);
  return (principal * r * growth) / (growth - 1);
}

export interface LoanSummary {
  emi: number;
  totalPayment: number;
  totalInterest: number;
  /** Share of total repayment that is principal, 0..1 */
  principalShare: number;
}

export function loanSummary(principal: number, annualRatePct: number, years: number): LoanSummary {
  const months = Math.round(years * 12);
  const emi = Math.round(monthlyInstallment(principal, annualRatePct, months));
  const totalPayment = emi * months;
  const totalInterest = clampMin0(totalPayment - principal);
  return {
    emi,
    totalPayment,
    totalInterest,
    principalShare: totalPayment > 0 ? Math.min(1, principal / totalPayment) : 1,
  };
}

export interface MortgagePitiInput {
  homeValue: number;
  downPayment: number;
  annualRatePct: number;
  years: number;
  propertyTaxRatePct: number;
  annualInsurance: number;
  /** Monthly PMI, charged only while the loan exceeds 80% of home value. */
  monthlyPmi: number;
}

export interface MortgagePiti {
  loanAmount: number;
  principalAndInterest: number;
  monthlyPropertyTax: number;
  monthlyInsurance: number;
  monthlyPmi: number;
  totalMonthly: number;
  loanToValuePct: number;
}

/** US mortgage PITI. Property tax is assessed on home value, not the loan. */
export function mortgagePiti(input: MortgagePitiInput): MortgagePiti {
  const homeValue = clampMin0(input.homeValue);
  const downPayment = Math.min(clampMin0(input.downPayment), homeValue);
  const loanAmount = homeValue - downPayment;
  const loanToValuePct = homeValue > 0 ? (loanAmount / homeValue) * 100 : 0;

  const principalAndInterest = Math.round(
    monthlyInstallment(loanAmount, input.annualRatePct, Math.round(input.years * 12))
  );
  const monthlyPropertyTax = Math.round((homeValue * input.propertyTaxRatePct) / 100 / 12);
  const monthlyInsurance = Math.round(input.annualInsurance / 12);
  const monthlyPmi = loanToValuePct > 80 ? Math.round(clampMin0(input.monthlyPmi)) : 0;

  return {
    loanAmount,
    principalAndInterest,
    monthlyPropertyTax,
    monthlyInsurance,
    monthlyPmi,
    totalMonthly: principalAndInterest + monthlyPropertyTax + monthlyInsurance + monthlyPmi,
    loanToValuePct,
  };
}

/* ------------------------------------------------------------------ */
/* Investments                                                         */
/* ------------------------------------------------------------------ */

export interface GrowthSummary {
  invested: number;
  maturity: number;
  gains: number;
}

/**
 * SIP future value with deposits at the start of each month (annuity-due),
 * optionally stepping the deposit up by `stepUpPct` at the start of each year.
 */
export function sipFutureValue(
  monthlyDeposit: number,
  annualReturnPct: number,
  years: number,
  stepUpPct = 0
): GrowthSummary {
  const r = annualReturnPct / 12 / 100;
  let invested = 0;
  let corpus = 0;
  let deposit = monthlyDeposit;

  for (let y = 0; y < years; y++) {
    for (let m = 0; m < 12; m++) {
      invested += deposit;
      corpus = (corpus + deposit) * (1 + r);
    }
    deposit += (deposit * stepUpPct) / 100;
  }

  return {
    invested: Math.round(invested),
    maturity: Math.round(corpus),
    gains: Math.round(clampMin0(corpus - invested)),
  };
}

/** Lump sum compounded `periodsPerYear` times a year. */
export function lumpSumFutureValue(
  principal: number,
  annualRatePct: number,
  years: number,
  periodsPerYear = 1
): GrowthSummary {
  const maturity = principal * Math.pow(1 + annualRatePct / 100 / periodsPerYear, periodsPerYear * years);
  return {
    invested: Math.round(principal),
    maturity: Math.round(maturity),
    gains: Math.round(clampMin0(maturity - principal)),
  };
}

/** Compound growth of an opening balance plus an addition at the end of each year. */
export function compoundGrowth(
  principal: number,
  annualAddition: number,
  annualRatePct: number,
  years: number,
  periodsPerYear: number
): GrowthSummary {
  const perPeriod = annualRatePct / 100 / periodsPerYear;
  let maturity = principal * Math.pow(1 + perPeriod, periodsPerYear * years);
  for (let year = 1; year <= years; year++) {
    maturity += annualAddition * Math.pow(1 + perPeriod, periodsPerYear * (years - year));
  }
  const invested = principal + annualAddition * years;
  return {
    invested: Math.round(invested),
    maturity: Math.round(maturity),
    gains: Math.round(clampMin0(maturity - invested)),
  };
}

export interface SwpSummary {
  corpus: number;
  totalWithdrawn: number;
  remainingBalance: number;
  /** Month in which the corpus ran out, or null if it lasted the full term. */
  exhaustedInMonth: number | null;
}

/** Systematic withdrawal: interest accrues monthly, then the withdrawal is taken. */
export function systematicWithdrawal(
  corpus: number,
  monthlyWithdrawal: number,
  annualRatePct: number,
  years: number
): SwpSummary {
  const r = annualRatePct / 12 / 100;
  let balance = corpus;
  let totalWithdrawn = 0;
  let exhaustedInMonth: number | null = null;

  for (let month = 1; month <= years * 12; month++) {
    balance *= 1 + r;
    const taken = Math.min(balance, monthlyWithdrawal);
    balance -= taken;
    totalWithdrawn += taken;
    if (balance <= 0) {
      balance = 0;
      exhaustedInMonth = month;
      break;
    }
  }

  return {
    corpus,
    totalWithdrawn: Math.round(totalWithdrawn),
    remainingBalance: Math.round(balance),
    exhaustedInMonth,
  };
}

export interface FireSummary {
  targetCorpus: number;
  /** Years to reach the target, or null if it is not reached within `maxYears`. */
  yearsToTarget: number | null;
}

/** Years until savings reach 25x annual expenses (the 4% rule). */
export function yearsToFinancialIndependence(
  annualExpense: number,
  currentSavings: number,
  monthlySaving: number,
  annualReturnPct: number,
  maxYears = 50
): FireSummary {
  const targetCorpus = annualExpense * 25;
  const r = annualReturnPct / 12 / 100;
  let balance = currentSavings;

  for (let month = 0; month <= maxYears * 12; month++) {
    if (balance >= targetCorpus) {
      return { targetCorpus, yearsToTarget: Math.round((month / 12) * 10) / 10 };
    }
    balance = (balance + monthlySaving) * (1 + r);
  }
  return { targetCorpus, yearsToTarget: null };
}

/* ------------------------------------------------------------------ */
/* India: income tax (tax year 2026-27)                                */
/* ------------------------------------------------------------------ */

export const INDIA_NEW_REGIME_BANDS: TaxBand[] = [
  { upTo: 400_000, rate: 0 },
  { upTo: 800_000, rate: 0.05 },
  { upTo: 1_200_000, rate: 0.1 },
  { upTo: 1_600_000, rate: 0.15 },
  { upTo: 2_000_000, rate: 0.2 },
  { upTo: 2_400_000, rate: 0.25 },
  { upTo: Infinity, rate: 0.3 },
];

export const INDIA_OLD_REGIME_BANDS: TaxBand[] = [
  { upTo: 250_000, rate: 0 },
  { upTo: 500_000, rate: 0.05 },
  { upTo: 1_000_000, rate: 0.2 },
  { upTo: Infinity, rate: 0.3 },
];

const INDIA_NEW_STANDARD_DEDUCTION = 75_000;
const INDIA_OLD_STANDARD_DEDUCTION = 50_000;
const INDIA_NEW_REBATE_LIMIT = 1_200_000;
const INDIA_OLD_REBATE_LIMIT = 500_000;
const INDIA_80C_CAP = 150_000;
const INDIA_80D_CAP = 100_000;
const HEALTH_AND_EDUCATION_CESS = 0.04;

/**
 * Surcharge with marginal relief: the extra tax from crossing a threshold may
 * not exceed the income above that threshold.
 */
function indiaSurcharge(
  taxableIncome: number,
  tax: number,
  bands: TaxBand[],
  schedule: Array<{ above: number; rate: number }>
): number {
  const applicable = [...schedule].reverse().find((s) => taxableIncome > s.above);
  if (!applicable) return 0;

  const surcharge = tax * applicable.rate;

  // Tax + surcharge exactly at the threshold, under the next-lower surcharge rate.
  const lowerRate = schedule
    .filter((s) => s.above < applicable.above)
    .reduce((rate, s) => Math.max(rate, s.rate), 0);
  const taxAtThreshold = progressiveTax(applicable.above, bands);
  const liabilityAtThreshold = taxAtThreshold * (1 + lowerRate);
  const maxLiability = liabilityAtThreshold + (taxableIncome - applicable.above);

  return Math.max(0, Math.min(surcharge, maxLiability - tax));
}

export interface IndiaRegimeResult {
  taxableIncome: number;
  /** Final liability including surcharge and 4% cess, in whole rupees. */
  totalTax: number;
}

/** New regime (s.115BAC) for a salaried individual. */
export function indiaNewRegimeTax(grossSalary: number): IndiaRegimeResult {
  const taxableIncome = clampMin0(grossSalary - INDIA_NEW_STANDARD_DEDUCTION);
  let tax = progressiveTax(taxableIncome, INDIA_NEW_REGIME_BANDS);

  // Rebate u/s 87A: nil tax up to ₹12L, with marginal relief just above it.
  if (taxableIncome <= INDIA_NEW_REBATE_LIMIT) {
    tax = 0;
  } else {
    tax = Math.min(tax, taxableIncome - INDIA_NEW_REBATE_LIMIT);
  }

  const surcharge = indiaSurcharge(taxableIncome, tax, INDIA_NEW_REGIME_BANDS, [
    { above: 5_000_000, rate: 0.1 },
    { above: 10_000_000, rate: 0.15 },
    { above: 20_000_000, rate: 0.25 }, // capped at 25% under the new regime
  ]);

  return {
    taxableIncome,
    totalTax: Math.round((tax + surcharge) * (1 + HEALTH_AND_EDUCATION_CESS)),
  };
}

export interface IndiaOldRegimeDeductions {
  section80C: number;
  section80D: number;
  hraExemption: number;
}

/** Old regime for a salaried individual below 60. */
export function indiaOldRegimeTax(
  grossSalary: number,
  deductions: IndiaOldRegimeDeductions
): IndiaRegimeResult {
  const totalDeductions =
    INDIA_OLD_STANDARD_DEDUCTION +
    Math.min(clampMin0(deductions.section80C), INDIA_80C_CAP) +
    Math.min(clampMin0(deductions.section80D), INDIA_80D_CAP) +
    clampMin0(deductions.hraExemption);

  const taxableIncome = clampMin0(grossSalary - totalDeductions);
  let tax = progressiveTax(taxableIncome, INDIA_OLD_REGIME_BANDS);
  if (taxableIncome <= INDIA_OLD_REBATE_LIMIT) tax = 0;

  const surcharge = indiaSurcharge(taxableIncome, tax, INDIA_OLD_REGIME_BANDS, [
    { above: 5_000_000, rate: 0.1 },
    { above: 10_000_000, rate: 0.15 },
    { above: 20_000_000, rate: 0.25 },
    { above: 50_000_000, rate: 0.37 },
  ]);

  return {
    taxableIncome,
    totalTax: Math.round((tax + surcharge) * (1 + HEALTH_AND_EDUCATION_CESS)),
  };
}

export interface IndiaRegimeComparison {
  newTax: number;
  oldTax: number;
  recommended: "NEW REGIME" | "OLD REGIME";
  savings: number;
}

export function compareIndiaRegimes(
  grossSalary: number,
  deductions: IndiaOldRegimeDeductions
): IndiaRegimeComparison {
  const newTax = indiaNewRegimeTax(grossSalary).totalTax;
  const oldTax = indiaOldRegimeTax(grossSalary, deductions).totalTax;
  return {
    newTax,
    oldTax,
    recommended: newTax <= oldTax ? "NEW REGIME" : "OLD REGIME",
    savings: Math.abs(newTax - oldTax),
  };
}

export interface CtcBreakdown {
  basicMonthly: number;
  employeePfMonthly: number;
  incomeTaxAnnual: number;
  monthlyInHand: number;
}

/**
 * CTC to monthly in-hand under the new regime.
 *
 * Basic is 40% of fixed pay. Employer PF (12% of basic) and gratuity (4.81% of
 * basic) sit inside CTC but are not paid out. Tax is computed on the whole
 * taxable salary for the year -- including the bonus -- and deducted evenly
 * across 12 months, the way employers withhold TDS. The bonus itself is paid
 * separately and is not part of the monthly figure.
 */
export function ctcToInHand(
  ctc: number,
  annualBonus: number,
  professionalTaxAnnual = 2_500
): CtcBreakdown {
  const fixedPay = clampMin0(ctc - annualBonus);
  const basicAnnual = fixedPay * 0.4;
  const employerPf = basicAnnual * 0.12;
  const employeePf = basicAnnual * 0.12;
  const gratuity = basicAnnual * 0.0481;

  const grossFixedSalary = fixedPay - employerPf - gratuity;
  const taxableSalary = grossFixedSalary + annualBonus;
  const incomeTaxAnnual = indiaNewRegimeTax(taxableSalary).totalTax;

  const monthlyInHand = (grossFixedSalary - employeePf - professionalTaxAnnual - incomeTaxAnnual) / 12;

  return {
    basicMonthly: Math.round(basicAnnual / 12),
    employeePfMonthly: Math.round(employeePf / 12),
    incomeTaxAnnual,
    monthlyInHand: Math.round(clampMin0(monthlyInHand)),
  };
}

/* ------------------------------------------------------------------ */
/* India: GST (GST 2.0, effective 22 Sep 2025)                         */
/* ------------------------------------------------------------------ */

/** 3% applies to gold/silver bullion; 40% to demerit goods. */
export const INDIA_GST_RATES = [3, 5, 18, 40] as const;

export interface GstBreakdown {
  base: number;
  totalTax: number;
  cgst: number;
  sgst: number;
  total: number;
}

/**
 * GST on an intra-state supply, in paise precision. CGST and SGST are each half
 * the tax; SGST takes the residual so the two always sum exactly to the total.
 */
export function gstBreakdown(amount: number, ratePct: number, taxInclusive: boolean): GstBreakdown {
  const base = taxInclusive ? round2(amount / (1 + ratePct / 100)) : round2(amount);
  const totalTax = taxInclusive ? round2(amount - base) : round2((amount * ratePct) / 100);
  const cgst = round2(totalTax / 2);
  const sgst = round2(totalTax - cgst);
  return { base, totalTax, cgst, sgst, total: round2(base + totalTax) };
}

/* ------------------------------------------------------------------ */
/* Consumption taxes (EU VAT, US sales tax)                            */
/* ------------------------------------------------------------------ */

export interface ConsumptionTax {
  base: number;
  tax: number;
  total: number;
}

/** A single-rate consumption tax, either added on top or extracted from a gross price. */
export function consumptionTax(amount: number, ratePct: number, taxInclusive: boolean): ConsumptionTax {
  const base = taxInclusive ? round2(amount / (1 + ratePct / 100)) : round2(amount);
  const tax = taxInclusive ? round2(amount - base) : round2((amount * ratePct) / 100);
  return { base, tax, total: round2(base + tax) };
}

/** Standard VAT rates, 2026. */
export const EU_STANDARD_VAT_RATES: Record<string, { name: string; rate: number }> = {
  AT: { name: "Austria", rate: 20 },
  BE: { name: "Belgium", rate: 21 },
  DE: { name: "Germany", rate: 19 },
  DK: { name: "Denmark", rate: 25 },
  EE: { name: "Estonia", rate: 24 },
  ES: { name: "Spain", rate: 21 },
  FI: { name: "Finland", rate: 25.5 },
  FR: { name: "France", rate: 20 },
  GR: { name: "Greece", rate: 24 },
  HU: { name: "Hungary", rate: 27 },
  IE: { name: "Ireland", rate: 23 },
  IT: { name: "Italy", rate: 22 },
  LU: { name: "Luxembourg", rate: 17 },
  NL: { name: "Netherlands", rate: 21 },
  PL: { name: "Poland", rate: 23 },
  PT: { name: "Portugal", rate: 23 },
  RO: { name: "Romania", rate: 21 },
  SE: { name: "Sweden", rate: 25 },
  SK: { name: "Slovakia", rate: 23 },
};

/* ------------------------------------------------------------------ */
/* United States: 2026 paycheck (single filer)                         */
/* ------------------------------------------------------------------ */

export const US_FEDERAL_BANDS_2026_SINGLE: TaxBand[] = [
  { upTo: 12_400, rate: 0.1 },
  { upTo: 50_400, rate: 0.12 },
  { upTo: 105_700, rate: 0.22 },
  { upTo: 201_775, rate: 0.24 },
  { upTo: 256_225, rate: 0.32 },
  { upTo: 640_600, rate: 0.35 },
  { upTo: Infinity, rate: 0.37 },
];

const US_STANDARD_DEDUCTION_2026_SINGLE = 16_100;
const US_SOCIAL_SECURITY_WAGE_BASE_2026 = 184_500;
const US_ADDITIONAL_MEDICARE_THRESHOLD_SINGLE = 200_000;

export interface UsPaycheck {
  federalTax: number;
  stateTax: number;
  fica: number;
  netMonthly: number;
  effectiveTaxRatePct: number;
}

/**
 * Annual take-home for a single filer taking the standard deduction.
 * State tax is an estimate: the state's headline rate applied to federal
 * taxable income, since most states start from that base.
 */
export function usPaycheck(grossAnnual: number, stateRatePct: number): UsPaycheck {
  const gross = clampMin0(grossAnnual);
  const taxable = clampMin0(gross - US_STANDARD_DEDUCTION_2026_SINGLE);

  const federalTax = progressiveTax(taxable, US_FEDERAL_BANDS_2026_SINGLE);
  const stateTax = (taxable * stateRatePct) / 100;
  const socialSecurity = Math.min(gross, US_SOCIAL_SECURITY_WAGE_BASE_2026) * 0.062;
  const medicare =
    gross * 0.0145 + clampMin0(gross - US_ADDITIONAL_MEDICARE_THRESHOLD_SINGLE) * 0.009;

  const total = federalTax + stateTax + socialSecurity + medicare;
  return {
    federalTax: Math.round(federalTax),
    stateTax: Math.round(stateTax),
    fica: Math.round(socialSecurity + medicare),
    netMonthly: Math.round((gross - total) / 12),
    effectiveTaxRatePct: gross > 0 ? Math.round((total / gross) * 1000) / 10 : 0,
  };
}

/* ------------------------------------------------------------------ */
/* United Kingdom: 2026/27 PAYE (England, Wales & NI)                  */
/* ------------------------------------------------------------------ */

const UK_PERSONAL_ALLOWANCE = 12_570;
const UK_ALLOWANCE_TAPER_START = 100_000;
const UK_BASIC_RATE_LIMIT = 37_700;
const UK_HIGHER_RATE_LIMIT = 125_140;
const UK_NI_PRIMARY_THRESHOLD = 12_570;
const UK_NI_UPPER_EARNINGS_LIMIT = 50_270;

export interface UkTakeHome {
  personalAllowance: number;
  incomeTax: number;
  nationalInsurance: number;
  netMonthly: number;
}

export function ukTakeHome(grossAnnual: number): UkTakeHome {
  const gross = clampMin0(grossAnnual);

  // The allowance falls by £1 for every £2 of income above £100,000.
  const personalAllowance = clampMin0(
    UK_PERSONAL_ALLOWANCE - Math.floor(clampMin0(gross - UK_ALLOWANCE_TAPER_START) / 2)
  );
  const taxable = clampMin0(gross - personalAllowance);

  // Band limits are defined on taxable income.
  const incomeTax = progressiveTax(taxable, [
    { upTo: UK_BASIC_RATE_LIMIT, rate: 0.2 },
    { upTo: UK_HIGHER_RATE_LIMIT, rate: 0.4 },
    { upTo: Infinity, rate: 0.45 },
  ]);

  const nationalInsurance =
    (Math.min(gross, UK_NI_UPPER_EARNINGS_LIMIT) - Math.min(gross, UK_NI_PRIMARY_THRESHOLD)) * 0.08 +
    clampMin0(gross - UK_NI_UPPER_EARNINGS_LIMIT) * 0.02;

  return {
    personalAllowance,
    incomeTax: Math.round(incomeTax),
    nationalInsurance: Math.round(nationalInsurance),
    netMonthly: Math.round((gross - incomeTax - nationalInsurance) / 12),
  };
}

/* ------------------------------------------------------------------ */
/* United Kingdom: Stamp Duty Land Tax (England & NI, residential)     */
/* ------------------------------------------------------------------ */

const SDLT_STANDARD_BANDS: TaxBand[] = [
  { upTo: 125_000, rate: 0 },
  { upTo: 250_000, rate: 0.02 },
  { upTo: 925_000, rate: 0.05 },
  { upTo: 1_500_000, rate: 0.1 },
  { upTo: Infinity, rate: 0.12 },
];

const SDLT_FIRST_TIME_BUYER_BANDS: TaxBand[] = [
  { upTo: 300_000, rate: 0 },
  { upTo: 500_000, rate: 0.05 },
];

const SDLT_FIRST_TIME_BUYER_PRICE_CAP = 500_000;
const SDLT_ADDITIONAL_DWELLING_SURCHARGE = 0.05;
const SDLT_ADDITIONAL_DWELLING_MIN_PRICE = 40_000;

export type SdltBuyer = "standard" | "first-time" | "additional";

export interface SdltResult {
  tax: number;
  effectiveRatePct: number;
  /** True when first-time buyer relief was requested but the price exceeds the cap. */
  reliefUnavailable: boolean;
}

export function stampDutyLandTax(price: number, buyer: SdltBuyer): SdltResult {
  const value = clampMin0(price);
  let tax: number;
  let reliefUnavailable = false;

  if (buyer === "first-time" && value <= SDLT_FIRST_TIME_BUYER_PRICE_CAP) {
    tax = progressiveTax(value, SDLT_FIRST_TIME_BUYER_BANDS);
  } else {
    reliefUnavailable = buyer === "first-time";
    tax = progressiveTax(value, SDLT_STANDARD_BANDS);
    if (buyer === "additional" && value >= SDLT_ADDITIONAL_DWELLING_MIN_PRICE) {
      tax += value * SDLT_ADDITIONAL_DWELLING_SURCHARGE;
    }
  }

  const rounded = Math.floor(tax); // HMRC rounds SDLT down to the pound
  return {
    tax: rounded,
    effectiveRatePct: value > 0 ? Math.round((rounded / value) * 10000) / 100 : 0,
    reliefUnavailable,
  };
}
