import { describe, it, expect } from "vitest";
import {
  compareIndiaRegimes,
  compoundGrowth,
  ctcToInHand,
  gstBreakdown,
  consumptionTax,
  indiaNewRegimeTax,
  indiaOldRegimeTax,
  loanSummary,
  monthlyInstallment,
  mortgagePiti,
  sipFutureValue,
  stampDutyLandTax,
  systematicWithdrawal,
  ukTakeHome,
  usPaycheck,
  yearsToFinancialIndependence,
  round2,
  INDIA_GST_RATES,
} from "../src/lib/finance";

/*
 * Every expected value below is worked by hand from the published rules, not
 * produced by running the code -- so these tests catch a wrong formula, not
 * just a changed one.
 */

describe("loans", () => {
  it("computes a diminishing-balance EMI", () => {
    // ₹10L at 8.5% for 10 years: the standard ₹12,399 benchmark.
    const loan = loanSummary(1_000_000, 8.5, 10);
    expect(loan.emi).toBe(12_399);
    expect(loan.totalPayment).toBe(1_487_880);
    expect(loan.totalInterest).toBe(487_880);
  });

  it("handles a zero interest rate without dividing by zero", () => {
    expect(monthlyInstallment(120_000, 0, 12)).toBe(10_000);
  });

  it("assesses US property tax on home value and drops PMI at 80% LTV", () => {
    const at20PctDown = mortgagePiti({
      homeValue: 400_000,
      downPayment: 80_000,
      annualRatePct: 6.8,
      years: 30,
      propertyTaxRatePct: 1.2,
      annualInsurance: 1_400,
      monthlyPmi: 120,
    });
    expect(at20PctDown.loanAmount).toBe(320_000);
    expect(at20PctDown.monthlyPropertyTax).toBe(400); // 1.2% of $400k, not of the $320k loan
    expect(at20PctDown.monthlyPmi).toBe(0);
    expect(at20PctDown.principalAndInterest).toBe(Math.round(monthlyInstallment(320_000, 6.8, 360)));

    const at10PctDown = mortgagePiti({ ...inputWithDown(40_000) });
    expect(at10PctDown.monthlyPmi).toBe(120);
  });
});

function inputWithDown(downPayment: number) {
  return {
    homeValue: 400_000,
    downPayment,
    annualRatePct: 6.8,
    years: 30,
    propertyTaxRatePct: 1.2,
    annualInsurance: 1_400,
    monthlyPmi: 120,
  };
}

describe("investments", () => {
  it("computes SIP maturity with start-of-month deposits", () => {
    // ₹10,000/month at 12% for 10 years.
    const sip = sipFutureValue(10_000, 12, 10);
    expect(sip.invested).toBe(1_200_000);
    expect(sip.maturity).toBe(2_323_391);
    expect(sip.gains).toBe(1_123_391);
  });

  it("raises both capital and maturity with an annual step-up", () => {
    const flat = sipFutureValue(10_000, 12, 10);
    const stepped = sipFutureValue(10_000, 12, 10, 10);
    expect(stepped.invested).toBeGreaterThan(flat.invested);
    expect(stepped.maturity).toBeGreaterThan(flat.maturity);
  });

  it("compounds more often for more growth", () => {
    // ₹1L at 10% for 5 years, monthly: 1,00,000 x (1 + 0.1/12)^60 = 1,64,531.
    expect(compoundGrowth(100_000, 0, 10, 5, 12).maturity).toBe(164_531);
    expect(compoundGrowth(100_000, 0, 10, 5, 1).maturity).toBe(161_051);
  });

  it("stops an SWP the month the corpus runs out", () => {
    const swp = systematicWithdrawal(100_000, 10_000, 0, 5);
    expect(swp.exhaustedInMonth).toBe(10);
    expect(swp.totalWithdrawn).toBe(100_000);
    expect(swp.remainingBalance).toBe(0);
  });

  it("reports FIRE as unreachable instead of capping silently", () => {
    expect(yearsToFinancialIndependence(800_000, 20_000_000, 0, 8).yearsToTarget).toBe(0);
    expect(yearsToFinancialIndependence(800_000, 0, 1_000, 0).yearsToTarget).toBeNull();
  });
});

describe("India income tax, tax year 2026-27", () => {
  it("applies the ₹12L rebate after the ₹75k standard deduction", () => {
    expect(indiaNewRegimeTax(1_275_000).totalTax).toBe(0);
  });

  it("gives marginal relief just above the rebate limit", () => {
    // Taxable ₹12.1L: slab tax ₹61,500 is capped at the ₹10,000 above ₹12L, plus cess.
    expect(indiaNewRegimeTax(1_285_000).totalTax).toBe(10_400);
  });

  it("taxes ₹15L gross on the Budget 2025 slabs", () => {
    // Taxable ₹14.25L: 20,000 + 40,000 + 33,750 = 93,750, x 1.04.
    expect(indiaNewRegimeTax(1_500_000).totalTax).toBe(97_500);
  });

  it("taxes ₹18L gross on the Budget 2025 slabs", () => {
    // Taxable ₹17.25L: 20,000 + 40,000 + 60,000 + 25,000 = 1,45,000, x 1.04.
    expect(indiaNewRegimeTax(1_800_000).totalTax).toBe(150_800);
  });

  it("applies surcharge marginal relief above ₹50L", () => {
    // Taxable ₹50.1L: tax 10,83,000; 10% surcharge capped so liability <= 10,80,000 + 10,000.
    expect(indiaNewRegimeTax(5_085_000).totalTax).toBe(1_133_600);
  });

  it("caps Section 80C at ₹1.5L in the old regime", () => {
    // Deductions 50,000 + 1,50,000 (capped from 2L) + 25,000; taxable 7,75,000.
    const result = indiaOldRegimeTax(1_000_000, { section80C: 200_000, section80D: 25_000, hraExemption: 0 });
    expect(result.taxableIncome).toBe(775_000);
    expect(result.totalTax).toBe(70_200);
  });

  it("applies the old-regime ₹5L rebate", () => {
    expect(
      indiaOldRegimeTax(700_000, { section80C: 150_000, section80D: 0, hraExemption: 0 }).totalTax
    ).toBe(0);
  });

  it("recommends the cheaper regime", () => {
    const cmp = compareIndiaRegimes(1_800_000, { section80C: 150_000, section80D: 25_000, hraExemption: 120_000 });
    expect(cmp.savings).toBe(Math.abs(cmp.newTax - cmp.oldTax));
    expect(cmp.recommended).toBe(cmp.newTax <= cmp.oldTax ? "NEW REGIME" : "OLD REGIME");
  });
});

