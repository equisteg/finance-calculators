import { describe, expect, it } from 'vitest';
import { australiaTax, auLowIncomeOffset, canadaTax, caBasicPersonalAmount, newZealandTax, singaporeTax, WORLD_VAT_RATES, CA_SALES_TAX } from './world';
import {
  EU_STANDARD_VAT_RATES,
  indiaGratuity,
  indiaHraExemption,
  indiaOldRegimeTax,
  india80D,
  stampDutyLandTax,
  usPaycheck,
} from './finance';

// Golden values computed independently from the official rate tables named in world.ts.
describe('Australia 2026-27', () => {
  it('low income tax offset steps', () => {
    expect(auLowIncomeOffset(30_000)).toBe(700);
    expect(auLowIncomeOffset(45_000)).toBe(325);
    expect(auLowIncomeOffset(66_667)).toBeCloseTo(0, 0);
  });
  it('tax, offset and Medicare levy', () => {
    expect(australiaTax(30_000)).toMatchObject({ incomeTax: 1_070, lowIncomeOffset: 700, medicareLevy: 278, totalTax: 1_348 });
    expect(australiaTax(90_000)).toMatchObject({ incomeTax: 17_520, medicareLevy: 1_800, totalTax: 19_320 });
    expect(australiaTax(250_000)).toMatchObject({ incomeTax: 78_370, medicareLevy: 5_000 });
    expect(australiaTax(18_000).totalTax).toBe(0);
  });
});

describe('Canada 2026 federal', () => {
  it('basic personal amount phases down between the 26% and 33% brackets', () => {
    expect(caBasicPersonalAmount(100_000)).toBe(16_452);
    expect(caBasicPersonalAmount(300_000)).toBe(14_829);
  });
  it('federal tax, CPP and EI', () => {
    expect(canadaTax(60_000)).toMatchObject({ federalTax: 5_338, cpp: 3_362, ei: 978, netAnnual: 50_322 });
    expect(canadaTax(100_000)).toMatchObject({ federalTax: 13_302, cpp: 4_646, ei: 1_123 });
  });
  it('provincial estimate adds on top', () => {
    expect(canadaTax(60_000, 5).provincialTax).toBeGreaterThan(2_900);
  });
  it('HST provinces have no separate GST', () => {
    expect(CA_SALES_TAX.ON).toMatchObject({ gst: 0, provincial: 13, hst: true });
    expect(CA_SALES_TAX.QC.provincial).toBe(9.975);
  });
});

describe('Singapore resident', () => {
  it('CPF relief, earned income relief and progressive tax', () => {
    expect(singaporeTax(60_000)).toMatchObject({ cpfEmployee: 12_000, chargeableIncome: 47_000, incomeTax: 1_040 });
    expect(singaporeTax(120_000)).toMatchObject({ cpfEmployee: 19_200, chargeableIncome: 99_800, incomeTax: 5_627 });
    expect(singaporeTax(60_000, 0, false).cpfEmployee).toBe(0);
  });
});

describe('New Zealand', () => {
  it('income tax on $80,000', () => {
    expect(newZealandTax(80_000, 1.75).incomeTax).toBe(16_278);
    expect(newZealandTax(80_000, 1.75).acc).toBe(1_400);
  });
});

describe('VAT tables', () => {
  it('EU table has all 27 member states', () => {
    expect(Object.keys(EU_STANDARD_VAT_RATES)).toHaveLength(27);
    const euInWorld = Object.entries(WORLD_VAT_RATES).filter(([, v]) => v.region === 'EU');
    expect(euInWorld).toHaveLength(27);
    for (const [code, v] of euInWorld) expect(EU_STANDARD_VAT_RATES[code]?.rate).toBe(v.rate);
  });
  it('world table excludes Pakistan and has sane rates', () => {
    expect(WORLD_VAT_RATES.PK).toBeUndefined();
    for (const v of Object.values(WORLD_VAT_RATES)) {
      expect(v.rate).toBeGreaterThanOrEqual(0);
      expect(v.rate).toBeLessThanOrEqual(27);
    }
  });
});

describe('fixes from the November 2026 audit', () => {
  it('80D caps self/family and parents separately (was one ₹1L cap)', () => {
    expect(india80D({ section80C: 0, section80D: 40_000, hraExemption: 0 })).toBe(25_000);
    expect(india80D({ section80C: 0, section80D: 40_000, section80DParents: 60_000, parentsSenior: true, hraExemption: 0 })).toBe(75_000);
    expect(india80D({ section80C: 0, section80D: 60_000, selfSenior: true, section80DParents: 60_000, parentsSenior: true, hraExemption: 0 })).toBe(100_000);
    expect(
      indiaOldRegimeTax(1_500_000, { section80C: 150_000, section80D: 40_000, section80DParents: 60_000, parentsSenior: true, hraExemption: 0 })
    ).toEqual({ taxableIncome: 1_225_000, totalTax: 187_200 });
  });
  it('old regime senior citizen exemption', () => {
    const d = { section80C: 0, section80D: 0, hraExemption: 0 };
    expect(indiaOldRegimeTax(700_000, d, '60to79').totalTax).toBe(41_600);
    expect(indiaOldRegimeTax(700_000, d).totalTax).toBe(44_200);
  });
  it('US married filing jointly', () => {
    const r = usPaycheck(150_000, 0, 'joint');
    expect(r.federalTax).toBe(15_340);
    expect(r.fica).toBe(11_475);
  });
  it('SDLT non-resident 2% surcharge', () => {
    expect(stampDutyLandTax(300_000, 'standard', true).tax).toBe(stampDutyLandTax(300_000, 'standard').tax + 6_000);
  });
  it('HRA exemption is the least of the three limits', () => {
    expect(indiaHraExemption(600_000, 240_000, 300_000, true).exempt).toBe(240_000);
    expect(indiaHraExemption(600_000, 240_000, 200_000, false).exempt).toBe(140_000);
  });
  it('gratuity: 15/26 rule, part-year over 6 months counts, ₹20L cap', () => {
    expect(indiaGratuity(50_000, 10, 7)).toEqual({ yearsCounted: 11, gratuity: 317_308, capped: false });
    expect(indiaGratuity(50_000, 10, 6).yearsCounted).toBe(10);
    expect(indiaGratuity(1_000_000, 40).gratuity).toBe(2_000_000);
  });
});
