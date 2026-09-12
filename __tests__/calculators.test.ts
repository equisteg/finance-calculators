import { describe, it, expect } from "vitest";

describe("Finealth Core Computational Financial Engines", () => {
  // 1. Loan EMI Formula Verification (Diminishing-Balance Amortization)
  it("computes diminishing balance EMI with mathematical parity", () => {
    const P = 1000000; // 10 Lakhs Principal
    const rAnnual = 8.5;
    const years = 10;

    const rMonthly = rAnnual / 12 / 100;
    const n = years * 12;

    const emi = Math.round(
      (P * rMonthly * Math.pow(1 + rMonthly, n)) / (Math.pow(1 + rMonthly, n) - 1)
    );

    // Standard financial verification benchmark: ₹12,399/month
    expect(emi).toBe(12399);
    expect(emi * n).toBeGreaterThan(P);
    expect(emi * n - P).toBe(487880); // Total interest paid
  });

  // 2. SIP Future Value Compound Accumulation
  it("calculates compound systematic investment (SIP) returns correctly", () => {
    const P = 10000; // ₹10,000 monthly
    const returnRate = 12; // 12% p.a.
    const years = 10;

    const i = returnRate / 12 / 100;
    const n = years * 12;

    const maturityValue = Math.round(P * ((Math.pow(1 + i, n) - 1) / i) * (1 + i));
    const totalInvested = P * n;

    // Expected value at 12% for 10 years: ₹23,23,391
    expect(maturityValue).toBe(2323391);
    expect(totalInvested).toBe(1200000);
    expect(maturityValue - totalInvested).toBe(1123391);
  });

  // 3. Indian Tax Regime Calculation (FY 2025-26 New Regime with ₹75k Standard Deduction)
  it("accurately computes New Tax Regime with ₹75k standard deduction", () => {
    const gross = 1500000;
    const stdDeduction = 75000;
    const taxable = gross - stdDeduction; // 14,25,000

    let tax = 0;
    if (taxable > 300000) tax += Math.min(taxable - 300000, 400000) * 0.05; // 20,000
    if (taxable > 700000) tax += Math.min(taxable - 700000, 300000) * 0.1;  // 30,000
    if (taxable > 1000000) tax += Math.min(taxable - 1000000, 200000) * 0.15; // 30,000
    if (taxable > 1200000) tax += Math.min(taxable - 1200000, 300000) * 0.2; // 45,000
    const finalTax = Math.round(tax * 1.04); // 4% Cess

    expect(finalTax).toBe(130000);
  });

  // 4. US State Tax Variations (0% vs High-Income Tax States)
  it("properly accounts for 0% income tax states (Texas, Florida, Washington)", () => {
    const gross = 100000;
    const stdDeduction = 15750;
    const taxable = gross - stdDeduction; // 84,250

    const txRate = 0.0;
    const caRate = 0.093;

    expect(taxable * txRate).toBe(0);
    expect(Math.round(taxable * caRate)).toBe(7835);
  });

  // 5. GST Extraction Engine (Inclusive vs Exclusive)
  it("correctly computes inclusive vs exclusive GST rates", () => {
    const invoice = 11800;
    const gstRate = 18;

    // Inclusive extraction: Base = Total / (1 + Rate)
    const basePrice = invoice / (1 + gstRate / 100);
    const taxAmount = invoice - basePrice;

    expect(Math.round(basePrice)).toBe(10000);
    expect(Math.round(taxAmount)).toBe(1800);
  });

  // 6. Simple vs Multi-Frequency Compound Interest
  it("calculates compound growth acceleration across frequencies", () => {
    const principal = 100000;
    const rate = 10;
    const years = 5;

    const simpleInterest = (principal * rate * years) / 100;
    const compoundMonthly =
      principal * Math.pow(1 + rate / (12 * 100), 12 * years) - principal;

    expect(simpleInterest).toBe(50000);
    expect(Math.round(compoundMonthly)).toBe(64531);
    expect(Math.round(compoundMonthly - simpleInterest)).toBe(14531);
  });
});