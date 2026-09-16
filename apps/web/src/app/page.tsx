"use client";

import React, { useState, useMemo } from "react";
import {
  useCurrency,
  INDIAN_CITIES,
  ALL_50_US_STATES,
} from "./context/CurrencyContext";
import AdSenseBanner from "../components/AdSenseBanner";

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

  // Region-specific tool catalog
  const regionalTools = useMemo(() => {
    switch (baseCurrency) {
      case "USD":
        return [
          { id: "mortgage_us", label: "30-Yr Mortgage & PITI" },
          { id: "retirement_us", label: "401(k) & Roth IRA" },
          { id: "paycheck_us", label: "Federal + State Paycheck" },
          { id: "salestax_us", label: "State & Local Sales Tax" },
        ];
      case "GBP":
        return [
          { id: "mortgage_uk", label: "Repayment Mortgage" },
          { id: "isa_uk", label: "Cash & Stocks ISA" },
          { id: "paye_uk", label: "PAYE Tax & NI" },
          { id: "sdlt_uk", label: "Stamp Duty (SDLT)" },
        ];
      case "EUR":
        return [
          { id: "euribor_loan", label: "Euribor Variable Mortgage" },
          { id: "savings_eu", label: "Compound Growth Modeler" },
          { id: "vat_eu", label: "EU Harmonized VAT" },
        ];
      case "INR":
      default:
        return [
          { id: "emi_in", label: "Loan EMI & Amortization" },
          { id: "sip_in", label: "Mutual Fund SIP & Step-Up" },
          { id: "tax_in", label: "Income Tax (New vs Old)" },
          { id: "gst_in", label: "GST (CGST + SGST Split)" },
          { id: "fdrd_in", label: "Bank FD & Post Office RD" },
          { id: "ctc_in", label: "CTC to In-Hand Salary" },
        ];
    }
  }, [baseCurrency]);

  const [activeToolId, setActiveToolId] = useState<string>("emi_in");

  // Keep active tool in sync whenever region changes
  React.useEffect(() => {
    if (regionalTools.length > 0) {
      setActiveToolId(regionalTools[0].id);
    }
  }, [regionalTools]);

  // ==========================================
  // 1. LOAN / MORTGAGE STATE
  // ==========================================
  const [loanPrincipal, setLoanPrincipal] = useState<number>(
    baseCurrency === "INR" ? 3500000 : 350000
  );
  const [loanRate, setLoanRate] = useState<number>(baseCurrency === "INR" ? 8.5 : 6.8);
  const [loanTenureYears, setLoanTenureYears] = useState<number>(20);
  const [usPropertyTaxRate, setUsPropertyTaxRate] = useState<number>(1.2);
  const [usHomeInsuranceAnnual, setUsHomeInsuranceAnnual] = useState<number>(1400);
  const [usPmiMonthly, setUsPmiMonthly] = useState<number>(120);

  const monthlyInterestRate = loanRate / 12 / 100;
  const totalMonths = loanTenureYears * 12;
  const standardEmi =
    monthlyInterestRate > 0
      ? Math.round(
          (loanPrincipal *
            monthlyInterestRate *
            Math.pow(1 + monthlyInterestRate, totalMonths)) /
            (Math.pow(1 + monthlyInterestRate, totalMonths) - 1)
        )
      : Math.round(loanPrincipal / totalMonths);
  const totalLoanRepayment = standardEmi * totalMonths;
  const totalLoanInterest = Math.max(0, totalLoanRepayment - loanPrincipal);

  // US PITI Mortgage Breakdown
  const usMonthlyPropertyTax = Math.round((loanPrincipal * (usPropertyTaxRate / 100)) / 12);
  const usMonthlyInsurance = Math.round(usHomeInsuranceAnnual / 12);
  const usTotalMonthlyPITI = standardEmi + usMonthlyPropertyTax + usMonthlyInsurance + usPmiMonthly;

  // ==========================================
  // 2. SIP & RETIREMENT ENGINE
  // ==========================================
  const [sipMonthlyDeposit, setSipMonthlyDeposit] = useState<number>(
    baseCurrency === "INR" ? 15000 : 750
  );
  const [sipExpectedReturn, setSipExpectedReturn] = useState<number>(12.5);
  const [sipHorizonYears, setSipHorizonYears] = useState<number>(15);
  const [sipStepUpPct, setSipStepUpPct] = useState<number>(10);

  const stepUpResults = useMemo(() => {
    let totalInvested = 0;
    let corpus = 0;
    let currentMonthly = sipMonthlyDeposit;
    const monthlyRate = sipExpectedReturn / 12 / 100;

    for (let y = 1; y <= sipHorizonYears; y++) {
      for (let m = 1; m <= 12; m++) {
        totalInvested += currentMonthly;
        corpus = (corpus + currentMonthly) * (1 + monthlyRate);
      }
      currentMonthly += (currentMonthly * sipStepUpPct) / 100;
    }
    return {
      invested: Math.round(totalInvested),
      corpus: Math.round(corpus),
      gains: Math.max(0, Math.round(corpus - totalInvested)),
    };
  }, [sipMonthlyDeposit, sipExpectedReturn, sipHorizonYears, sipStepUpPct]);

  // ==========================================
  // 3. TAX ENGINES
  // ==========================================
  const [grossAnnualIncome, setGrossAnnualIncome] = useState<number>(
    baseCurrency === "INR" ? 1800000 : 110000
  );
  const [inSec80C, setInSec80C] = useState<number>(150000);
  const [inSec80D, setInSec80D] = useState<number>(25000);
  const [inHraExempt, setInHraExempt] = useState<number>(120000);

  // Indian Tax: New vs Old Regime
  const indianTaxBreakdown = useMemo(() => {
    const newStdDeduction = 75000;
    const newTaxableIncome = Math.max(0, grossAnnualIncome - newStdDeduction);
    let newTax = 0;

    if (newTaxableIncome > 1500000) {
      newTax = 150000 + (newTaxableIncome - 1500000) * 0.3;
    } else if (newTaxableIncome > 1200000) {
      newTax = 90000 + (newTaxableIncome - 1200000) * 0.2;
    } else if (newTaxableIncome > 900000) {
      newTax = 45000 + (newTaxableIncome - 900000) * 0.15;
    } else if (newTaxableIncome > 600000) {
      newTax = 15000 + (newTaxableIncome - 600000) * 0.1;
    } else if (newTaxableIncome > 300000) {
      newTax = (newTaxableIncome - 300000) * 0.05;
    }
    if (newTaxableIncome <= 700000) newTax = 0;
    const newCess = newTax * 0.04;
    const finalNewTax = Math.round(newTax + newCess);

    const oldStdDeduction = 50000;
    const oldTotalDeductions = oldStdDeduction + inSec80C + inSec80D + inHraExempt;
    const oldTaxableIncome = Math.max(0, grossAnnualIncome - oldTotalDeductions);
    let oldTax = 0;

    if (oldTaxableIncome > 1000000) {
      oldTax = 112500 + (oldTaxableIncome - 1000000) * 0.3;
    } else if (oldTaxableIncome > 500000) {
      oldTax = 12500 + (oldTaxableIncome - 500000) * 0.2;
    } else if (oldTaxableIncome > 250000) {
      oldTax = (oldTaxableIncome - 250000) * 0.05;
    }
    if (oldTaxableIncome <= 500000) oldTax = 0;
    const oldCess = oldTax * 0.04;
    const finalOldTax = Math.round(oldTax + oldCess);

    return {
      newTax: finalNewTax,
      oldTax: finalOldTax,
      recommended: finalNewTax <= finalOldTax ? "NEW REGIME" : "OLD REGIME",
      savings: Math.abs(finalNewTax - finalOldTax),
    };
  }, [grossAnnualIncome, inSec80C, inSec80D, inHraExempt]);

  // US Federal + State Paycheck
  const usTaxBreakdown = useMemo(() => {
    const stdDeduction = 14600;
    const taxableFederal = Math.max(0, grossAnnualIncome - stdDeduction);
    let federalTax = 0;

    if (taxableFederal > 243725) {
      federalTax = 52832 + (taxableFederal - 243725) * 0.35;
    } else if (taxableFederal > 100525) {
      federalTax = 17400 + (taxableFederal - 100525) * 0.24;
    } else if (taxableFederal > 47150) {
      federalTax = 5426 + (taxableFederal - 47150) * 0.22;
    } else if (taxableFederal > 11600) {
      federalTax = 1160 + (taxableFederal - 11600) * 0.12;
    } else {
      federalTax = taxableFederal * 0.1;
    }

    const stateRate = ALL_50_US_STATES[selectedUsState]?.incomeTaxRate || 0;
    const stateTax = (grossAnnualIncome * stateRate) / 100;
    const ficaSocialSecurity = Math.min(grossAnnualIncome, 168600) * 0.062;
    const ficaMedicare = grossAnnualIncome * 0.0145;
    const totalDeductions = federalTax + stateTax + ficaSocialSecurity + ficaMedicare;

    return {
      federalTax: Math.round(federalTax),
      stateTax: Math.round(stateTax),
      fica: Math.round(ficaSocialSecurity + ficaMedicare),
      netPaycheckMonthly: Math.round((grossAnnualIncome - totalDeductions) / 12),
      effectiveTaxRate: ((totalDeductions / grossAnnualIncome) * 100).toFixed(1),
    };
  }, [grossAnnualIncome, selectedUsState]);

  // UK PAYE & National Insurance
  const ukTaxBreakdown = useMemo(() => {
    const personalAllowance = 12570;
    const taxable = Math.max(0, grossAnnualIncome - personalAllowance);
    let payeTax = 0;

    if (taxable > 125140) {
      payeTax = (taxable - 125140) * 0.45 + (125140 - 37700) * 0.4 + 37700 * 0.2;
    } else if (taxable > 37700) {
      payeTax = (taxable - 37700) * 0.4 + 37700 * 0.2;
    } else {
      payeTax = taxable * 0.2;
    }

    const niThreshold = 12570;
    const niUpperLimit = 50270;
    let ni = 0;
    if (grossAnnualIncome > niUpperLimit) {
      ni = (niUpperLimit - niThreshold) * 0.08 + (grossAnnualIncome - niUpperLimit) * 0.02;
    } else if (grossAnnualIncome > niThreshold) {
      ni = (grossAnnualIncome - niThreshold) * 0.08;
    }

    const totalDeductions = payeTax + ni;
    return {
      payeTax: Math.round(payeTax),
      ni: Math.round(ni),
      netMonthly: Math.round((grossAnnualIncome - totalDeductions) / 12),
    };
  }, [grossAnnualIncome]);

  // ==========================================
  // 4. GST / VAT ENGINE
  // ==========================================
  const [invoiceAmount, setInvoiceAmount] = useState<number>(50000);
  const [selectedGstTier, setSelectedGstTier] = useState<number>(18);
  const [isGstInclusive, setIsGstInclusive] = useState<boolean>(false);

  const gstCalculation = useMemo(() => {
    let basePrice = invoiceAmount;
    let taxVal = 0;
    if (isGstInclusive) {
      basePrice = Math.round(invoiceAmount / (1 + selectedGstTier / 100));
      taxVal = invoiceAmount - basePrice;
    } else {
      taxVal = Math.round((invoiceAmount * selectedGstTier) / 100);
    }
    return {
      baseAmount: basePrice,
      totalGst: taxVal,
      cgst: Math.round(taxVal / 2),
      sgst: Math.round(taxVal / 2),
      finalInvoice: isGstInclusive ? invoiceAmount : basePrice + taxVal,
    };
  }, [invoiceAmount, selectedGstTier, isGstInclusive]);

  // ==========================================
  // 5. FD & RD MATURITY
  // ==========================================
  const [fdPrincipal, setFdPrincipal] = useState<number>(500000);
  const [fdInterestRate, setFdInterestRate] = useState<number>(7.2);
  const [fdYears, setFdYears] = useState<number>(5);
  const fdCompoundFreq = 4; // Quarterly

  const fdMaturityValue = Math.round(
    fdPrincipal * Math.pow(1 + fdInterestRate / (100 * fdCompoundFreq), fdCompoundFreq * fdYears)
  );
  const fdInterestGained = fdMaturityValue - fdPrincipal;

  // ==========================================
  // 6. CTC TO IN-HAND
  // ==========================================
  const [ctcAmount, setCtcAmount] = useState<number>(1500000);
  const [annualBonus, setAnnualBonus] = useState<number>(100000);

  const ctcBreakdown = useMemo(() => {
    const basicSalary = (ctcAmount - annualBonus) * 0.4;
    const epfEmployee = (basicSalary * 12) / 100;
    const epfEmployer = (basicSalary * 12) / 100;
    const gratuity = (basicSalary * 4.81) / 100;
    const professionalTaxAnnual = 2500;

    const monthlyGross = (ctcAmount - annualBonus - epfEmployer - gratuity) / 12;
    const approxMonthlyTax = indianTaxBreakdown.newTax / 12;
    const monthlyInHand = Math.round(
      monthlyGross - epfEmployee / 12 - professionalTaxAnnual / 12 - approxMonthlyTax
    );

    return {
      monthlyInHand: Math.max(0, monthlyInHand),
      basicMonthly: Math.round(basicSalary / 12),
      epfMonthly: Math.round(epfEmployee / 12),
      annualBonus,
    };
  }, [ctcAmount, annualBonus, indianTaxBreakdown.newTax]);

  // Bullion city spread adjustment for India
  const citySpread =
    baseCurrency === "INR"
      ? INDIAN_CITIES[selectedIndianCity] || INDIAN_CITIES["Mumbai"]
      : null;

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
              className="inline-flex items-center gap-1.5 text-xs font-mono bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] px-3 py-1.5 rounded-lg transition text-zinc-300 hover:text-white"
            >
              <span className={isSyncing ? "animate-spin" : ""}>⟳</span>
              <span className="hidden md:inline">{lastUpdated}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Subtle, slim top ad slot */}
        <AdSenseBanner client="ca-pub-XXXXXXXXXXXXXXXX" slot="1234567890" />

        {/* Region & Benchmark Header */}
        <div className="mb-8 pt-2">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              JURISDICTION: {activeProfile.flag} {activeProfile.name.toUpperCase()} ({activeProfile.currencyCode}) • EXCHANGE: {activeProfile.primaryExchange}
            </div>

            {baseCurrency === "INR" && (
              <div className="inline-flex items-center gap-2 bg-[#141418] border border-white/[0.1] px-3 py-1 rounded-full text-xs font-mono text-white">
                <span className="text-zinc-400">CITY SPREAD:</span>
                <select
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

            {baseCurrency === "USD" && (
              <div className="inline-flex items-center gap-2 bg-[#141418] border border-white/[0.1] px-3 py-1 rounded-full text-xs font-mono text-white">
                <span className="text-zinc-400">STATE TAX MATRIX:</span>
                <select
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
            Financial & Bullion Markets in {baseCurrency === "INR" ? selectedIndianCity : activeProfile.name}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1.5 font-light">
            Priority coverage: <span className="text-emerald-400 font-medium">{activeProfile.headlinePriority}</span>. Native statutory calibrations without synthetic conversions.
          </p>
        </div>

        {/* Priority 4-Asset Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {activeProfile.priorityAssets.map((asset) => {
            let adjustedPrice = asset.basePrice;
            if (citySpread && asset.id === "in_gold") {
              adjustedPrice += citySpread.goldPremiumPer10g;
            }
            if (citySpread && asset.id === "in_silver") {
              adjustedPrice += citySpread.silverPremiumPerKg;
            }

            const formattedVal =
              asset.symbol !== ""
                ? `${asset.symbol}${Math.round(adjustedPrice).toLocaleString()}`
                : `${adjustedPrice.toLocaleString()} pts`;

            return (
              <div
                key={asset.id}
                className="bg-[#0c0c10] border border-white/[0.08] hover:border-emerald-500/30 transition-all rounded-2xl p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400/90 block">
                        {asset.category}
                      </span>
                      <h3 className="text-lg font-bold text-white mt-0.5">{asset.name}</h3>
                      <p className="text-xs text-zinc-400 font-mono">{asset.unit}</p>
                    </div>
                    <span
                      className={`text-xs font-mono font-bold ${
                        asset.changePct >= 0 ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {asset.changePct >= 0 ? "▲" : "▼"} {Math.abs(asset.changePct)}%
                    </span>
                  </div>

                  <div className="my-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                    <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block mb-0.5">
                      LIVE BENCHMARK
                    </span>
                    <div className="text-2xl font-extrabold text-white font-mono">
                      {formattedVal}
                    </div>
                  </div>
                </div>

                <div className="text-[11px] font-mono text-zinc-500 pt-2 border-t border-white/[0.06]">
                  {asset.taxNote}
                </div>
              </div>
            );
          })}
        </section>

        {/* Graphical Trajectory Curves */}
        <section className="mb-12 bg-[#0c0c10] border border-white/[0.08] rounded-2xl p-5 sm:p-7">
          <div className="mb-5">
            <h2 className="text-lg sm:text-xl font-bold text-white">
              Multi-Decade Inception Historical Trajectory
            </h2>
            <p className="text-xs text-zinc-400 mt-1 font-mono">
              Empirical historical pricing milestones registered across official {activeProfile.name} records.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeProfile.priorityAssets.slice(0, 2).map((asset) => (
              <div
                key={`curve-${asset.id}`}
                className="bg-white/[0.01] border border-white/[0.05] rounded-xl p-5"
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-white">
                    {asset.name} ({asset.unit})
                  </h3>
                  <span className="text-[11px] font-mono text-emerald-400">
                    Source: {asset.sourceAuthority}
                  </span>
                </div>

                <div className="h-40 w-full flex items-end justify-between gap-2 pt-6 pb-2 px-1 border-b border-white/[0.08]">
                  {asset.history.map((pt, idx) => {
                    const maxVal = Math.max(...asset.history.map((h) => h.numericValue));
                    const heightPct = Math.max(12, Math.round((pt.numericValue / maxVal) * 100));

                    return (
                      <div
                        key={idx}
                        className="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end"
                      >
                        <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition pointer-events-none bg-zinc-900 border border-white/20 text-[10px] font-mono text-emerald-400 px-1.5 py-0.5 rounded whitespace-nowrap z-20">
                          {pt.priceFormatted}
                        </div>
                        <div
                          style={{ height: `${heightPct}%` }}
                          className="w-full bg-emerald-500/20 group-hover:bg-emerald-500/50 border-t-2 border-emerald-400 rounded-t transition-all"
                        />
                        <span className="text-[10px] font-mono text-zinc-400 mt-2">
                          {pt.year}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Mid Sponsor Ad */}
        <AdSenseBanner client="ca-pub-XXXXXXXXXXXXXXXX" slot="0987654321" className="my-4" />

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

          {/* 1. LOAN & MORTGAGE ENGINE (emi_in, mortgage_us, mortgage_uk, euribor_loan) */}
          {(activeToolId === "emi_in" ||
            activeToolId === "mortgage_us" ||
            activeToolId === "mortgage_uk" ||
            activeToolId === "euribor_loan") && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-7 space-y-6">
                <div>
                  <div className="flex justify-between text-xs font-mono text-zinc-400 mb-2">
                    <span>Borrowing Principal</span>
                    <span className="text-white font-bold">
                      {activeProfile.symbol}{loanPrincipal.toLocaleString()}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={baseCurrency === "INR" ? 100000 : 25000}
                    max={baseCurrency === "INR" ? 25000000 : 2000000}
                    step={baseCurrency === "INR" ? 50000 : 5000}
                    value={loanPrincipal}
                    onChange={(e) => setLoanPrincipal(Number(e.target.value))}
                    className="w-full accent-emerald-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-mono text-zinc-400 mb-2">
                    <span>Annual Interest Rate (%)</span>
                    <span className="text-emerald-400 font-bold">{loanRate}%</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="20"
                    step="0.1"
                    value={loanRate}
                    onChange={(e) => setLoanRate(Number(e.target.value))}
                    className="w-full accent-emerald-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-mono text-zinc-400 mb-2">
                    <span>Repayment Tenure</span>
                    <span className="text-white font-bold">{loanTenureYears} Years</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    step="1"
                    value={loanTenureYears}
                    onChange={(e) => setLoanTenureYears(Number(e.target.value))}
                    className="w-full accent-emerald-400"
                  />
                </div>

                {activeToolId === "mortgage_us" && (
                  <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/[0.06]">
                    <div>
                      <span className="text-[10px] font-mono text-zinc-400 block mb-1">Property Tax (%)</span>
                      <input
                        type="number"
                        step="0.1"
                        value={usPropertyTaxRate}
                        onChange={(e) => setUsPropertyTaxRate(Number(e.target.value))}
                        className="w-full bg-[#121216] border border-white/[0.1] rounded px-2 py-1 text-xs text-white"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-zinc-400 block mb-1">Annual Hazard Ins ($)</span>
                      <input
                        type="number"
                        value={usHomeInsuranceAnnual}
                        onChange={(e) => setUsHomeInsuranceAnnual(Number(e.target.value))}
                        className="w-full bg-[#121216] border border-white/[0.1] rounded px-2 py-1 text-xs text-white"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-zinc-400 block mb-1">Monthly PMI ($)</span>
                      <input
                        type="number"
                        value={usPmiMonthly}
                        onChange={(e) => setUsPmiMonthly(Number(e.target.value))}
                        className="w-full bg-[#121216] border border-white/[0.1] rounded px-2 py-1 text-xs text-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="lg:col-span-5 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 block mb-1">
                    {activeToolId === "mortgage_us" ? "TOTAL MONTHLY PITI" : "MONTHLY INSTALLMENT"}
                  </span>
                  <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono mb-4">
                    {activeProfile.symbol}
                    {(activeToolId === "mortgage_us" ? usTotalMonthlyPITI : standardEmi).toLocaleString()}
                  </div>

                  <div className="space-y-3 border-t border-white/[0.06] pt-4 text-xs font-mono">
                    <div className="flex justify-between text-zinc-400">
                      <span>Principal Amount:</span>
                      <span className="text-white">{activeProfile.symbol}{loanPrincipal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>Total Interest Payable:</span>
                      <span className="text-rose-400">+{activeProfile.symbol}{totalLoanInterest.toLocaleString()}</span>
                    </div>
                    {activeToolId === "mortgage_us" && (
                      <div className="flex justify-between text-zinc-400">
                        <span>Taxes + Ins + PMI:</span>
                        <span className="text-amber-400">
                          +{activeProfile.symbol}{(usMonthlyPropertyTax + usMonthlyInsurance + usPmiMonthly).toLocaleString()}/mo
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-zinc-400 border-t border-white/[0.06] pt-2 font-bold">
                      <span>Total Outlay:</span>
                      <span className="text-emerald-400">
                        {activeProfile.symbol}
                        {(activeToolId === "mortgage_us" ? usTotalMonthlyPITI * totalMonths : totalLoanRepayment).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. SIP & RETIREMENT ENGINE (sip_in, retirement_us, isa_uk, savings_eu) */}
          {(activeToolId === "sip_in" ||
            activeToolId === "retirement_us" ||
            activeToolId === "isa_uk" ||
            activeToolId === "savings_eu") && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-7 space-y-6">
                <div>
                  <div className="flex justify-between text-xs font-mono text-zinc-400 mb-2">
                    <span>Monthly Investment</span>
                    <span className="text-white font-bold">
                      {activeProfile.symbol}{sipMonthlyDeposit.toLocaleString()}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={baseCurrency === "INR" ? 500 : 50}
                    max={baseCurrency === "INR" ? 300000 : 5000}
                    step={baseCurrency === "INR" ? 500 : 50}
                    value={sipMonthlyDeposit}
                    onChange={(e) => setSipMonthlyDeposit(Number(e.target.value))}
                    className="w-full accent-emerald-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-mono text-zinc-400 mb-2">
                    <span>Expected Return Rate (% CAGR)</span>
                    <span className="text-emerald-400 font-bold">{sipExpectedReturn}%</span>
                  </div>
                  <input
                    type="range"
                    min="3"
                    max="30"
                    step="0.5"
                    value={sipExpectedReturn}
                    onChange={(e) => setSipExpectedReturn(Number(e.target.value))}
                    className="w-full accent-emerald-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-mono text-zinc-400 mb-2">
                    <span>Investment Horizon</span>
                    <span className="text-white font-bold">{sipHorizonYears} Years</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="40"
                    step="1"
                    value={sipHorizonYears}
                    onChange={(e) => setSipHorizonYears(Number(e.target.value))}
                    className="w-full accent-emerald-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-mono text-zinc-400 mb-2">
                    <span>Annual Step-Up (% per Year)</span>
                    <span className="text-amber-400 font-bold">{sipStepUpPct}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="25"
                    step="1"
                    value={sipStepUpPct}
                    onChange={(e) => setSipStepUpPct(Number(e.target.value))}
                    className="w-full accent-emerald-400"
                  />
                </div>
              </div>

              <div className="lg:col-span-5 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 block mb-1">
                    PROJECTED WEALTH CORPUS
                  </span>
                  <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono mb-4">
                    {activeProfile.symbol}{stepUpResults.corpus.toLocaleString()}
                  </div>

                  <div className="space-y-3 border-t border-white/[0.06] pt-4 text-xs font-mono">
                    <div className="flex justify-between text-zinc-400">
                      <span>Total Invested Capital:</span>
                      <span className="text-white">{activeProfile.symbol}{stepUpResults.invested.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>Compound Wealth Generated:</span>
                      <span className="text-emerald-400">+{activeProfile.symbol}{stepUpResults.gains.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. TAX ENGINES (tax_in, paycheck_us, paye_uk) */}
          {(activeToolId === "tax_in" ||
            activeToolId === "paycheck_us" ||
            activeToolId === "paye_uk") && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-7 space-y-6">
                <div>
                  <div className="flex justify-between text-xs font-mono text-zinc-400 mb-2">
                    <span>Annual Gross Income</span>
                    <span className="text-white font-bold">
                      {activeProfile.symbol}{grossAnnualIncome.toLocaleString()}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={baseCurrency === "INR" ? 300000 : 25000}
                    max={baseCurrency === "INR" ? 10000000 : 500000}
                    step={baseCurrency === "INR" ? 50000 : 5000}
                    value={grossAnnualIncome}
                    onChange={(e) => setGrossAnnualIncome(Number(e.target.value))}
                    className="w-full accent-emerald-400"
                  />
                </div>

                {activeToolId === "tax_in" && (
                  <div className="grid grid-cols-3 gap-3 p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl text-xs font-mono">
                    <div>
                      <span className="text-zinc-400 block mb-1">Section 80C</span>
                      <input
                        type="number"
                        value={inSec80C}
                        onChange={(e) => setInSec80C(Number(e.target.value))}
                        className="w-full bg-[#121216] border border-white/[0.1] rounded px-2 py-1 text-white"
                      />
                    </div>
                    <div>
                      <span className="text-zinc-400 block mb-1">Section 80D</span>
                      <input
                        type="number"
                        value={inSec80D}
                        onChange={(e) => setInSec80D(Number(e.target.value))}
                        className="w-full bg-[#121216] border border-white/[0.1] rounded px-2 py-1 text-white"
                      />
                    </div>
                    <div>
                      <span className="text-zinc-400 block mb-1">HRA Exempt</span>
                      <input
                        type="number"
                        value={inHraExempt}
                        onChange={(e) => setInHraExempt(Number(e.target.value))}
                        className="w-full bg-[#121216] border border-white/[0.1] rounded px-2 py-1 text-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="lg:col-span-5 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 flex flex-col justify-between">
                {activeToolId === "tax_in" ? (
                  <div>
                    <div className="inline-block bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold mb-2">
                      RECOMMENDATION: {indianTaxBreakdown.recommended}
                    </div>
                    <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono mb-4">
                      ₹{Math.min(indianTaxBreakdown.newTax, indianTaxBreakdown.oldTax).toLocaleString()}
                    </div>
                    <div className="space-y-2 border-t border-white/[0.06] pt-3 text-xs font-mono">
                      <div className="flex justify-between text-zinc-400">
                        <span>New Regime Tax (Sec 115BAC):</span>
                        <span className="text-white">₹{indianTaxBreakdown.newTax.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-zinc-400">
                        <span>Old Regime Tax (with 80C/80D):</span>
                        <span className="text-white">₹{indianTaxBreakdown.oldTax.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-emerald-400 border-t border-white/[0.06] pt-2 font-bold">
                        <span>Tax Saved:</span>
                        <span>₹{indianTaxBreakdown.savings.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ) : activeToolId === "paycheck_us" ? (
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 block mb-1">
                      NET MONTHLY PAYCHECK
                    </span>
                    <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono mb-4">
                      ${usTaxBreakdown.netPaycheckMonthly.toLocaleString()}
                    </div>
                    <div className="space-y-2 border-t border-white/[0.06] pt-3 text-xs font-mono">
                      <div className="flex justify-between text-zinc-400">
                        <span>Federal Income Tax:</span>
                        <span className="text-rose-400">-${usTaxBreakdown.federalTax.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-zinc-400">
                        <span>{ALL_50_US_STATES[selectedUsState]?.name} State Tax:</span>
                        <span className="text-rose-400">-${usTaxBreakdown.stateTax.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-zinc-400">
                        <span>FICA (SS + Medicare):</span>
                        <span className="text-rose-400">-${usTaxBreakdown.fica.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-emerald-400 border-t border-white/[0.06] pt-2 font-bold">
                        <span>Effective Tax Rate:</span>
                        <span>{usTaxBreakdown.effectiveTaxRate}%</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 block mb-1">
                      NET TAKE-HOME PAY
                    </span>
                    <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono mb-4">
                      £{ukTaxBreakdown.netMonthly.toLocaleString()}/mo
                    </div>
                    <div className="space-y-2 border-t border-white/[0.06] pt-3 text-xs font-mono">
                      <div className="flex justify-between text-zinc-400">
                        <span>PAYE Income Tax:</span>
                        <span className="text-rose-400">£{ukTaxBreakdown.payeTax.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-zinc-400">
                        <span>National Insurance (NI):</span>
                        <span className="text-rose-400">£{ukTaxBreakdown.ni.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 4. GST & VAT ENGINES (gst_in, salestax_us, vat_eu, sdlt_uk) */}
          {(activeToolId === "gst_in" ||
            activeToolId === "salestax_us" ||
            activeToolId === "vat_eu" ||
            activeToolId === "sdlt_uk") && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-7 space-y-6">
                <div>
                  <div className="flex justify-between text-xs font-mono text-zinc-400 mb-2">
                    <span>Transaction / Invoice Base</span>
                    <span className="text-white font-bold">
                      {activeProfile.symbol}{invoiceAmount.toLocaleString()}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1000"
                    max="1000000"
                    step="1000"
                    value={invoiceAmount}
                    onChange={(e) => setInvoiceAmount(Number(e.target.value))}
                    className="w-full accent-emerald-400"
                  />
                </div>

                <div>
                  <span className="text-xs font-mono text-zinc-400 block mb-2">
                    Applicable Tax Slab
                  </span>
                  <div className="flex gap-2">
                    {[5, 12, 18, 28].map((tier) => (
                      <button
                        key={tier}
                        onClick={() => setSelectedGstTier(tier)}
                        className={`flex-1 py-2 rounded-xl text-xs font-mono font-bold transition ${
                          selectedGstTier === tier
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                            : "bg-white/[0.02] text-zinc-400 border border-white/[0.06]"
                        }`}
                      >
                        {tier}%
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <label className="text-xs font-mono text-zinc-400 flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isGstInclusive}
                      onChange={(e) => setIsGstInclusive(e.target.checked)}
                      className="accent-emerald-400"
                    />
                    Invoice Price is Already Tax-Inclusive
                  </label>
                </div>
              </div>

              <div className="lg:col-span-5 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 block mb-1">
                    TOTAL TAX APPLICABLE ({selectedGstTier}%)
                  </span>
                  <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono mb-4">
                    {activeProfile.symbol}{gstCalculation.totalGst.toLocaleString()}
                  </div>

                  <div className="space-y-3 border-t border-white/[0.06] pt-4 text-xs font-mono">
                    <div className="flex justify-between text-zinc-400">
                      <span>Base Net Amount:</span>
                      <span className="text-white">{activeProfile.symbol}{gstCalculation.baseAmount.toLocaleString()}</span>
                    </div>
                    {baseCurrency === "INR" && (
                      <>
                        <div className="flex justify-between text-zinc-400">
                          <span>Central GST (CGST {selectedGstTier / 2}%):</span>
                          <span className="text-zinc-300">₹{gstCalculation.cgst.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-zinc-400">
                          <span>State GST (SGST {selectedGstTier / 2}%):</span>
                          <span className="text-zinc-300">₹{gstCalculation.sgst.toLocaleString()}</span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between text-emerald-400 border-t border-white/[0.06] pt-2 font-bold">
                      <span>Final Gross Bill:</span>
                      <span>{activeProfile.symbol}{gstCalculation.finalInvoice.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 5. FD & RD MATURITY (fdrd_in) */}
          {activeToolId === "fdrd_in" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-7 space-y-6">
                <div>
                  <div className="flex justify-between text-xs font-mono text-zinc-400 mb-2">
                    <span>Deposit Principal</span>
                    <span className="text-white font-bold">
                      ₹{fdPrincipal.toLocaleString()}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10000"
                    max="5000000"
                    step="10000"
                    value={fdPrincipal}
                    onChange={(e) => setFdPrincipal(Number(e.target.value))}
                    className="w-full accent-emerald-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-mono text-zinc-400 mb-2">
                    <span>Interest Rate (%)</span>
                    <span className="text-emerald-400 font-bold">{fdInterestRate}%</span>
                  </div>
                  <input
                    type="range"
                    min="3"
                    max="12"
                    step="0.1"
                    value={fdInterestRate}
                    onChange={(e) => setFdInterestRate(Number(e.target.value))}
                    className="w-full accent-emerald-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-mono text-zinc-400 mb-2">
                    <span>Deposit Term</span>
                    <span className="text-white font-bold">{fdYears} Years</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={fdYears}
                    onChange={(e) => setFdYears(Number(e.target.value))}
                    className="w-full accent-emerald-400"
                  />
                </div>
              </div>

              <div className="lg:col-span-5 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 block mb-1">
                    MATURITY VALUE
                  </span>
                  <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono mb-4">
                    ₹{fdMaturityValue.toLocaleString()}
                  </div>

                  <div className="space-y-3 border-t border-white/[0.06] pt-4 text-xs font-mono">
                    <div className="flex justify-between text-zinc-400">
                      <span>Principal Amount:</span>
                      <span className="text-white">₹{fdPrincipal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-emerald-400 font-bold">
                      <span>Interest Earned:</span>
                      <span>+₹{fdInterestGained.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 6. CTC TO IN-HAND (ctc_in) */}
          {activeToolId === "ctc_in" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-7 space-y-6">
                <div>
                  <div className="flex justify-between text-xs font-mono text-zinc-400 mb-2">
                    <span>Annual Cost to Company (CTC)</span>
                    <span className="text-white font-bold">
                      ₹{ctcAmount.toLocaleString()}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="300000"
                    max="8000000"
                    step="50000"
                    value={ctcAmount}
                    onChange={(e) => setCtcAmount(Number(e.target.value))}
                    className="w-full accent-emerald-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-mono text-zinc-400 mb-2">
                    <span>Annual Bonus Component</span>
                    <span className="text-zinc-300 font-bold">
                      ₹{annualBonus.toLocaleString()}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1000000"
                    step="25000"
                    value={annualBonus}
                    onChange={(e) => setAnnualBonus(Number(e.target.value))}
                    className="w-full accent-emerald-400"
                  />
                </div>
              </div>

              <div className="lg:col-span-5 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 block mb-1">
                    ESTIMATED NET MONTHLY IN-HAND
                  </span>
                  <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono mb-4">
                    ₹{ctcBreakdown.monthlyInHand.toLocaleString()}
                  </div>

                  <div className="space-y-3 border-t border-white/[0.06] pt-4 text-xs font-mono">
                    <div className="flex justify-between text-zinc-400">
                      <span>Basic Pay:</span>
                      <span className="text-white">₹{ctcBreakdown.basicMonthly.toLocaleString()}/mo</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>Employee EPF:</span>
                      <span className="text-rose-400">-₹{ctcBreakdown.epfMonthly.toLocaleString()}/mo</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>Variable Bonus:</span>
                      <span className="text-amber-400">₹{ctcBreakdown.annualBonus.toLocaleString()}/yr</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Bottom Sponsor Placement */}
        <AdSenseBanner client="ca-pub-XXXXXXXXXXXXXXXX" slot="5678901234" className="my-6" />
      </main>

      <footer className="border-t border-white/[0.08] mt-16 py-8 text-center text-xs font-mono text-zinc-500">
        Finealth Financial Suite · Multi-Jurisdiction Statutory Architecture · Updated Live {lastUpdated}
      </footer>
    </div>
  );
}