describe("CTC to in-hand", () => {
  it("derives tax from the CTC itself", () => {
    // Fixed ₹14L: basic 5.6L, employer PF 67,200, gratuity 26,936 -> gross fixed 13,05,864.
    // Taxable salary incl. bonus 14,05,864 -> 13,30,864 after deduction -> tax 82,815.
    const result = ctcToInHand(1_500_000, 100_000);
    expect(result.incomeTaxAnnual).toBe(82_815);
    expect(result.monthlyInHand).toBe(96_112);
  });

  it("moves the tax when the CTC moves", () => {
    // Regression: tax used to come from an unrelated gross-income slider.
    expect(ctcToInHand(3_000_000, 100_000).incomeTaxAnnual).toBeGreaterThan(
      ctcToInHand(1_500_000, 100_000).incomeTaxAnnual
    );
  });
});

describe("GST", () => {
  it("uses the GST 2.0 slabs", () => {
    expect([...INDIA_GST_RATES]).toEqual([3, 5, 18, 40]);
  });

  it("extracts tax from an inclusive price", () => {
    const gst = gstBreakdown(11_800, 18, true);
    expect(gst.base).toBe(10_000);
    expect(gst.totalTax).toBe(1_800);
  });

  it("splits CGST and SGST so they always sum to the total", () => {
    for (const rate of INDIA_GST_RATES) {
      for (let amount = 1; amount <= 5_000; amount += 7) {
        for (const inclusive of [false, true]) {
          const gst = gstBreakdown(amount, rate, inclusive);
          expect(round2(gst.cgst + gst.sgst)).toBe(gst.totalTax);
        }
      }
    }
  });

  it("adds tax on top of an exclusive price", () => {
    const gst = gstBreakdown(12_345, 18, false);
    expect(gst.totalTax).toBe(2_222.1);
    expect(gst.total).toBe(14_567.1);
  });
});

describe("consumption taxes", () => {
  it("adds and extracts a flat rate", () => {
    expect(consumptionTax(100, 8.25, false)).toEqual({ base: 100, tax: 8.25, total: 108.25 });
    expect(consumptionTax(119, 19, true)).toEqual({ base: 100, tax: 19, total: 119 });
  });
});

describe("US paycheck, 2026 single filer", () => {
  it("charges no state tax in Texas", () => {
    // Taxable $83,900: 1,240 + 4,560 + 7,370 = 13,170. FICA 6,200 + 1,450.
    const pay = usPaycheck(100_000, 0);
    expect(pay.federalTax).toBe(13_170);
    expect(pay.stateTax).toBe(0);
    expect(pay.fica).toBe(7_650);
    expect(pay.netMonthly).toBe(6_598);
  });

  it("includes the 32% bracket, the wage base and additional Medicare", () => {
    // Taxable $203,900 reaches the 32% band: 41,024 + 680.
    // SS capped at $184,500; Medicare 1.45% + 0.9% over $200k.
    const pay = usPaycheck(220_000, 9.3);
    expect(pay.federalTax).toBe(41_704);
    expect(pay.fica).toBe(11_439 + 3_190 + 180);
    expect(pay.stateTax).toBe(18_963);
  });
});

describe("UK take-home, 2026/27", () => {
  it("taxes a basic-rate earner", () => {
    const pay = ukTakeHome(30_000);
    expect(pay.incomeTax).toBe(3_486);
    expect(pay.nationalInsurance).toBe(1_394);
  });

  it("tapers the personal allowance above £100k", () => {
    // Allowance falls to £7,570; taxable £102,430.
    const pay = ukTakeHome(110_000);
    expect(pay.personalAllowance).toBe(7_570);
    expect(pay.incomeTax).toBe(33_432);
  });

  it("reaches the additional rate once the allowance is gone", () => {
    // 7,540 + 34,976 + 2,187.
    const pay = ukTakeHome(130_000);
    expect(pay.personalAllowance).toBe(0);
    expect(pay.incomeTax).toBe(44_703);
    expect(pay.nationalInsurance).toBe(4_611);
  });
});

describe("UK Stamp Duty Land Tax", () => {
  it("charges standard residential bands", () => {
    expect(stampDutyLandTax(295_000, "standard").tax).toBe(4_750);
  });

  it("gives first-time buyer relief up to £500k", () => {
    expect(stampDutyLandTax(295_000, "first-time").tax).toBe(0);
    expect(stampDutyLandTax(450_000, "first-time").tax).toBe(7_500);
  });

  it("withdraws first-time buyer relief above £500k", () => {
    const result = stampDutyLandTax(600_000, "first-time");
    expect(result.reliefUnavailable).toBe(true);
    expect(result.tax).toBe(20_000);
  });

  it("adds the 5% additional dwelling surcharge", () => {
    expect(stampDutyLandTax(295_000, "additional").tax).toBe(19_500);
  });
});
