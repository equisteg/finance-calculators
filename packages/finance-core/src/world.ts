/**
 * Country tax engines and the world VAT / GST table.
 *
 * Every figure here carries the period it applies to and was last checked on
 * RATES_LAST_CHECKED against the official source named next to it. Rates change
 * every budget: `scheduled.yml` opens a yearly re-check issue, and every result
 * page shows the "last checked" date and a link to the official calculator.
 *
 * These are estimates for a resident employee with salary income only. They
 * leave out the many credits, offsets and special cases each tax system has;
 * the UI says so next to every result.
 */

import { progressiveTax, type TaxBand } from './finance';

export const RATES_LAST_CHECKED = '2026-11-09';

const pos = (n: number) => (Number.isFinite(n) ? Math.max(0, n) : 0);
const r2 = (n: number) => Math.round(n * 100) / 100;

/* ------------------------------------------------------------------ */
/* Australia: resident income tax 2026-27 (from 1 July 2026)            */
/* Source: ato.gov.au "Tax rates - Australian resident"; Treasury Laws  */
/* Amendment (Cost of Living Tax Cuts) Act 2024 and the 2025 Act that   */
/* cut the 16% rate to 15% from 1 July 2026.                            */
/* ------------------------------------------------------------------ */

export const AU_RESIDENT_BANDS_2026_27: TaxBand[] = [
  { upTo: 18_200, rate: 0 },
  { upTo: 45_000, rate: 0.15 },
  { upTo: 135_000, rate: 0.3 },
  { upTo: 190_000, rate: 0.37 },
  { upTo: Infinity, rate: 0.45 },
];

/** Medicare levy 2%; low-income threshold for singles (2024-25 figure, the latest legislated). */
const AU_MEDICARE_RATE = 0.02;
const AU_MEDICARE_LOW_THRESHOLD = 27_222;

/** Low income tax offset: $700, reduced above $37,500 (5c/$) and above $45,000 (1.5c/$). */
export function auLowIncomeOffset(taxable: number): number {
  const t = pos(taxable);
  if (t <= 37_500) return 700;
  if (t <= 45_000) return 700 - (t - 37_500) * 0.05;
  return Math.max(0, 325 - (t - 45_000) * 0.015);
}

export interface AuTax {
  incomeTax: number;
  lowIncomeOffset: number;
  medicareLevy: number;
  totalTax: number;
  netAnnual: number;
  netMonthly: number;
  effectiveRatePct: number;
}

/** Australian resident individual, salary only, no private-health surcharge. */
export function australiaTax(taxableIncome: number): AuTax {
  const t = pos(taxableIncome);
  const gross = progressiveTax(t, AU_RESIDENT_BANDS_2026_27);
  const lito = Math.min(gross, auLowIncomeOffset(t));
  const incomeTax = gross - lito;
  // Shade-in: 10c for every $1 over the threshold until it reaches the full 2%.
  const medicareLevy = t <= AU_MEDICARE_LOW_THRESHOLD ? 0 : Math.min(t * AU_MEDICARE_RATE, (t - AU_MEDICARE_LOW_THRESHOLD) * 0.1);
  const totalTax = incomeTax + medicareLevy;
  return {
    incomeTax: Math.round(incomeTax),
    lowIncomeOffset: Math.round(lito),
    medicareLevy: Math.round(medicareLevy),
    totalTax: Math.round(totalTax),
    netAnnual: Math.round(t - totalTax),
    netMonthly: Math.round((t - totalTax) / 12),
    effectiveRatePct: t > 0 ? r2((totalTax / t) * 100) : 0,
  };
}

/* ------------------------------------------------------------------ */
/* Canada: federal income tax, CPP and EI for 2026                      */
/* Source: canada.ca "Tax rates and income brackets for individuals",   */
/* CRA "CPP contribution rates, maximums and exemptions" and "EI        */
/* premium rates and maximums" (2026). Lowest rate 14% from 2026.       */
/* ------------------------------------------------------------------ */

export const CA_FEDERAL_BANDS_2026: TaxBand[] = [
  { upTo: 58_523, rate: 0.14 },
  { upTo: 117_045, rate: 0.205 },
  { upTo: 181_440, rate: 0.26 },
  { upTo: 258_482, rate: 0.29 },
  { upTo: Infinity, rate: 0.33 },
];

