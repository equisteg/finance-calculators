"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  useCurrency,
  INDIAN_CITIES,
  ALL_50_US_STATES,
  type PriorityAsset,
} from "./context/CurrencyContext";
import AdSenseBanner from "../components/AdSenseBanner";
import { ADSENSE_CLIENT, AD_SLOTS } from "@/lib/ads";
import { formatMoney, formatNumber } from "@/lib/format";
import {
  compareIndiaRegimes,
  consumptionTax,
  ctcToInHand,
  gstBreakdown,
  loanSummary,
  lumpSumFutureValue,
  mortgagePiti,
  sipFutureValue,
  stampDutyLandTax,
  ukTakeHome,
  usPaycheck,
  EU_STANDARD_VAT_RATES,
  INDIA_GST_RATES,
  type SdltBuyer,
} from "@/lib/finance";

type Currency = "INR" | "USD" | "EUR" | "GBP";

interface Tool {
  id: string;
  label: string;
}

const TOOLS: Record<Currency, Tool[]> = {
  INR: [
    { id: "emi_in", label: "Loan EMI & Amortization" },
    { id: "sip_in", label: "Mutual Fund SIP & Step-Up" },
    { id: "tax_in", label: "Income Tax (New vs Old)" },
    { id: "gst_in", label: "GST (CGST + SGST Split)" },
    { id: "fdrd_in", label: "Bank FD & Post Office RD" },
    { id: "ctc_in", label: "CTC to In-Hand Salary" },
  ],
  USD: [
    { id: "mortgage_us", label: "30-Yr Mortgage & PITI" },
    { id: "retirement_us", label: "401(k) & Roth IRA" },
    { id: "paycheck_us", label: "Federal + State Paycheck" },
    { id: "salestax_us", label: "State & Local Sales Tax" },
  ],
  GBP: [
    { id: "mortgage_uk", label: "Repayment Mortgage" },
    { id: "isa_uk", label: "Cash & Stocks ISA" },
    { id: "paye_uk", label: "PAYE Tax & NI" },
    { id: "sdlt_uk", label: "Stamp Duty (SDLT)" },
  ],
  EUR: [
    { id: "euribor_loan", label: "Euribor Variable Mortgage" },
    { id: "savings_eu", label: "Compound Growth Modeler" },
    { id: "vat_eu", label: "EU VAT by Country" },
  ],
};

/**
 * Starting values and slider ranges per jurisdiction. Values are re-applied
 * whenever the jurisdiction changes so figures always sit inside the new
 * currency's ranges instead of carrying over (₹35,00,000 must not become $3,500,000).
 */
const REGION_DEFAULTS: Record<
  Currency,
  { loanPrincipal: number; loanRate: number; sipMonthly: number; grossIncome: number; invoiceAmount: number }
> = {
  INR: { loanPrincipal: 3_500_000, loanRate: 8.5, sipMonthly: 15_000, grossIncome: 1_800_000, invoiceAmount: 50_000 },
  USD: { loanPrincipal: 350_000, loanRate: 6.8, sipMonthly: 750, grossIncome: 110_000, invoiceAmount: 5_000 },
  EUR: { loanPrincipal: 300_000, loanRate: 4.2, sipMonthly: 600, grossIncome: 60_000, invoiceAmount: 5_000 },
  GBP: { loanPrincipal: 275_000, loanRate: 4.8, sipMonthly: 500, grossIncome: 55_000, invoiceAmount: 5_000 },
};

const RANGES = {
  loanPrincipal: { INR: [100_000, 25_000_000, 50_000], other: [25_000, 2_000_000, 5_000] },
  sipMonthly: { INR: [500, 300_000, 500], other: [50, 5_000, 50] },
  grossIncome: { INR: [300_000, 10_000_000, 50_000], other: [15_000, 500_000, 5_000] },
  invoiceAmount: { INR: [1_000, 1_000_000, 1_000], other: [100, 100_000, 100] },
} as const;

function rangeFor(field: keyof typeof RANGES, currency: Currency) {
  const [min, max, step] = currency === "INR" ? RANGES[field].INR : RANGES[field].other;
  return { min, max, step };
}

const LOAN_TOOLS = ["emi_in", "mortgage_us", "mortgage_uk", "euribor_loan"];
const GROWTH_TOOLS = ["sip_in", "retirement_us", "isa_uk", "savings_eu"];
const INCOME_TAX_TOOLS = ["tax_in", "paycheck_us", "paye_uk"];

const SDLT_BUYERS: { id: SdltBuyer; label: string }[] = [
  { id: "standard", label: "Home mover" },
  { id: "first-time", label: "First-time buyer" },
  { id: "additional", label: "Additional property" },
];