const CA_BPA_MAX = 16_452;
const CA_BPA_MIN = 14_829;
const CA_CREDIT_RATE = 0.14;
const CA_EMPLOYMENT_AMOUNT = 1_501;
const CA_YMPE = 74_600;
const CA_YAMPE = 85_000;
const CA_CPP_EXEMPTION = 3_500;
const CA_CPP_RATE = 0.0595;
const CA_CPP_BASE_RATE = 0.0495;
const CA_CPP2_RATE = 0.04;
const CA_EI_MAX_INSURABLE = 68_900;
const CA_EI_RATE = 0.0163;

/** Basic personal amount: full up to the 26% bracket, falling to the minimum by the 33% bracket. */
export function caBasicPersonalAmount(netIncome: number): number {
  const n = pos(netIncome);
  if (n <= 181_440) return CA_BPA_MAX;
  if (n >= 258_482) return CA_BPA_MIN;
  return CA_BPA_MAX - ((CA_BPA_MAX - CA_BPA_MIN) * (n - 181_440)) / (258_482 - 181_440);
}

export interface CaTax {
  federalTax: number;
  provincialTax: number;
  cpp: number;
  ei: number;
  netAnnual: number;
  netMonthly: number;
  effectiveRatePct: number;
}

/**
 * Canadian employee outside Quebec. Federal tax is exact for salary income with
 * the basic personal, employment, CPP and EI credits; the enhanced CPP and CPP2
 * parts are deducted from income. Provincial tax is an estimate: the province's
 * rate you enter, applied to the same taxable income.
 */
export function canadaTax(employmentIncome: number, provincialRatePct = 0): CaTax {
  const g = pos(employmentIncome);
  const pensionable = Math.max(0, Math.min(g, CA_YMPE) - CA_CPP_EXEMPTION);
  const cppBase = pensionable * CA_CPP_BASE_RATE;
  const cppEnhanced = pensionable * (CA_CPP_RATE - CA_CPP_BASE_RATE);
  const cpp2 = Math.max(0, Math.min(g, CA_YAMPE) - CA_YMPE) * CA_CPP2_RATE;
  const ei = Math.min(g, CA_EI_MAX_INSURABLE) * CA_EI_RATE;

  const taxable = Math.max(0, g - cppEnhanced - cpp2);
  const credits = (caBasicPersonalAmount(taxable) + Math.min(CA_EMPLOYMENT_AMOUNT, g) + cppBase + ei) * CA_CREDIT_RATE;
  const federalTax = Math.max(0, progressiveTax(taxable, CA_FEDERAL_BANDS_2026) - credits);
  const provincialTax = (taxable * pos(provincialRatePct)) / 100;
  const cpp = cppBase + cppEnhanced + cpp2;
  const total = federalTax + provincialTax + cpp + ei;
  return {
    federalTax: Math.round(federalTax),
    provincialTax: Math.round(provincialTax),
    cpp: Math.round(cpp),
    ei: Math.round(ei),
    netAnnual: Math.round(g - total),
    netMonthly: Math.round((g - total) / 12),
    effectiveRatePct: g > 0 ? r2((total / g) * 100) : 0,
  };
}

/** Canadian sales tax by province: GST 5% plus PST/QST, or a single HST. */
export const CA_SALES_TAX: Record<string, { name: string; gst: number; provincial: number; hst: boolean }> = {
  AB: { name: 'Alberta', gst: 5, provincial: 0, hst: false },
  BC: { name: 'British Columbia', gst: 5, provincial: 7, hst: false },
  MB: { name: 'Manitoba', gst: 5, provincial: 7, hst: false },
  NB: { name: 'New Brunswick', gst: 0, provincial: 15, hst: true },
  NL: { name: 'Newfoundland and Labrador', gst: 0, provincial: 15, hst: true },
  NS: { name: 'Nova Scotia', gst: 0, provincial: 14, hst: true },
  NT: { name: 'Northwest Territories', gst: 5, provincial: 0, hst: false },
  NU: { name: 'Nunavut', gst: 5, provincial: 0, hst: false },
  ON: { name: 'Ontario', gst: 0, provincial: 13, hst: true },
  PE: { name: 'Prince Edward Island', gst: 0, provincial: 15, hst: true },
  QC: { name: 'Quebec', gst: 5, provincial: 9.975, hst: false },
  SK: { name: 'Saskatchewan', gst: 5, provincial: 6, hst: false },
  YT: { name: 'Yukon', gst: 5, provincial: 0, hst: false },
};

/* ------------------------------------------------------------------ */
/* Singapore: resident income tax, YA 2025 onwards                      */
/* Source: iras.gov.sg "Individual income tax rates" (resident).         */
/* ------------------------------------------------------------------ */

export const SG_RESIDENT_BANDS: TaxBand[] = [
  { upTo: 20_000, rate: 0 },
  { upTo: 30_000, rate: 0.02 },
  { upTo: 40_000, rate: 0.035 },
  { upTo: 80_000, rate: 0.07 },
  { upTo: 120_000, rate: 0.115 },
  { upTo: 160_000, rate: 0.15 },
  { upTo: 200_000, rate: 0.18 },
  { upTo: 240_000, rate: 0.19 },
  { upTo: 280_000, rate: 0.195 },
  { upTo: 320_000, rate: 0.2 },
  { upTo: 500_000, rate: 0.22 },
  { upTo: 1_000_000, rate: 0.23 },
  { upTo: Infinity, rate: 0.24 },
];

/** CPF ordinary wage ceiling from 1 Jan 2026; employee share for age 55 and below. */
const SG_CPF_OW_CEILING_MONTHLY = 8_000;
const SG_CPF_EMPLOYEE_RATE = 0.2;

export interface SgTax {
  cpfEmployee: number;
  chargeableIncome: number;
  incomeTax: number;
  netAnnual: number;
  netMonthly: number;
  effectiveRatePct: number;
}

/**
 * Singapore resident aged 55 or below on a steady monthly salary (no bonus).
 * Reliefs counted: employee CPF and the S$1,000 earned income relief. Any
 * one-off personal tax rebate announced in a Budget is not included.
 */
export function singaporeTax(annualSalary: number, otherReliefs = 0, citizenOrPr = true): SgTax {
  const g = pos(annualSalary);
  const cpfEmployee = citizenOrPr ? Math.min(g / 12, SG_CPF_OW_CEILING_MONTHLY) * 12 * SG_CPF_EMPLOYEE_RATE : 0;
  const chargeableIncome = Math.max(0, g - cpfEmployee - 1_000 - pos(otherReliefs));
  const incomeTax = progressiveTax(chargeableIncome, SG_RESIDENT_BANDS);
  const net = g - cpfEmployee - incomeTax;
  return {
    cpfEmployee: Math.round(cpfEmployee),
    chargeableIncome: Math.round(chargeableIncome),
    incomeTax: Math.round(incomeTax),
    netAnnual: Math.round(net),
    netMonthly: Math.round(net / 12),
    effectiveRatePct: g > 0 ? r2((incomeTax / g) * 100) : 0,
  };
}

/* ------------------------------------------------------------------ */
/* New Zealand: income tax from 31 July 2024 (full-year rates 2025-26 on)*/
/* Source: ird.govt.nz "Tax rates for individuals".                      */
/* ------------------------------------------------------------------ */

export const NZ_BANDS: TaxBand[] = [
  { upTo: 15_600, rate: 0.105 },
  { upTo: 53_500, rate: 0.175 },
  { upTo: 78_100, rate: 0.3 },
  { upTo: 180_000, rate: 0.33 },
  { upTo: Infinity, rate: 0.39 },
];

export interface NzTax {
  incomeTax: number;
  acc: number;
  netAnnual: number;
  netMonthly: number;
  effectiveRatePct: number;
}

/** NZ employee: PAYE income tax plus the ACC earners' levy at the rate you enter (it changes each 1 April). */
export function newZealandTax(annualIncome: number, accLevyPct = 1.75, accMaxEarnings = 156_641): NzTax {
  const g = pos(annualIncome);
  const incomeTax = progressiveTax(g, NZ_BANDS);
  const acc = (Math.min(g, pos(accMaxEarnings)) * pos(accLevyPct)) / 100;
  const net = g - incomeTax - acc;
  return {
    incomeTax: Math.round(incomeTax),
    acc: Math.round(acc),
    netAnnual: Math.round(net),
    netMonthly: Math.round(net / 12),
    effectiveRatePct: g > 0 ? r2(((incomeTax + acc) / g) * 100) : 0,
  };
}