export default function Home() {
  const {
    baseCurrency,
    setBaseCurrency,
    selectedUsState,
    setSelectedUsState,
    selectedIndianCity,
    setSelectedIndianCity,
    activeProfile,
    lastUpdated,
    isSyncing,
    manualRefresh,
  } = useCurrency();

  const currency: Currency = baseCurrency in TOOLS ? (baseCurrency as Currency) : "INR";
  const money = (value: number, fractionDigits = 0) => formatMoney(value, currency, fractionDigits);
  const regionalTools = TOOLS[currency];

  const [activeToolId, setActiveToolId] = useState<string>(regionalTools[0].id);

  // ==========================================
  // 1. LOAN / MORTGAGE
  // ==========================================
  const [loanPrincipal, setLoanPrincipal] = useState<number>(REGION_DEFAULTS[currency].loanPrincipal);
  const [loanRate, setLoanRate] = useState<number>(REGION_DEFAULTS[currency].loanRate);
  const [loanTenureYears, setLoanTenureYears] = useState<number>(20);
  const [usDownPayment, setUsDownPayment] = useState<number>(87_500);
  const [usPropertyTaxRate, setUsPropertyTaxRate] = useState<number>(1.2);
  const [usHomeInsuranceAnnual, setUsHomeInsuranceAnnual] = useState<number>(1_400);
  const [usPmiMonthly, setUsPmiMonthly] = useState<number>(120);

  // ==========================================
  // 2. SIP & RETIREMENT
  // ==========================================
  const [sipMonthlyDeposit, setSipMonthlyDeposit] = useState<number>(REGION_DEFAULTS[currency].sipMonthly);
  const [sipExpectedReturn, setSipExpectedReturn] = useState<number>(12.5);
  const [sipHorizonYears, setSipHorizonYears] = useState<number>(15);
  const [sipStepUpPct, setSipStepUpPct] = useState<number>(10);

  // ==========================================
  // 3. INCOME TAX
  // ==========================================
  const [grossAnnualIncome, setGrossAnnualIncome] = useState<number>(REGION_DEFAULTS[currency].grossIncome);
  const [inSec80C, setInSec80C] = useState<number>(150_000);
  const [inSec80D, setInSec80D] = useState<number>(25_000);
  const [inHraExempt, setInHraExempt] = useState<number>(120_000);

  // ==========================================
  // 4. INDIRECT TAXES
  // ==========================================
  const [invoiceAmount, setInvoiceAmount] = useState<number>(REGION_DEFAULTS[currency].invoiceAmount);
  const [selectedGstTier, setSelectedGstTier] = useState<number>(18);
  const [isTaxInclusive, setIsTaxInclusive] = useState<boolean>(false);
  const [vatCountry, setVatCountry] = useState<string>("DE");
  const [sdltPrice, setSdltPrice] = useState<number>(350_000);
  const [sdltBuyer, setSdltBuyer] = useState<SdltBuyer>("standard");

  // ==========================================
  // 5. FD
  // ==========================================
  const [fdPrincipal, setFdPrincipal] = useState<number>(500_000);
  const [fdInterestRate, setFdInterestRate] = useState<number>(7.2);
  const [fdYears, setFdYears] = useState<number>(5);

  // ==========================================
  // 6. CTC
  // ==========================================
  const [ctcAmount, setCtcAmount] = useState<number>(1_500_000);
  const [annualBonus, setAnnualBonus] = useState<number>(100_000);

  // Rebase every currency-dependent value when the jurisdiction changes. Done
  // during render (not in an effect) so no frame ever shows stale figures.
  const [valuesCurrency, setValuesCurrency] = useState<Currency>(currency);
  if (valuesCurrency !== currency) {
    const defaults = REGION_DEFAULTS[currency];
    setValuesCurrency(currency);
    setActiveToolId(TOOLS[currency][0].id);
    setLoanPrincipal(defaults.loanPrincipal);
    setLoanRate(defaults.loanRate);
    setSipMonthlyDeposit(defaults.sipMonthly);
    setGrossAnnualIncome(defaults.grossIncome);
    setInvoiceAmount(defaults.invoiceAmount);
    setIsTaxInclusive(false);
  }

  // ==========================================
  // CALCULATIONS
  // ==========================================
  const loan = loanSummary(loanPrincipal, loanRate, loanTenureYears);
  const piti = mortgagePiti({
    homeValue: loanPrincipal + usDownPayment,
    downPayment: usDownPayment,
    annualRatePct: loanRate,
    years: loanTenureYears,
    propertyTaxRatePct: usPropertyTaxRate,
    annualInsurance: usHomeInsuranceAnnual,
    monthlyPmi: usPmiMonthly,
  });

  const stepUpResults = useMemo(
    () => sipFutureValue(sipMonthlyDeposit, sipExpectedReturn, sipHorizonYears, sipStepUpPct),
    [sipMonthlyDeposit, sipExpectedReturn, sipHorizonYears, sipStepUpPct]
  );

  const indianTax = useMemo(
    () =>
      compareIndiaRegimes(grossAnnualIncome, {
        section80C: inSec80C,
        section80D: inSec80D,
        hraExemption: inHraExempt,
      }),
    [grossAnnualIncome, inSec80C, inSec80D, inHraExempt]
  );
  const usState = ALL_50_US_STATES[selectedUsState];
  const usPay = usPaycheck(grossAnnualIncome, usState?.incomeTaxRate ?? 0);
  const ukPay = ukTakeHome(grossAnnualIncome);

  const gst = gstBreakdown(invoiceAmount, selectedGstTier, isTaxInclusive);
  const vatRate = EU_STANDARD_VAT_RATES[vatCountry]?.rate ?? 0;
  const vat = consumptionTax(invoiceAmount, vatRate, isTaxInclusive);
  const salesTaxRate = usState?.salesTaxRate ?? 0;
  const salesTax = consumptionTax(invoiceAmount, salesTaxRate, false);
  const sdlt = stampDutyLandTax(sdltPrice, sdltBuyer);

  const fd = lumpSumFutureValue(fdPrincipal, fdInterestRate, fdYears, 4);
  const ctc = ctcToInHand(ctcAmount, annualBonus);

  // Bullion city spread adjustment for India
  const citySpread =
    currency === "INR" ? INDIAN_CITIES[selectedIndianCity] || INDIAN_CITIES["Mumbai"] : null;

  const priceFor = (asset: PriorityAsset): number => {
    if (!citySpread) return asset.basePrice;
    if (asset.id === "in_gold") return asset.basePrice + citySpread.goldPremiumPer10g;
    if (asset.id === "in_gold_22k") return asset.basePrice + Math.round((citySpread.goldPremiumPer10g * 22) / 24);
    if (asset.id === "in_silver") return asset.basePrice + citySpread.silverPremiumPerKg;
    return asset.basePrice;
  };

  const formatAssetValue = (asset: PriorityAsset, value: number): string => {
    if (asset.unit.includes("%")) return `${formatNumber(value, currency, 2)}%`;
    if (asset.symbol !== "") return money(Math.round(value));
    return `${formatNumber(value, currency, 2)} pts`;
  };

  const assetGridColumns =
    activeProfile.priorityAssets.length > 4
      ? "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
      : "sm:grid-cols-2 lg:grid-cols-4";

  return (
    <div className="min-h-screen bg-[#050508] text-zinc-100 selection:bg-emerald-500/30">
      {/* Universal Header */}
      <header className="border-b border-white/[0.08] bg-[#08080c]/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-4 ring-emerald-400/20" />
            <span className="text-xl font-black tracking-tight text-white font-mono">
              FINEALTH
            </span>
            <span className="text-[10px] font-mono uppercase bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded tracking-widest hidden sm:inline-block">
              STATUTORY ENGINE
            </span>
          </div>

          <div className="flex items-center gap-3">
            <select
              aria-label="Jurisdiction"
              value={baseCurrency}
              onChange={(e) => setBaseCurrency(e.target.value)}
              className="bg-[#121216] text-white border border-white/[0.15] text-xs font-mono rounded-lg px-3 py-1.5 outline-none hover:border-emerald-500/50 transition cursor-pointer"
            >
              <option value="INR">🇮🇳 India (INR ₹)</option>
              <option value="USD">🇺🇸 United States (USD $)</option>
              <option value="EUR">🇪🇺 European Union (EUR €)</option>
              <option value="GBP">🇬🇧 United Kingdom (GBP £)</option>
            </select>

            <button
              onClick={manualRefresh}
              disabled={isSyncing}
              title="Refresh exchange rates"
              className="inline-flex items-center gap-1.5 text-xs font-mono bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] px-3 py-1.5 rounded-lg transition text-zinc-300 hover:text-white"
            >
              <span className={isSyncing ? "animate-spin" : ""}>⟳</span>
              <span className="hidden md:inline">{lastUpdated}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <AdSenseBanner client={ADSENSE_CLIENT} slot={AD_SLOTS.top} />

        {/* Region & Benchmark Header */}
        <div className="mb-8 pt-2">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              JURISDICTION: {activeProfile.flag} {activeProfile.name.toUpperCase()} ({activeProfile.currencyCode}) • EXCHANGE: {activeProfile.primaryExchange}
            </div>

            {currency === "INR" && (
              <div className="inline-flex items-center gap-2 bg-[#141418] border border-white/[0.1] px-3 py-1 rounded-full text-xs font-mono text-white">
                <span className="text-zinc-400">CITY SPREAD:</span>
                <select
                  aria-label="City"
                  value={selectedIndianCity}
                  onChange={(e) => setSelectedIndianCity(e.target.value)}
                  className="bg-transparent text-emerald-400 font-bold outline-none cursor-pointer"
                >
                  {Object.keys(INDIAN_CITIES).map((city) => (
                    <option key={city} value={city} className="bg-[#141418] text-white">
                      {city}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {currency === "USD" && (
              <div className="inline-flex items-center gap-2 bg-[#141418] border border-white/[0.1] px-3 py-1 rounded-full text-xs font-mono text-white">
                <span className="text-zinc-400">STATE TAX MATRIX:</span>
                <select
                  aria-label="US state"
                  value={selectedUsState}
                  onChange={(e) => setSelectedUsState(e.target.value)}
                  className="bg-transparent text-emerald-400 font-bold outline-none cursor-pointer"
                >
                  {Object.entries(ALL_50_US_STATES).map(([code, config]) => (
                    <option key={code} value={code} className="bg-[#141418] text-white">
                      {config.name} ({config.incomeTaxRate}%)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight font-serif">
            Financial & Bullion Markets in {currency === "INR" ? selectedIndianCity : activeProfile.name}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1.5 font-light">
            Priority coverage: <span className="text-emerald-400 font-medium">{activeProfile.headlinePriority}</span>. Reference benchmarks for planning; confirm live quotes before trading.
          </p>
        </div>

        {/* Priority Asset Grid */}
        <section className={`grid grid-cols-1 ${assetGridColumns} gap-4 mb-10`}>
          {activeProfile.priorityAssets.map((asset) => (
            <div
              key={asset.id}
              className="bg-[#0c0c10] border border-white/[0.08] hover:border-emerald-500/30 transition-all rounded-2xl p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-2 gap-2">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400/90 block">
                      {asset.category}
                    </span>
                    <h3 className="text-lg font-bold text-white mt-0.5">{asset.name}</h3>
                    <p className="text-xs text-zinc-400 font-mono">{asset.unit}</p>
                  </div>
                  <span
                    className={`text-xs font-mono font-bold whitespace-nowrap ${
                      asset.changePct >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {asset.changePct >= 0 ? "▲" : "▼"} {Math.abs(asset.changePct)}%
                  </span>
                </div>

                <div className="my-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                  <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block mb-0.5">
                    REFERENCE BENCHMARK
                  </span>
                  <div className="text-2xl font-extrabold text-white font-mono">
                    {formatAssetValue(asset, priceFor(asset))}
                  </div>
                </div>
              </div>

              <div className="text-[11px] font-mono text-zinc-500 pt-2 border-t border-white/[0.06]">
                {asset.taxNote}
              </div>
            </div>
          ))}
        </section>

        {/* Graphical Trajectory Curves */}
        <section className="mb-12 bg-[#0c0c10] border border-white/[0.08] rounded-2xl p-5 sm:p-7">
          <div className="mb-5">
            <h2 className="text-lg sm:text-xl font-bold text-white">
              Multi-Decade Inception Historical Trajectory
            </h2>
            <p className="text-xs text-zinc-400 mt-1 font-mono">
              Historical pricing milestones from {activeProfile.name} records.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeProfile.priorityAssets
              .filter((asset) => !asset.derivedFrom)
              .slice(0, 2)
              .map((asset) => {
                const maxVal = Math.max(...asset.history.map((h) => h.numericValue));
                return (
                  <div
                    key={`curve-${asset.id}`}
                    className="bg-white/[0.01] border border-white/[0.05] rounded-xl p-5"
                  >
                    <div className="flex justify-between items-center mb-4 gap-3">
                      <h3 className="text-sm font-bold text-white">
                        {asset.name} ({asset.unit})
                      </h3>
                      <span className="text-[11px] font-mono text-emerald-400 text-right">
                        Source: {asset.sourceAuthority}
                      </span>
                    </div>

                    <div className="h-40 w-full flex items-end justify-between gap-2 pt-6 pb-2 px-1 border-b border-white/[0.08]">
                      {asset.history.map((pt) => {
                        const heightPct = Math.max(12, Math.round((pt.numericValue / maxVal) * 100));
                        return (
                          <div
                            key={pt.year}
                            className="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end"
                          >
                            <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition pointer-events-none bg-zinc-900 border border-white/20 text-[10px] font-mono text-emerald-400 px-1.5 py-0.5 rounded whitespace-nowrap z-20">
                              {pt.priceFormatted}
                            </div>
                            <div
                              style={{ height: `${heightPct}%` }}
                              className="w-full bg-emerald-500/20 group-hover:bg-emerald-500/50 border-t-2 border-emerald-400 rounded-t transition-all"
                            />
                            <span className="text-[10px] font-mono text-zinc-400 mt-2">{pt.year}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
        </section>

        <AdSenseBanner client={ADSENSE_CLIENT} slot={AD_SLOTS.mid} className="my-4" />

        {/* WORKSPACE TOOLS SECTION */}
        <section className="bg-[#0c0c10] border border-white/[0.08] rounded-2xl p-5 sm:p-7">
          <div className="mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              {activeProfile.name} Specific Tools & Financial Engines
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1 font-mono">
              Calibrated statutory tools for {activeProfile.name} currency and laws.
            </p>
          </div>

          {/* Region Tool Tab Selector */}
          <div className="flex flex-wrap gap-2 mb-8 border-b border-white/[0.06] pb-4">
            {regionalTools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => setActiveToolId(tool.id)}
                className={`px-4 py-2 rounded-xl text-xs font-mono transition ${
                  activeToolId === tool.id
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold"
                    : "bg-white/[0.02] text-zinc-400 hover:text-white border border-white/[0.05]"
                }`}
              >
                {tool.label}
              </button>
            ))}
          </div>

          {/* 1. LOAN & MORTGAGE ENGINE */}
          {LOAN_TOOLS.includes(activeToolId) && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-7 space-y-6">
                <SliderField
                  label="Borrowing Principal"
                  display={money(loanPrincipal)}
                  value={loanPrincipal}
                  onChange={setLoanPrincipal}
                  {...rangeFor("loanPrincipal", currency)}
                />
                <SliderField
                  label="Annual Interest Rate (%)"
                  display={`${loanRate}%`}
                  accent
                  value={loanRate}
                  onChange={setLoanRate}
                  min={1}
                  max={20}
                  step={0.1}
                />
                <SliderField
                  label="Repayment Tenure"
                  display={`${loanTenureYears} Years`}
                  value={loanTenureYears}
                  onChange={setLoanTenureYears}
                  min={1}
                  max={30}
                  step={1}
                />

                {activeToolId === "mortgage_us" && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-white/[0.06]">
                    <NumberField label="Down Payment ($)" value={usDownPayment} onChange={setUsDownPayment} step={1000} />
                    <NumberField label="Property Tax (%)" value={usPropertyTaxRate} onChange={setUsPropertyTaxRate} step={0.1} />
                    <NumberField label="Annual Hazard Ins ($)" value={usHomeInsuranceAnnual} onChange={setUsHomeInsuranceAnnual} />
                    <NumberField label="Monthly PMI ($)" value={usPmiMonthly} onChange={setUsPmiMonthly} />
                  </div>
                )}
              </div>

              <div className="lg:col-span-5 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 block mb-1">
                    {activeToolId === "mortgage_us" ? "TOTAL MONTHLY PITI" : "MONTHLY INSTALLMENT"}
                  </span>
                  <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono mb-4">
                    {money(activeToolId === "mortgage_us" ? piti.totalMonthly : loan.emi)}
                  </div>

                  <div className="space-y-3 border-t border-white/[0.06] pt-4 text-xs font-mono">
                    <ResultRow label="Principal Amount:" value={money(loanPrincipal)} />
                    <ResultRow label="Total Interest Payable:" value={`+${money(loan.totalInterest)}`} tone="negative" />
                    {activeToolId === "mortgage_us" && (
                      <>
                        <ResultRow label="Home Value:" value={money(loanPrincipal + usDownPayment)} />
                        <ResultRow
                          label={`Loan-to-Value:`}
                          value={`${Math.round(piti.loanToValuePct)}%${piti.monthlyPmi === 0 ? " (no PMI)" : ""}`}
                        />
                        <ResultRow
                          label="Taxes + Ins + PMI:"
                          value={`+${money(piti.monthlyPropertyTax + piti.monthlyInsurance + piti.monthlyPmi)}/mo`}
                          tone="warning"
                        />
                      </>
                    )}
                    <div className="flex justify-between text-zinc-400 border-t border-white/[0.06] pt-2 font-bold">
                      <span>{activeToolId === "mortgage_us" ? "Total Outlay (incl. escrow):" : "Total Outlay:"}</span>
                      <span className="text-emerald-400">
                        {money(
                          activeToolId === "mortgage_us"
                            ? piti.totalMonthly * loanTenureYears * 12
                            : loan.totalPayment
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. SIP & RETIREMENT ENGINE */}
          {GROWTH_TOOLS.includes(activeToolId) && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-7 space-y-6">
                <SliderField
                  label="Monthly Investment"
                  display={money(sipMonthlyDeposit)}
                  value={sipMonthlyDeposit}
                  onChange={setSipMonthlyDeposit}
                  {...rangeFor("sipMonthly", currency)}
                />
                <SliderField
                  label="Expected Return Rate (% CAGR)"
                  display={`${sipExpectedReturn}%`}
                  accent
                  value={sipExpectedReturn}
                  onChange={setSipExpectedReturn}
                  min={3}
                  max={30}
                  step={0.5}
                />
                <SliderField
                  label="Investment Horizon"
                  display={`${sipHorizonYears} Years`}
                  value={sipHorizonYears}
                  onChange={setSipHorizonYears}
                  min={1}
                  max={40}
                  step={1}
                />
                <SliderField
                  label="Annual Step-Up (% per Year)"
                  display={`${sipStepUpPct}%`}
                  accent
                  value={sipStepUpPct}
                  onChange={setSipStepUpPct}
                  min={0}
                  max={25}
                  step={1}
                />
              </div>

              <div className="lg:col-span-5 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 block mb-1">
                    PROJECTED WEALTH CORPUS
                  </span>
                  <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono mb-4">
                    {money(stepUpResults.maturity)}
                  </div>

                  <div className="space-y-3 border-t border-white/[0.06] pt-4 text-xs font-mono">
                    <ResultRow label="Total Invested Capital:" value={money(stepUpResults.invested)} />
                    <ResultRow label="Compound Wealth Generated:" value={`+${money(stepUpResults.gains)}`} tone="positive" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. INCOME TAX ENGINES */}
          {INCOME_TAX_TOOLS.includes(activeToolId) && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-7 space-y-6">
                <SliderField
                  label="Annual Gross Income"
                  display={money(grossAnnualIncome)}
                  value={grossAnnualIncome}
                  onChange={setGrossAnnualIncome}
                  {...rangeFor("grossIncome", currency)}
                />

                {activeToolId === "tax_in" && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl text-xs font-mono">
                    <NumberField label="Section 80C (max ₹1.5L)" value={inSec80C} onChange={setInSec80C} />
                    <NumberField label="Section 80D" value={inSec80D} onChange={setInSec80D} />
                    <NumberField label="HRA Exempt" value={inHraExempt} onChange={setInHraExempt} />
                  </div>
                )}

                <p className="text-[11px] font-mono text-zinc-500">
                  {activeToolId === "tax_in" &&
                    "Tax year 2026-27, salaried individual under 60. Includes 87A rebate, surcharge and 4% cess."}
                  {activeToolId === "paycheck_us" &&
                    "2026 tax year, single filer, standard deduction. State tax is an estimate at the state's headline rate."}
                  {activeToolId === "paye_uk" &&
                    "2026/27, England, Wales & Northern Ireland. Includes the personal allowance taper above £100,000."}
                </p>
              </div>

              <div className="lg:col-span-5 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 flex flex-col justify-between">
                {activeToolId === "tax_in" && (
                  <div>
                    <div className="inline-block bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold mb-2">
                      RECOMMENDATION: {indianTax.recommended}
                    </div>
                    <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono mb-4">
                      {money(Math.min(indianTax.newTax, indianTax.oldTax))}
                    </div>
                    <div className="space-y-2 border-t border-white/[0.06] pt-3 text-xs font-mono">
                      <ResultRow label="New Regime Tax (Sec 115BAC):" value={money(indianTax.newTax)} />
                      <ResultRow label="Old Regime Tax (with 80C/80D):" value={money(indianTax.oldTax)} />
                      <div className="flex justify-between text-emerald-400 border-t border-white/[0.06] pt-2 font-bold">
                        <span>Tax Saved:</span>
                        <span>{money(indianTax.savings)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeToolId === "paycheck_us" && (
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 block mb-1">
                      NET MONTHLY PAYCHECK
                    </span>
                    <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono mb-4">
                      {money(usPay.netMonthly)}
                    </div>
                    <div className="space-y-2 border-t border-white/[0.06] pt-3 text-xs font-mono">
                      <ResultRow label="Federal Income Tax:" value={`-${money(usPay.federalTax)}`} tone="negative" />
                      <ResultRow label={`${usState?.name ?? ""} State Tax (est.):`} value={`-${money(usPay.stateTax)}`} tone="negative" />
                      <ResultRow label="FICA (SS + Medicare):" value={`-${money(usPay.fica)}`} tone="negative" />
                      <div className="flex justify-between text-emerald-400 border-t border-white/[0.06] pt-2 font-bold">
                        <span>Effective Tax Rate:</span>
                        <span>{usPay.effectiveTaxRatePct}%</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeToolId === "paye_uk" && (
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 block mb-1">
                      NET TAKE-HOME PAY
                    </span>
                    <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono mb-4">
                      {money(ukPay.netMonthly)}/mo
                    </div>
                    <div className="space-y-2 border-t border-white/[0.06] pt-3 text-xs font-mono">
                      <ResultRow label="Personal Allowance:" value={money(ukPay.personalAllowance)} />
                      <ResultRow label="PAYE Income Tax:" value={`-${money(ukPay.incomeTax)}`} tone="negative" />
                      <ResultRow label="National Insurance (NI):" value={`-${money(ukPay.nationalInsurance)}`} tone="negative" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 4a. INDIA GST */}
          {activeToolId === "gst_in" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-7 space-y-6">
                <SliderField
                  label="Transaction / Invoice Base"
                  display={money(invoiceAmount)}
                  value={invoiceAmount}
                  onChange={setInvoiceAmount}
                  {...rangeFor("invoiceAmount", currency)}
                />
                <ChoiceField
                  label="GST Slab (GST 2.0, from 22 Sep 2025)"
                  options={INDIA_GST_RATES.map((rate) => ({ id: rate, label: `${rate}%` }))}
                  selected={selectedGstTier}
                  onSelect={setSelectedGstTier}
                />
                <InclusiveToggle checked={isTaxInclusive} onChange={setIsTaxInclusive} />
              </div>

              <ResultPanel heading={`TOTAL GST (${selectedGstTier}%)`} amount={money(gst.totalTax, 2)}>
                <ResultRow label="Base Net Amount:" value={money(gst.base, 2)} />
                <ResultRow label={`Central GST (CGST ${selectedGstTier / 2}%):`} value={money(gst.cgst, 2)} />
                <ResultRow label={`State GST (SGST ${selectedGstTier / 2}%):`} value={money(gst.sgst, 2)} />
                <TotalRow label="Final Gross Bill:" value={money(gst.total, 2)} />
              </ResultPanel>
            </div>
          )}

          {/* 4b. EU VAT */}
          {activeToolId === "vat_eu" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-7 space-y-6">
                <SliderField
                  label="Transaction / Invoice Base"
                  display={money(invoiceAmount)}
                  value={invoiceAmount}
                  onChange={setInvoiceAmount}
                  {...rangeFor("invoiceAmount", currency)}
                />
                <div>
                  <label className="text-xs font-mono text-zinc-400 block mb-2" htmlFor="vat-country">
                    Member State (standard rate)
                  </label>
                  <select
                    id="vat-country"
                    value={vatCountry}
                    onChange={(e) => setVatCountry(e.target.value)}
                    className="w-full bg-[#121216] text-white border border-white/[0.15] text-xs font-mono rounded-lg px-3 py-2 outline-none"
                  >
                    {Object.entries(EU_STANDARD_VAT_RATES).map(([code, entry]) => (
                      <option key={code} value={code}>
                        {entry.name} ({entry.rate}%)
                      </option>
                    ))}
                  </select>
                </div>
                <InclusiveToggle checked={isTaxInclusive} onChange={setIsTaxInclusive} />
              </div>

              <ResultPanel heading={`TOTAL VAT (${vatRate}%)`} amount={money(vat.tax, 2)}>
                <ResultRow label="Net Amount:" value={money(vat.base, 2)} />
                <ResultRow label="VAT:" value={money(vat.tax, 2)} />
                <TotalRow label="Gross Price:" value={money(vat.total, 2)} />
              </ResultPanel>
            </div>
          )}

          {/* 4c. US SALES TAX */}
          {activeToolId === "salestax_us" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-7 space-y-6">
                <SliderField
                  label="Purchase Price (pre-tax)"
                  display={money(invoiceAmount)}
                  value={invoiceAmount}
                  onChange={setInvoiceAmount}
                  {...rangeFor("invoiceAmount", currency)}
                />
                <p className="text-[11px] font-mono text-zinc-500">
                  Uses {usState?.name}&apos;s average combined state + local rate of {salesTaxRate}%. Change the state in the
                  STATE TAX MATRIX selector above. Actual rates vary by city and county.
                </p>
              </div>

              <ResultPanel heading={`SALES TAX (${salesTaxRate}%)`} amount={money(salesTax.tax, 2)}>
                <ResultRow label="Purchase Price:" value={money(salesTax.base, 2)} />
                <ResultRow label={`${usState?.name ?? ""} Sales Tax:`} value={money(salesTax.tax, 2)} />
                <TotalRow label="Checkout Total:" value={money(salesTax.total, 2)} />
              </ResultPanel>
            </div>
          )}

          {/* 4d. UK STAMP DUTY */}
          {activeToolId === "sdlt_uk" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-7 space-y-6">
                <SliderField
                  label="Property Purchase Price"
                  display={money(sdltPrice)}
                  value={sdltPrice}
                  onChange={setSdltPrice}
                  min={40_000}
                  max={3_000_000}
                  step={5_000}
                />
                <ChoiceField label="Buyer Type" options={SDLT_BUYERS} selected={sdltBuyer} onSelect={setSdltBuyer} />
                <p className="text-[11px] font-mono text-zinc-500">
                  Residential rates from 1 April 2025, England & Northern Ireland. Scotland (LBTT) and Wales (LTT) differ.
                </p>
              </div>

              <ResultPanel heading="STAMP DUTY LAND TAX" amount={money(sdlt.tax)}>
                <ResultRow label="Purchase Price:" value={money(sdltPrice)} />
                <ResultRow label="Effective Rate:" value={`${sdlt.effectiveRatePct}%`} />
                {sdlt.reliefUnavailable && (
                  <p className="text-amber-400 text-[11px]">
                    First-time buyer relief does not apply above £500,000; standard rates used.
                  </p>
                )}
                <TotalRow label="Price + SDLT:" value={money(sdltPrice + sdlt.tax)} />
              </ResultPanel>
            </div>
          )}

          {/* 5. FD MATURITY */}
          {activeToolId === "fdrd_in" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-7 space-y-6">
                <SliderField
                  label="Deposit Principal"
                  display={money(fdPrincipal)}
                  value={fdPrincipal}
                  onChange={setFdPrincipal}
                  min={10_000}
                  max={5_000_000}
                  step={10_000}
                />
                <SliderField
                  label="Interest Rate (%)"
                  display={`${fdInterestRate}%`}
                  accent
                  value={fdInterestRate}
                  onChange={setFdInterestRate}
                  min={3}
                  max={12}
                  step={0.1}
                />
                <SliderField
                  label="Deposit Term"
                  display={`${fdYears} Years`}
                  value={fdYears}
                  onChange={setFdYears}
                  min={1}
                  max={10}
                  step={1}
                />
              </div>

              <ResultPanel heading="MATURITY VALUE (QUARTERLY COMPOUNDING)" amount={money(fd.maturity)}>
                <ResultRow label="Principal Amount:" value={money(fd.invested)} />
                <TotalRow label="Interest Earned:" value={`+${money(fd.gains)}`} />
              </ResultPanel>
            </div>
          )}

          {/* 6. CTC TO IN-HAND */}
          {activeToolId === "ctc_in" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-7 space-y-6">
                <SliderField
                  label="Annual Cost to Company (CTC)"
                  display={money(ctcAmount)}
                  value={ctcAmount}
                  onChange={setCtcAmount}
                  min={300_000}
                  max={8_000_000}
                  step={50_000}
                />
                <SliderField
                  label="Annual Bonus Component"
                  display={money(annualBonus)}
                  value={annualBonus}
                  onChange={setAnnualBonus}
                  min={0}
                  max={1_000_000}
                  step={25_000}
                />
                <p className="text-[11px] font-mono text-zinc-500">
                  Assumes basic at 40% of fixed pay, 12% PF each side, 4.81% gratuity, ₹2,500 professional tax and the
                  new tax regime.
                </p>
              </div>

              <ResultPanel heading="ESTIMATED NET MONTHLY IN-HAND" amount={money(ctc.monthlyInHand)}>
                <ResultRow label="Basic Pay:" value={`${money(ctc.basicMonthly)}/mo`} />
                <ResultRow label="Employee EPF:" value={`-${money(ctc.employeePfMonthly)}/mo`} tone="negative" />
                <ResultRow label="Income Tax (TDS):" value={`-${money(Math.round(ctc.incomeTaxAnnual / 12))}/mo`} tone="negative" />
                <ResultRow label="Variable Bonus:" value={`${money(annualBonus)}/yr`} tone="warning" />
              </ResultPanel>
            </div>
          )}
        </section>

        {/* Standalone calculators */}
        <nav aria-label="Standalone calculators" className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { href: "/sip-calculator", title: "SIP Wealth Compounder", blurb: "Monthly investing with a return breakdown" },
            { href: "/emi-calculator", title: "EMI & Debt Schedule", blurb: "Loan installment and interest split" },
            { href: "/compound-interest", title: "Compound Interest Engine", blurb: "Growth with yearly additions" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block bg-[#0c0c10] border border-white/[0.08] hover:border-emerald-500/40 rounded-xl p-4 transition"
            >
              <span className="text-sm font-bold text-white block">{link.title} →</span>
              <span className="text-xs font-mono text-zinc-400">{link.blurb}</span>
            </Link>
          ))}
        </nav>

        <AdSenseBanner client={ADSENSE_CLIENT} slot={AD_SLOTS.bottom} className="my-6" />
      </main>

      <footer className="border-t border-white/[0.08] mt-16 py-8 text-center text-xs font-mono text-zinc-500 px-4">
        Finealth Financial Suite · Multi-Jurisdiction Statutory Architecture · Indicative figures, not financial advice
      </footer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Presentational helpers                                              */
/* ------------------------------------------------------------------ */

function SliderField(props: {
  label: string;
  display: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  accent?: boolean;
}) {
  return (
    <div>
      <div className="flex justify-between text-xs font-mono text-zinc-400 mb-2">
        <span>{props.label}</span>
        <span className={props.accent ? "text-emerald-400 font-bold" : "text-white font-bold"}>{props.display}</span>
      </div>
      <input
        type="range"
        aria-label={props.label}
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))}
        className="w-full accent-emerald-400"
      />
    </div>
  );
}

function NumberField(props: { label: string; value: number; onChange: (value: number) => void; step?: number }) {
  return (
    <label className="block">
      <span className="text-[10px] font-mono text-zinc-400 block mb-1">{props.label}</span>
      <input
        type="number"
        min={0}
        step={props.step ?? 1}
        value={props.value}
        onChange={(e) => props.onChange(Math.max(0, Number(e.target.value) || 0))}
        className="w-full bg-[#121216] border border-white/[0.1] rounded px-2 py-1 text-xs text-white"
      />
    </label>
  );
}

function ChoiceField<T extends string | number>(props: {
  label: string;
  options: readonly { id: T; label: string }[];
  selected: T;
  onSelect: (id: T) => void;
}) {
  return (
    <div>
      <span className="text-xs font-mono text-zinc-400 block mb-2">{props.label}</span>
      <div className="flex flex-wrap gap-2">
        {props.options.map((option) => (
          <button
            key={option.id}
            onClick={() => props.onSelect(option.id)}
            className={`flex-1 min-w-[5rem] py-2 px-2 rounded-xl text-xs font-mono font-bold transition ${
              props.selected === option.id
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                : "bg-white/[0.02] text-zinc-400 border border-white/[0.06]"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function InclusiveToggle(props: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="text-xs font-mono text-zinc-400 flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={props.checked}
        onChange={(e) => props.onChange(e.target.checked)}
        className="accent-emerald-400"
      />
      Price is Already Tax-Inclusive
    </label>
  );
}

const TONE_CLASS = {
  neutral: "text-white",
  positive: "text-emerald-400",
  negative: "text-rose-400",
  warning: "text-amber-400",
} as const;

function ResultRow(props: { label: string; value: string; tone?: keyof typeof TONE_CLASS }) {
  return (
    <div className="flex justify-between gap-3 text-zinc-400">
      <span>{props.label}</span>
      <span className={TONE_CLASS[props.tone ?? "neutral"]}>{props.value}</span>
    </div>
  );
}

function TotalRow(props: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 text-emerald-400 border-t border-white/[0.06] pt-2 font-bold">
      <span>{props.label}</span>
      <span>{props.value}</span>
    </div>
  );
}

function ResultPanel(props: { heading: string; amount: string; children: React.ReactNode }) {
  return (
    <div className="lg:col-span-5 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 flex flex-col justify-between">
      <div>
        <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 block mb-1">
          {props.heading}
        </span>
        <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono mb-4">{props.amount}</div>
        <div className="space-y-3 border-t border-white/[0.06] pt-4 text-xs font-mono">{props.children}</div>
      </div>
    </div>
  );
}