/* ------------------------------------------------------------------ */
/* World VAT / GST / sales tax: standard rates                          */
/* Source: each tax authority; EU rates cross-checked with the European */
/* Commission "VAT rates in the EU" table. Pakistan is not listed.      */
/* ------------------------------------------------------------------ */

export interface WorldVatRate {
  name: string;
  /** Standard rate in %. */
  rate: number;
  /** Local name of the tax. */
  tax: string;
  region: 'EU' | 'Europe' | 'Americas' | 'Asia-Pacific' | 'Middle East' | 'Africa';
  note?: string;
}

export const WORLD_VAT_RATES: Record<string, WorldVatRate> = {
  // European Union (27)
  AT: { name: 'Austria', rate: 20, tax: 'VAT', region: 'EU' },
  BE: { name: 'Belgium', rate: 21, tax: 'VAT', region: 'EU' },
  BG: { name: 'Bulgaria', rate: 20, tax: 'VAT', region: 'EU' },
  HR: { name: 'Croatia', rate: 25, tax: 'VAT', region: 'EU' },
  CY: { name: 'Cyprus', rate: 19, tax: 'VAT', region: 'EU' },
  CZ: { name: 'Czechia', rate: 21, tax: 'VAT', region: 'EU' },
  DK: { name: 'Denmark', rate: 25, tax: 'VAT', region: 'EU' },
  EE: { name: 'Estonia', rate: 24, tax: 'VAT', region: 'EU' },
  FI: { name: 'Finland', rate: 25.5, tax: 'VAT', region: 'EU' },
  FR: { name: 'France', rate: 20, tax: 'VAT', region: 'EU' },
  DE: { name: 'Germany', rate: 19, tax: 'VAT', region: 'EU' },
  GR: { name: 'Greece', rate: 24, tax: 'VAT', region: 'EU' },
  HU: { name: 'Hungary', rate: 27, tax: 'VAT', region: 'EU' },
  IE: { name: 'Ireland', rate: 23, tax: 'VAT', region: 'EU' },
  IT: { name: 'Italy', rate: 22, tax: 'VAT', region: 'EU' },
  LV: { name: 'Latvia', rate: 21, tax: 'VAT', region: 'EU' },
  LT: { name: 'Lithuania', rate: 21, tax: 'VAT', region: 'EU' },
  LU: { name: 'Luxembourg', rate: 17, tax: 'VAT', region: 'EU' },
  MT: { name: 'Malta', rate: 18, tax: 'VAT', region: 'EU' },
  NL: { name: 'Netherlands', rate: 21, tax: 'VAT', region: 'EU' },
  PL: { name: 'Poland', rate: 23, tax: 'VAT', region: 'EU' },
  PT: { name: 'Portugal', rate: 23, tax: 'VAT', region: 'EU', note: 'Mainland; Madeira and the Azores are lower' },
  RO: { name: 'Romania', rate: 21, tax: 'VAT', region: 'EU' },
  SK: { name: 'Slovakia', rate: 23, tax: 'VAT', region: 'EU' },
  SI: { name: 'Slovenia', rate: 22, tax: 'VAT', region: 'EU' },
  ES: { name: 'Spain', rate: 21, tax: 'VAT', region: 'EU', note: 'Mainland and Balearics; the Canary Islands use IGIC' },
  SE: { name: 'Sweden', rate: 25, tax: 'VAT', region: 'EU' },
  // Rest of Europe
  GB: { name: 'United Kingdom', rate: 20, tax: 'VAT', region: 'Europe' },
  CH: { name: 'Switzerland', rate: 8.1, tax: 'VAT', region: 'Europe' },
  NO: { name: 'Norway', rate: 25, tax: 'VAT', region: 'Europe' },
  IS: { name: 'Iceland', rate: 24, tax: 'VAT', region: 'Europe' },
  TR: { name: 'Türkiye', rate: 20, tax: 'KDV', region: 'Europe' },
  // Americas
  CA: { name: 'Canada (federal GST)', rate: 5, tax: 'GST', region: 'Americas', note: 'Provinces add PST/QST or use a 13-15% HST; see the Canada sales tax tool' },
  US: { name: 'United States', rate: 0, tax: 'Sales tax', region: 'Americas', note: 'No federal VAT; state and local sales tax varies (0-10%+)' },
  MX: { name: 'Mexico', rate: 16, tax: 'IVA', region: 'Americas' },
  CL: { name: 'Chile', rate: 19, tax: 'IVA', region: 'Americas' },
  CO: { name: 'Colombia', rate: 19, tax: 'IVA', region: 'Americas' },
  PE: { name: 'Peru', rate: 18, tax: 'IGV', region: 'Americas', note: '16% IGV plus 2% municipal promotion tax' },
  AR: { name: 'Argentina', rate: 21, tax: 'IVA', region: 'Americas' },
  // Asia-Pacific
  IN: { name: 'India', rate: 18, tax: 'GST', region: 'Asia-Pacific', note: 'Most goods and services; 5% merit rate and 40% demerit rate also apply' },
  AU: { name: 'Australia', rate: 10, tax: 'GST', region: 'Asia-Pacific' },
  NZ: { name: 'New Zealand', rate: 15, tax: 'GST', region: 'Asia-Pacific' },
  SG: { name: 'Singapore', rate: 9, tax: 'GST', region: 'Asia-Pacific' },
  JP: { name: 'Japan', rate: 10, tax: 'Consumption tax', region: 'Asia-Pacific', note: '8% reduced rate on food and newspapers' },
  KR: { name: 'South Korea', rate: 10, tax: 'VAT', region: 'Asia-Pacific' },
  CN: { name: 'China', rate: 13, tax: 'VAT', region: 'Asia-Pacific', note: '9% and 6% for many services' },
  TW: { name: 'Taiwan', rate: 5, tax: 'Business tax', region: 'Asia-Pacific' },
  HK: { name: 'Hong Kong', rate: 0, tax: 'None', region: 'Asia-Pacific', note: 'No VAT or GST' },
  PH: { name: 'Philippines', rate: 12, tax: 'VAT', region: 'Asia-Pacific' },
  TH: { name: 'Thailand', rate: 7, tax: 'VAT', region: 'Asia-Pacific' },
  VN: { name: 'Vietnam', rate: 10, tax: 'VAT', region: 'Asia-Pacific', note: 'A temporary 8% rate applies to many goods' },
  MY: { name: 'Malaysia', rate: 8, tax: 'SST (service tax)', region: 'Asia-Pacific', note: 'Sales tax on goods is 5% or 10%' },
  ID: { name: 'Indonesia', rate: 12, tax: 'PPN', region: 'Asia-Pacific', note: 'Non-luxury items are taxed at an effective 11%' },
  BD: { name: 'Bangladesh', rate: 15, tax: 'VAT', region: 'Asia-Pacific' },
  LK: { name: 'Sri Lanka', rate: 18, tax: 'VAT', region: 'Asia-Pacific' },
  NP: { name: 'Nepal', rate: 13, tax: 'VAT', region: 'Asia-Pacific' },
  // Middle East
  AE: { name: 'United Arab Emirates', rate: 5, tax: 'VAT', region: 'Middle East' },
  SA: { name: 'Saudi Arabia', rate: 15, tax: 'VAT', region: 'Middle East' },
  BH: { name: 'Bahrain', rate: 10, tax: 'VAT', region: 'Middle East' },
  OM: { name: 'Oman', rate: 5, tax: 'VAT', region: 'Middle East' },
  IL: { name: 'Israel', rate: 18, tax: 'VAT', region: 'Middle East' },
  // Africa
  ZA: { name: 'South Africa', rate: 15, tax: 'VAT', region: 'Africa' },
  NG: { name: 'Nigeria', rate: 7.5, tax: 'VAT', region: 'Africa' },
  KE: { name: 'Kenya', rate: 16, tax: 'VAT', region: 'Africa' },
  EG: { name: 'Egypt', rate: 14, tax: 'VAT', region: 'Africa' },
  MA: { name: 'Morocco', rate: 20, tax: 'TVA', region: 'Africa' },
};
