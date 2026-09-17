"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import SplashSequence from "@/components/SplashSequence";
import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { formatMoney } from "@/lib/format";
import {
  compareIndiaRegimes,
  gstBreakdown,
  indiaNewRegimeTax,
  loanSummary,
  lumpSumFutureValue,
  sipFutureValue,
  systematicWithdrawal,
  yearsToFinancialIndependence,
  INDIA_GST_RATES,
} from "@/lib/finance";

export type Category = "wealth" | "income" | "debts" | "macro";

export type ToolId =
  | "sip"
  | "lumpsum"
  | "swp"
  | "fd"
  | "salary"
  | "incometax"
  | "gst"
  | "emi"
  | "loancompare"
  | "inflation"
  | "fire";

interface SubTool {
  id: ToolId;
  name: string;
}

const CATEGORIES: { id: Category; label: string; icon: string; tools: SubTool[] }[] = [
  {
    id: "wealth",
    label: "Wealth",
    icon: "▲",
    tools: [
      { id: "sip", name: "SIP Engine" },
      { id: "lumpsum", name: "Lump Sum" },
      { id: "swp", name: "SWP Cashflow" },
      { id: "fd", name: "Fixed Deposit" },
    ],
  },
  {
    id: "income",
    label: "Income",
    icon: "◆",
    tools: [
      { id: "salary", name: "In-Hand Salary" },
      { id: "incometax", name: "Tax: New vs Old" },
      { id: "gst", name: "GST Calculator" },
    ],
  },
  {
    id: "debts",
    label: "Debts",
    icon: "▼",
    tools: [
      { id: "emi", name: "Loan & EMI" },
      { id: "loancompare", name: "Loan Compare" },
    ],
  },
  {
    id: "macro",
    label: "Macro",
    icon: "●",
    tools: [
      { id: "inflation", name: "Purchasing Power" },
      { id: "fire", name: "FIRE Freedom" },
    ],
  },
];

export default function FinealthProSuite() {
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [activeCategory, setActiveCategory] = useState<Category>("wealth");
  const [activeTool, setActiveTool] = useState<ToolId>("sip");

  const inr = (n: number) => formatMoney(Math.round(n), "INR");
  /** Paise precision, for GST where CGST + SGST must visibly add up. */
  const inr2 = (n: number) => formatMoney(n, "INR", 2);

  const handleCategorySwitch = (catId: Category) => {
    // Light tap feedback in the native app only. On the web the plugin lazy-loads
    // a vibration fallback over the network, which breaks offline use.
    if (Capacitor.isNativePlatform()) {
      Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    }
    setActiveCategory(catId);
    const cat = CATEGORIES.find((c) => c.id === catId);
    if (cat && cat.tools.length > 0) {
      setActiveTool(cat.tools[0].id);
    }
  };

  const currentCategoryTools = useMemo(() => {
    return CATEGORIES.find((c) => c.id === activeCategory)?.tools || [];
  }, [activeCategory]);

  // ==========================================
  // WEALTH: SIP
  // ==========================================
  const [sipMonthly, setSipMonthly] = useState<number>(15000);
  const [sipRate, setSipRate] = useState<number>(12);
  const [sipYears, setSipYears] = useState<number>(15);
  const [sipStepUp, setSipStepUp] = useState<number>(10);
  const [hasStepUp, setHasStepUp] = useState<boolean>(false);

  const sipCalcs = useMemo(() => {
    const result = sipFutureValue(sipMonthly, sipRate, sipYears, hasStepUp ? sipStepUp : 0);
    return { invested: result.invested, profit: result.gains, total: result.maturity };
  }, [sipMonthly, sipRate, sipYears, sipStepUp, hasStepUp]);

  // ==========================================
  // WEALTH: LUMP SUM
  // ==========================================
  const [lumpPrincipal, setLumpPrincipal] = useState<number>(200000);
  const [lumpRate, setLumpRate] = useState<number>(12.5);
  const [lumpYears, setLumpYears] = useState<number>(10);

  const lumpCalcs = useMemo(() => {
    const result = lumpSumFutureValue(lumpPrincipal, lumpRate, lumpYears, 1);
    return { invested: result.invested, profit: result.gains, total: result.maturity };
  }, [lumpPrincipal, lumpRate, lumpYears]);

  // ==========================================
  // WEALTH: SWP
  // ==========================================
  const [swpCorpus, setSwpCorpus] = useState<number>(6000000);
  const [swpWithdrawal, setSwpWithdrawal] = useState<number>(40000);
  const [swpRate, setSwpRate] = useState<number>(8.5);
  const [swpYears, setSwpYears] = useState<number>(20);

  const swpCalcs = useMemo(() => {
    const result = systematicWithdrawal(swpCorpus, swpWithdrawal, swpRate, swpYears);
    return {
      corpus: result.corpus,
      withdrawn: result.totalWithdrawn,
      balance: result.remainingBalance,
      exhaustedMonth: result.exhaustedInMonth,
    };
  }, [swpCorpus, swpWithdrawal, swpRate, swpYears]);

  // ==========================================
  // WEALTH: FD
  // ==========================================
  const [fdDeposit, setFdDeposit] = useState<number>(500000);
  const [fdRate, setFdRate] = useState<number>(7.25);
  const [fdYears, setFdYears] = useState<number>(5);
  const [fdCompounding, setFdCompounding] = useState<number>(4);

  const fdCalcs = useMemo(() => {
    const result = lumpSumFutureValue(fdDeposit, fdRate, fdYears, fdCompounding);
    return { principal: result.invested, interest: result.gains, maturity: result.maturity };
  }, [fdDeposit, fdRate, fdYears, fdCompounding]);

  // ==========================================
  // INCOME: SALARY
  // ==========================================
  const [ctcAnnual, setCtcAnnual] = useState<number>(1200000);
  const [bonusAnnual, setBonusAnnual] = useState<number>(100000);
  const [professionalTax, setProfessionalTax] = useState<number>(200);

  const salaryCalcs = useMemo(() => {
    const fixedCtc = Math.max(0, ctcAnnual - bonusAnnual);
    const monthlyGross = fixedCtc / 12;
    const monthlyBasic = monthlyGross * 0.45;
    // Employee PF: 12% of basic, capped at the statutory wage ceiling (12% of ₹15,000).
    const monthlyEpfc = Math.min(monthlyBasic * 0.12, 1_800);
    // TDS: new-regime tax on the full year's salary, bonus included, spread over 12 months.
    const monthlyTds = indiaNewRegimeTax(ctcAnnual).totalTax / 12;
    const inHandMonthly = Math.max(0, monthlyGross - monthlyEpfc - professionalTax - monthlyTds);

    return {
      monthlyGross,
      monthlyEpfc,
      monthlyTds,
      inHandMonthly,
      annualInHand: inHandMonthly * 12 + bonusAnnual,
    };
  }, [ctcAnnual, bonusAnnual, professionalTax]);

  // ==========================================
  // INCOME: TAX
  // ==========================================
  const [taxableIncome, setTaxableIncome] = useState<number>(1200000);
  const [deductions80C, setDeductions80C] = useState<number>(150000);
  const [deductions80D, setDeductions80D] = useState<number>(25000);
  const [deductionsHra, setDeductionsHra] = useState<number>(120000);

  const taxCalcs = useMemo(() => {
    const result = compareIndiaRegimes(taxableIncome, {
      section80C: deductions80C,
      section80D: deductions80D,
      hraExemption: deductionsHra,
    });
    return {
      newTotal: result.newTax,
      oldTotal: result.oldTax,
      savings: result.savings,
      recommended: result.recommended === "NEW REGIME" ? "New Regime" : "Old Regime",
    };
  }, [taxableIncome, deductions80C, deductions80D, deductionsHra]);

  // ==========================================
  // INCOME: GST
  // ==========================================
  const [gstAmount, setGstAmount] = useState<number>(25000);
  const [gstRate, setGstRate] = useState<number>(18);
  const [gstType, setGstType] = useState<"exclusive" | "inclusive">("exclusive");

  const gstCalcs = useMemo(() => {
    const result = gstBreakdown(gstAmount, gstRate, gstType === "inclusive");
    return { net: result.base, tax: result.totalTax, cgst: result.cgst, sgst: result.sgst, total: result.total };
  }, [gstAmount, gstRate, gstType]);

  // ==========================================
  // DEBTS: EMI
  // ==========================================
  const [loanPrincipal, setLoanPrincipal] = useState<number>(3000000);
  const [loanRate, setLoanRate] = useState<number>(8.75);
  const [loanYears, setLoanYears] = useState<number>(20);

  const emiCalcs = useMemo(() => {
    const result = loanSummary(loanPrincipal, loanRate, loanYears);
    return {
      emi: result.emi,
      totalInterest: result.totalInterest,
      total: result.totalPayment,
      principalShare: result.principalShare,
    };
  }, [loanPrincipal, loanRate, loanYears]);

  // ==========================================
  // DEBTS: LOAN COMPARE
  // ==========================================
  const [cmpLoanAmount, setCmpLoanAmount] = useState<number>(4000000);
  const [bankARate, setBankARate] = useState<number>(8.5);
  const [bankAYears, setBankAYears] = useState<number>(20);
  const [bankBRate, setBankBRate] = useState<number>(8.9);
  const [bankBYears, setBankBYears] = useState<number>(20);

  const loanCompareCalcs = useMemo(() => {
    const a = loanSummary(cmpLoanAmount, bankARate, bankAYears);
    const b = loanSummary(cmpLoanAmount, bankBRate, bankBYears);
    return {
      emiA: a.emi,
      interestA: a.totalInterest,
      emiB: b.emi,
      interestB: b.totalInterest,
      interestDifference: Math.abs(a.totalInterest - b.totalInterest),
      emiDifference: Math.abs(a.emi - b.emi),
      cheaperBank: a.totalInterest <= b.totalInterest ? "Bank A" : "Bank B",
    };
  }, [cmpLoanAmount, bankARate, bankAYears, bankBRate, bankBYears]);

  // ==========================================
  // MACRO: INFLATION
  // ==========================================
  const [currentExpense, setCurrentExpense] = useState<number>(50000);
  const [inflationRate, setInflationRate] = useState<number>(6.5);
  const [inflationHorizon, setInflationHorizon] = useState<number>(15);

  const inflationCalcs = useMemo(() => {
    const futureMonthly = currentExpense * Math.pow(1 + inflationRate / 100, inflationHorizon);
    const futureAnnual = futureMonthly * 12;
    const currentAnnual = currentExpense * 12;
    const erodedValue = 100 / Math.pow(1 + inflationRate / 100, inflationHorizon);

    return {
      currentAnnual,
      futureMonthly,
      futureAnnual,
      erodedValue,
      multiplier: futureMonthly / (currentExpense || 1),
    };
  }, [currentExpense, inflationRate, inflationHorizon]);

  // ==========================================
  // MACRO: FIRE
  // ==========================================
  const [fireAnnualExpense, setFireAnnualExpense] = useState<number>(800000);
  const [fireCurrentSavings, setFireCurrentSavings] = useState<number>(1500000);
  const [fireMonthlySaving, setFireMonthlySaving] = useState<number>(50000);
  const [fireReturnRate, setFireReturnRate] = useState<number>(12);

  const fireCalcs = useMemo(() => {
    const result = yearsToFinancialIndependence(
      fireAnnualExpense,
      fireCurrentSavings,
      fireMonthlySaving,
      fireReturnRate
    );
    // Beyond 50 years the target is reported as unreachable rather than as "50.0".
    return { targetCorpus: result.targetCorpus, yearsToFire: result.yearsToTarget };
  }, [fireAnnualExpense, fireCurrentSavings, fireMonthlySaving, fireReturnRate]);

  return (
    <div className="h-screen w-screen bg-[#070708] text-zinc-100 flex flex-col overflow-hidden font-sans">
      
      {/* BRAND SPLASH SEQUENCE */}
      {showSplash && <SplashSequence onComplete={() => setShowSplash(false)} />}

      {/* 1. TOP BAR WITH BRAND LOGO */}
      <header className="shrink-0 bg-[#0b0b0e] border-b border-[#1b1b24] safe-top z-30">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg overflow-hidden relative border border-[#23232f] bg-[#14141a] flex items-center justify-center">
              <Image
                src="/logo.png"
                alt="Finealth Logo"
                width={32}
                height={32}
                className="object-cover"
                priority
              />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-zinc-100 font-serif">finealth</span>
              <span className="ml-2 text-[10px] text-emerald-400 font-mono tracking-wider uppercase">
                / {activeCategory}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-mono text-zinc-400 uppercase">{activeTool}</span>
          </div>
        </div>

        {/* Dynamic Contextual Tool Bar */}
        <div className="flex items-center space-x-1 px-3 py-1.5 overflow-x-auto no-scrollbar border-t border-[#16161e] bg-[#09090c]">
          {currentCategoryTools.map((tool) => {
            const isSelected = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                className={`shrink-0 px-3 py-1.5 rounded text-xs font-mono transition-all duration-150 ${
                  isSelected
                    ? "bg-zinc-100 text-zinc-950 font-semibold shadow-sm scale-100"
                    : "bg-[#111116] text-zinc-400 hover:text-zinc-200 border border-[#1d1d27]"
                }`}
              >
                {tool.name}
              </button>
            );
          })}
        </div>
      </header>

      {/* 2. SCROLLABLE WORKSPACE */}
      <main className="flex-1 overflow-y-auto no-scrollbar p-4 md:p-8 space-y-6">
        <div key={activeTool} className="max-w-5xl w-full mx-auto animate-tool-fade space-y-6">

          {/* SIP */}
          {activeTool === "sip" && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              <div className="md:col-span-7 bg-[#0f0f13] border border-[#1e1e27] rounded-xl p-5 space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-emerald-400">
                    SIP Wealth Accumulator
                  </h2>
                  <label className="flex items-center space-x-2 cursor-pointer text-xs text-zinc-400 font-mono">
                    <input
                      type="checkbox"
                      checked={hasStepUp}
                      onChange={(e) => setHasStepUp(e.target.checked)}
                      className="accent-emerald-400 w-4 h-4 rounded"
                    />
                    <span>Annual Step-Up</span>
                  </label>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-400 font-mono">Monthly Investment</span>
                    <div className="flex items-center bg-[#181820] border border-[#262633] rounded px-3 py-1">
                      <span className="text-xs text-zinc-500 mr-1">₹</span>
                      <input
                        type="number"
                        value={sipMonthly}
                        onChange={(e) => setSipMonthly(Number(e.target.value) || 0)}
                        className="w-28 bg-transparent text-right font-mono font-semibold text-zinc-100 text-sm focus:outline-none"
                      />
                    </div>
                  </div>
                  <input
                    type="range"
                    min={500}
                    max={200000}
                    step={500}
                    value={sipMonthly}
                    onChange={(e) => setSipMonthly(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-400 font-mono">Expected Return (p.a.)</span>
                    <div className="flex items-center bg-[#181820] border border-[#262633] rounded px-3 py-1">
                      <input
                        type="number"
                        step="0.1"
                        value={sipRate}
                        onChange={(e) => setSipRate(Number(e.target.value) || 0)}
                        className="w-16 bg-transparent text-right font-mono font-semibold text-emerald-400 text-sm focus:outline-none"
                      />
                      <span className="text-xs text-zinc-500 ml-1">%</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={30}
                    step={0.5}
                    value={sipRate}
                    onChange={(e) => setSipRate(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-400 font-mono">Tenure (Years)</span>
                    <div className="flex items-center bg-[#181820] border border-[#262633] rounded px-3 py-1">
                      <input
                        type="number"
                        value={sipYears}
                        onChange={(e) => setSipYears(Number(e.target.value) || 0)}
                        className="w-14 bg-transparent text-right font-mono font-semibold text-zinc-100 text-sm focus:outline-none"
                      />
                      <span className="text-xs text-zinc-500 ml-1">Yr</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={40}
                    step={1}
                    value={sipYears}
                    onChange={(e) => setSipYears(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                {hasStepUp && (
                  <div className="space-y-2 pt-2 border-t border-[#1e1e27]">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-emerald-400 font-mono">Annual Step-Up Growth</span>
                      <div className="flex items-center bg-[#181820] border border-[#262633] rounded px-3 py-1">
                        <input
                          type="number"
                          value={sipStepUp}
                          onChange={(e) => setSipStepUp(Number(e.target.value) || 0)}
                          className="w-14 bg-transparent text-right font-mono font-semibold text-emerald-400 text-sm focus:outline-none"
                        />
                        <span className="text-xs text-zinc-500 ml-1">%</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={25}
                      step={1}
                      value={sipStepUp}
                      onChange={(e) => setSipStepUp(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                )}
              </div>

              <div className="md:col-span-5 bg-[#0f0f13] border border-[#1e1e27] rounded-xl p-5 flex flex-col justify-between space-y-6">
                <div>
                  <span className="text-xs font-mono uppercase tracking-widest text-zinc-500">Maturity Balance</span>
                  <div className="text-3xl lg:text-4xl font-mono font-bold text-emerald-400 tracking-tight mt-1 transition-all">
                    {inr(sipCalcs.total)}
                  </div>
                </div>

                <div className="space-y-3 font-mono">
                  <div className="p-3 bg-[#15151c] border border-[#22222e] rounded-lg flex justify-between items-center">
                    <span className="text-xs text-zinc-400">Total Invested</span>
                    <span className="text-sm font-semibold text-zinc-200">{inr(sipCalcs.invested)}</span>
                  </div>
                  <div className="p-3 bg-[#15151c] border border-[#22222e] rounded-lg flex justify-between items-center">
                    <span className="text-xs text-zinc-400">Estimated Profit</span>
                    <span className="text-sm font-semibold text-emerald-400">+{inr(sipCalcs.profit)}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="h-2 w-full bg-[#1e1e27] rounded-full overflow-hidden flex">
                    <div className="bg-zinc-500" style={{ width: `${(sipCalcs.invested / (sipCalcs.total || 1)) * 100}%` }} />
                    <div className="bg-emerald-400" style={{ width: `${(sipCalcs.profit / (sipCalcs.total || 1)) * 100}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                    <span>Invested {((sipCalcs.invested / (sipCalcs.total || 1)) * 100).toFixed(0)}%</span>
                    <span>Returns {((sipCalcs.profit / (sipCalcs.total || 1)) * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* LUMP SUM */}
          {activeTool === "lumpsum" && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              <div className="md:col-span-7 bg-[#0f0f13] border border-[#1e1e27] rounded-xl p-5 space-y-5">
                <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-emerald-400">
                  Lump Sum Deposit Growth
                </h2>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-400 font-mono">Deposit Capital</span>
                    <div className="flex items-center bg-[#181820] border border-[#262633] rounded px-3 py-1">
                      <span className="text-xs text-zinc-500 mr-1">₹</span>
                      <input
                        type="number"
                        value={lumpPrincipal}
                        onChange={(e) => setLumpPrincipal(Number(e.target.value) || 0)}
                        className="w-28 bg-transparent text-right font-mono font-semibold text-zinc-100 text-sm focus:outline-none"
                      />
                    </div>
                  </div>
                  <input
                    type="range"
                    min={5000}
                    max={5000000}
                    step={5000}
                    value={lumpPrincipal}
                    onChange={(e) => setLumpPrincipal(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-400 font-mono">Annual ROI (%)</span>
                    <div className="flex items-center bg-[#181820] border border-[#262633] rounded px-3 py-1">
                      <input
                        type="number"
                        step="0.1"
                        value={lumpRate}
                        onChange={(e) => setLumpRate(Number(e.target.value) || 0)}
                        className="w-16 bg-transparent text-right font-mono font-semibold text-emerald-400 text-sm focus:outline-none"
                      />
                      <span className="text-xs text-zinc-500 ml-1">%</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={30}
                    step={0.5}
                    value={lumpRate}
                    onChange={(e) => setLumpRate(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-400 font-mono">Tenure (Years)</span>
                    <div className="flex items-center bg-[#181820] border border-[#262633] rounded px-3 py-1">
                      <input
                        type="number"
                        value={lumpYears}
                        onChange={(e) => setLumpYears(Number(e.target.value) || 0)}
                        className="w-14 bg-transparent text-right font-mono font-semibold text-zinc-100 text-sm focus:outline-none"
                      />
                      <span className="text-xs text-zinc-500 ml-1">Yr</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={35}
                    step={1}
                    value={lumpYears}
                    onChange={(e) => setLumpYears(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="md:col-span-5 bg-[#0f0f13] border border-[#1e1e27] rounded-xl p-5 flex flex-col justify-between space-y-6">
                <div>
                  <span className="text-xs font-mono uppercase tracking-widest text-zinc-500">Maturity Value</span>
                  <div className="text-3xl lg:text-4xl font-mono font-bold text-emerald-400 tracking-tight mt-1">
                    {inr(lumpCalcs.total)}
                  </div>
                </div>
                <div className="space-y-3 font-mono">
                  <div className="p-3 bg-[#15151c] border border-[#22222e] rounded-lg flex justify-between items-center">
                    <span className="text-xs text-zinc-400">Principal Deposit</span>
                    <span className="text-sm font-semibold text-zinc-200">{inr(lumpCalcs.invested)}</span>
                  </div>
                  <div className="p-3 bg-[#15151c] border border-[#22222e] rounded-lg flex justify-between items-center">
                    <span className="text-xs text-zinc-400">Net Return</span>
                    <span className="text-sm font-semibold text-emerald-400">+{inr(lumpCalcs.profit)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SWP */}
          {activeTool === "swp" && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              <div className="md:col-span-7 bg-[#0f0f13] border border-[#1e1e27] rounded-xl p-5 space-y-5">
                <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-emerald-400">
                  Systematic Withdrawal (SWP)
                </h2>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-400 font-mono">Total Capital Corpus</span>
                    <div className="flex items-center bg-[#181820] border border-[#262633] rounded px-3 py-1">
                      <span className="text-xs text-zinc-500 mr-1">₹</span>
                      <input
                        type="number"
                        value={swpCorpus}
                        onChange={(e) => setSwpCorpus(Number(e.target.value) || 0)}
                        className="w-28 bg-transparent text-right font-mono font-semibold text-zinc-100 text-sm focus:outline-none"
                      />
                    </div>
                  </div>
                  <input
                    type="range"
                    min={500000}
                    max={20000000}
                    step={100000}
                    value={swpCorpus}
                    onChange={(e) => setSwpCorpus(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-400 font-mono">Monthly Cashout</span>
                    <div className="flex items-center bg-[#181820] border border-[#262633] rounded px-3 py-1">
                      <span className="text-xs text-zinc-500 mr-1">₹</span>
                      <input
                        type="number"
                        value={swpWithdrawal}
                        onChange={(e) => setSwpWithdrawal(Number(e.target.value) || 0)}
                        className="w-24 bg-transparent text-right font-mono font-semibold text-emerald-400 text-sm focus:outline-none"
                      />
                    </div>
                  </div>
                  <input
                    type="range"
                    min={5000}
                    max={200000}
                    step={1000}
                    value={swpWithdrawal}
                    onChange={(e) => setSwpWithdrawal(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <span className="text-xs text-zinc-400 font-mono">Annual Rate (%)</span>
                    <input
                      type="number"
                      step="0.1"
                      value={swpRate}
                      onChange={(e) => setSwpRate(Number(e.target.value) || 0)}
                      className="w-full bg-[#181820] border border-[#262633] rounded px-3 py-2 font-mono text-sm text-zinc-100"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-xs text-zinc-400 font-mono">Duration (Years)</span>
                    <input
                      type="number"
                      value={swpYears}
                      onChange={(e) => setSwpYears(Number(e.target.value) || 0)}
                      className="w-full bg-[#181820] border border-[#262633] rounded px-3 py-2 font-mono text-sm text-zinc-100"
                    />
                  </div>
                </div>
              </div>

              <div className="md:col-span-5 bg-[#0f0f13] border border-[#1e1e27] rounded-xl p-5 flex flex-col justify-between space-y-6">
                <div>
                  <span className="text-xs font-mono uppercase tracking-widest text-zinc-500">Remaining Balance</span>
                  <div className="text-3xl font-mono font-bold text-emerald-400 tracking-tight mt-1">
                    {inr(swpCalcs.balance)}
                  </div>
                  {swpCalcs.exhaustedMonth && (
                    <div className="mt-3 p-3 bg-rose-500/10 border border-rose-500/20 rounded text-xs font-mono text-rose-400">
                      Depleted in Month {swpCalcs.exhaustedMonth} ({(swpCalcs.exhaustedMonth / 12).toFixed(1)} yrs)
                    </div>
                  )}
                </div>

                <div className="space-y-3 font-mono">
                  <div className="p-3 bg-[#15151c] border border-[#22222e] rounded-lg flex justify-between items-center">
                    <span className="text-xs text-zinc-400">Total Money Received</span>
                    <span className="text-sm font-semibold text-zinc-100">{inr(swpCalcs.withdrawn)}</span>
                  </div>
                  <div className="p-3 bg-[#15151c] border border-[#22222e] rounded-lg flex justify-between items-center">
                    <span className="text-xs text-zinc-400">Initial Corpus</span>
                    <span className="text-sm font-semibold text-zinc-400">{inr(swpCalcs.corpus)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* FD */}
          {activeTool === "fd" && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              <div className="md:col-span-7 bg-[#0f0f13] border border-[#1e1e27] rounded-xl p-5 space-y-5">
                <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-emerald-400">
                  Fixed Deposit (Compounded)
                </h2>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-400 font-mono">Deposit Principal</span>
                    <div className="flex items-center bg-[#181820] border border-[#262633] rounded px-3 py-1">
                      <span className="text-xs text-zinc-500 mr-1">₹</span>
                      <input
                        type="number"
                        value={fdDeposit}
                        onChange={(e) => setFdDeposit(Number(e.target.value) || 0)}
                        className="w-28 bg-transparent text-right font-mono font-semibold text-zinc-100 text-sm focus:outline-none"
                      />
                    </div>
                  </div>
                  <input
                    type="range"
                    min={10000}
                    max={5000000}
                    step={10000}
                    value={fdDeposit}
                    onChange={(e) => setFdDeposit(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <span className="text-xs text-zinc-400 font-mono">FD Interest Rate (%)</span>
                    <input
                      type="number"
                      step="0.05"
                      value={fdRate}
                      onChange={(e) => setFdRate(Number(e.target.value) || 0)}
                      className="w-full bg-[#181820] border border-[#262633] rounded px-3 py-2 font-mono text-sm text-zinc-100"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-xs text-zinc-400 font-mono">Tenure (Years)</span>
                    <input
                      type="number"
                      value={fdYears}
                      onChange={(e) => setFdYears(Number(e.target.value) || 0)}
                      className="w-full bg-[#181820] border border-[#262633] rounded px-3 py-2 font-mono text-sm text-zinc-100"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs text-zinc-400 font-mono">Compounding Schedule</span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Quarterly", val: 4 },
                      { label: "Monthly", val: 12 },
                      { label: "Annually", val: 1 },
                    ].map((f) => (
                      <button
                        key={f.val}
                        onClick={() => setFdCompounding(f.val)}
                        className={`py-1.5 text-xs font-mono rounded border ${
                          fdCompounding === f.val
                            ? "bg-emerald-500/10 border-emerald-400 text-emerald-400 font-bold"
                            : "bg-[#181820] border-[#262633] text-zinc-400"
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="md:col-span-5 bg-[#0f0f13] border border-[#1e1e27] rounded-xl p-5 flex flex-col justify-between space-y-6">
                <div>
                  <span className="text-xs font-mono uppercase tracking-widest text-zinc-500">Maturity Proceeds</span>
                  <div className="text-3xl lg:text-4xl font-mono font-bold text-emerald-400 tracking-tight mt-1">
                    {inr(fdCalcs.maturity)}
                  </div>
                </div>

                <div className="space-y-3 font-mono">
                  <div className="p-3 bg-[#15151c] border border-[#22222e] rounded-lg flex justify-between items-center">
                    <span className="text-xs text-zinc-400">Principal Locked</span>
                    <span className="text-sm font-semibold text-zinc-200">{inr(fdCalcs.principal)}</span>
                  </div>
                  <div className="p-3 bg-[#15151c] border border-[#22222e] rounded-lg flex justify-between items-center">
                    <span className="text-xs text-zinc-400">Guaranteed Interest</span>
                    <span className="text-sm font-semibold text-emerald-400">+{inr(fdCalcs.interest)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SALARY */}
          {activeTool === "salary" && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              <div className="md:col-span-7 bg-[#0f0f13] border border-[#1e1e27] rounded-xl p-5 space-y-5">
                <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-emerald-400">
                  Annual CTC to Take-Home
                </h2>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-400 font-mono">Annual CTC</span>
                    <div className="flex items-center bg-[#181820] border border-[#262633] rounded px-3 py-1">
                      <span className="text-xs text-zinc-500 mr-1">₹</span>
                      <input
                        type="number"
                        value={ctcAnnual}
                        onChange={(e) => setCtcAnnual(Number(e.target.value) || 0)}
                        className="w-28 bg-transparent text-right font-mono font-semibold text-zinc-100 text-sm focus:outline-none"
                      />
                    </div>
                  </div>
                  <input
                    type="range"
                    min={200000}
                    max={10000000}
                    step={50000}
                    value={ctcAnnual}
                    onChange={(e) => setCtcAnnual(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <span className="text-xs text-zinc-400 font-mono">Annual Variable/Bonus</span>
                    <input
                      type="number"
                      value={bonusAnnual}
                      onChange={(e) => setBonusAnnual(Number(e.target.value) || 0)}
                      className="w-full bg-[#181820] border border-[#262633] rounded px-3 py-2 font-mono text-sm text-zinc-100"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-xs text-zinc-400 font-mono">Monthly Professional Tax</span>
                    <input
                      type="number"
                      value={professionalTax}
                      onChange={(e) => setProfessionalTax(Number(e.target.value) || 0)}
                      className="w-full bg-[#181820] border border-[#262633] rounded px-3 py-2 font-mono text-sm text-zinc-100"
                    />
                  </div>
                </div>
              </div>

              <div className="md:col-span-5 bg-[#0f0f13] border border-[#1e1e27] rounded-xl p-5 flex flex-col justify-between space-y-6">
                <div>
                  <span className="text-xs font-mono uppercase tracking-widest text-zinc-500">Net Take-Home (Monthly)</span>
                  <div className="text-3xl lg:text-4xl font-mono font-bold text-emerald-400 tracking-tight mt-1">
                    {inr(salaryCalcs.inHandMonthly)}
                  </div>
                  <span className="text-xs font-mono text-zinc-500 block mt-1">
                    Annual In-Hand (incl. bonus): {inr(salaryCalcs.annualInHand)}
                  </span>
                </div>

                <div className="space-y-2 font-mono text-xs">
                  <div className="p-2.5 bg-[#15151c] border border-[#22222e] rounded flex justify-between">
                    <span className="text-zinc-400">Monthly Gross</span>
                    <span className="text-zinc-200">{inr(salaryCalcs.monthlyGross)}</span>
                  </div>
                  <div className="p-2.5 bg-[#15151c] border border-[#22222e] rounded flex justify-between">
                    <span className="text-rose-400/80">Employee PF (12%)</span>
                    <span className="text-rose-400">-{inr(salaryCalcs.monthlyEpfc)}</span>
                  </div>
                  <div className="p-2.5 bg-[#15151c] border border-[#22222e] rounded flex justify-between">
                    <span className="text-rose-400/80">Monthly TDS</span>
                    <span className="text-rose-400">-{inr(salaryCalcs.monthlyTds)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* INCOME TAX */}
          {activeTool === "incometax" && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              <div className="md:col-span-7 bg-[#0f0f13] border border-[#1e1e27] rounded-xl p-5 space-y-5">
                <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-emerald-400">
                  Income Tax: New vs Old Regime
                </h2>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-400 font-mono">Gross Taxable Income</span>
                    <div className="flex items-center bg-[#181820] border border-[#262633] rounded px-3 py-1">
                      <span className="text-xs text-zinc-500 mr-1">₹</span>
                      <input
                        type="number"
                        value={taxableIncome}
                        onChange={(e) => setTaxableIncome(Number(e.target.value) || 0)}
                        className="w-28 bg-transparent text-right font-mono font-semibold text-zinc-100 text-sm focus:outline-none"
                      />
                    </div>
                  </div>
                  <input
                    type="range"
                    min={300000}
                    max={5000000}
                    step={50000}
                    value={taxableIncome}
                    onChange={(e) => setTaxableIncome(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <span className="text-[11px] text-zinc-400 font-mono">Sec 80C</span>
                    <input
                      type="number"
                      value={deductions80C}
                      onChange={(e) => setDeductions80C(Number(e.target.value) || 0)}
                      className="w-full bg-[#181820] border border-[#262633] rounded p-2 text-xs font-mono text-zinc-100"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] text-zinc-400 font-mono">Sec 80D</span>
                    <input
                      type="number"
                      value={deductions80D}
                      onChange={(e) => setDeductions80D(Number(e.target.value) || 0)}
                      className="w-full bg-[#181820] border border-[#262633] rounded p-2 text-xs font-mono text-zinc-100"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] text-zinc-400 font-mono">HRA Exemption</span>
                    <input
                      type="number"
                      value={deductionsHra}
                      onChange={(e) => setDeductionsHra(Number(e.target.value) || 0)}
                      className="w-full bg-[#181820] border border-[#262633] rounded p-2 text-xs font-mono text-zinc-100"
                    />
                  </div>
                </div>
              </div>

              <div className="md:col-span-5 bg-[#0f0f13] border border-[#1e1e27] rounded-xl p-5 flex flex-col justify-between space-y-6">
                <div>
                  <span className="text-xs font-mono uppercase tracking-widest text-zinc-500">Tax Recommendation</span>
                  <div className="text-2xl font-mono font-bold text-emerald-400 mt-1">
                    {taxCalcs.recommended} Saves {inr(taxCalcs.savings)}
                  </div>
                </div>

                <div className="space-y-3 font-mono">
                  <div className={`p-4 rounded-lg border ${
                    taxCalcs.recommended === "New Regime"
                      ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300"
                      : "bg-[#15151c] border-[#22222e] text-zinc-300"
                  }`}>
                    <div className="text-xs text-zinc-400">New Regime (FY 2025-26)</div>
                    <div className="text-xl font-bold mt-1">{inr(taxCalcs.newTotal)}</div>
                  </div>

                  <div className={`p-4 rounded-lg border ${
                    taxCalcs.recommended === "Old Regime"
                      ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300"
                      : "bg-[#15151c] border-[#22222e] text-zinc-300"
                  }`}>
                    <div className="text-xs text-zinc-400">Old Regime (With Deductions)</div>
                    <div className="text-xl font-bold mt-1">{inr(taxCalcs.oldTotal)}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* GST */}
          {activeTool === "gst" && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              <div className="md:col-span-7 bg-[#0f0f13] border border-[#1e1e27] rounded-xl p-5 space-y-5">
                <div className="flex justify-between items-center">
                  <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-emerald-400">
                    GST Split Calculator
                  </h2>
                  <div className="flex bg-[#181820] p-0.5 rounded border border-[#262633]">
                    <button
                      onClick={() => setGstType("exclusive")}
                      className={`px-2.5 py-1 text-xs font-mono rounded ${
                        gstType === "exclusive" ? "bg-zinc-100 text-zinc-950 font-bold" : "text-zinc-400"
                      }`}
                    >
                      Add GST
                    </button>
                    <button
                      onClick={() => setGstType("inclusive")}
                      className={`px-2.5 py-1 text-xs font-mono rounded ${
                        gstType === "inclusive" ? "bg-zinc-100 text-zinc-950 font-bold" : "text-zinc-400"
                      }`}
                    >
                      Remove GST
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-400 font-mono">Invoice Amount</span>
                    <div className="flex items-center bg-[#181820] border border-[#262633] rounded px-3 py-1">
                      <span className="text-xs text-zinc-500 mr-1">₹</span>
                      <input
                        type="number"
                        value={gstAmount}
                        onChange={(e) => setGstAmount(Number(e.target.value) || 0)}
                        className="w-28 bg-transparent text-right font-mono font-semibold text-zinc-100 text-sm focus:outline-none"
                      />
                    </div>
                  </div>
                  <input
                    type="range"
                    min={100}
                    max={1000000}
                    step={500}
                    value={gstAmount}
                    onChange={(e) => setGstAmount(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <span className="text-xs text-zinc-400 font-mono block">GST Tax Slab</span>
                  <div className="grid grid-cols-4 gap-2">
                    {INDIA_GST_RATES.map((slab) => (
                      <button
                        key={slab}
                        onClick={() => setGstRate(slab)}
                        className={`py-2 text-xs font-mono rounded border transition-all ${
                          gstRate === slab
                            ? "bg-emerald-500/10 border-emerald-400 text-emerald-400 font-bold"
                            : "bg-[#181820] border-[#262633] text-zinc-400"
                        }`}
                      >
                        {slab}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="md:col-span-5 bg-[#0f0f13] border border-[#1e1e27] rounded-xl p-5 flex flex-col justify-between space-y-6">
                <div>
                  <span className="text-xs font-mono uppercase tracking-widest text-zinc-500">Gross Invoice Total</span>
                  <div className="text-3xl font-mono font-bold text-emerald-400 tracking-tight mt-1">
                    {inr2(gstCalcs.total)}
                  </div>
                </div>

                <div className="space-y-2 font-mono text-xs">
                  <div className="p-3 bg-[#15151c] border border-[#22222e] rounded flex justify-between">
                    <span className="text-zinc-400">Net Base Cost</span>
                    <span className="text-zinc-200">{inr2(gstCalcs.net)}</span>
                  </div>
                  <div className="p-3 bg-[#15151c] border border-[#22222e] rounded flex justify-between">
                    <span className="text-emerald-400">Total GST ({gstRate}%)</span>
                    <span className="text-emerald-400 font-semibold">{inr2(gstCalcs.tax)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="p-2 bg-[#181820] border border-[#262633] rounded">
                      <span className="text-zinc-500 text-[10px] block">CGST ({gstRate / 2}%)</span>
                      <span className="text-zinc-300">{inr2(gstCalcs.cgst)}</span>
                    </div>
                    <div className="p-2 bg-[#181820] border border-[#262633] rounded">
                      <span className="text-zinc-500 text-[10px] block">SGST ({gstRate / 2}%)</span>
                      <span className="text-zinc-300">{inr2(gstCalcs.sgst)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* EMI */}
          {activeTool === "emi" && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              <div className="md:col-span-7 bg-[#0f0f13] border border-[#1e1e27] rounded-xl p-5 space-y-5">
                <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-emerald-400">
                  Loan Repayment & EMI
                </h2>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-400 font-mono">Principal Amount</span>
                    <div className="flex items-center bg-[#181820] border border-[#262633] rounded px-3 py-1">
                      <span className="text-xs text-zinc-500 mr-1">₹</span>
                      <input
                        type="number"
                        value={loanPrincipal}
                        onChange={(e) => setLoanPrincipal(Number(e.target.value) || 0)}
                        className="w-28 bg-transparent text-right font-mono font-semibold text-zinc-100 text-sm focus:outline-none"
                      />
                    </div>
                  </div>
                  <input
                    type="range"
                    min={50000}
                    max={20000000}
                    step={50000}
                    value={loanPrincipal}
                    onChange={(e) => setLoanPrincipal(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-400 font-mono">Interest Rate (p.a.)</span>
                    <div className="flex items-center bg-[#181820] border border-[#262633] rounded px-3 py-1">
                      <input
                        type="number"
                        step="0.05"
                        value={loanRate}
                        onChange={(e) => setLoanRate(Number(e.target.value) || 0)}
                        className="w-16 bg-transparent text-right font-mono font-semibold text-emerald-400 text-sm focus:outline-none"
                      />
                      <span className="text-xs text-zinc-500 ml-1">%</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={24}
                    step={0.1}
                    value={loanRate}
                    onChange={(e) => setLoanRate(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-400 font-mono">Tenure (Years)</span>
                    <div className="flex items-center bg-[#181820] border border-[#262633] rounded px-3 py-1">
                      <input
                        type="number"
                        value={loanYears}
                        onChange={(e) => setLoanYears(Number(e.target.value) || 0)}
                        className="w-14 bg-transparent text-right font-mono font-semibold text-zinc-100 text-sm focus:outline-none"
                      />
                      <span className="text-xs text-zinc-500 ml-1">Yr</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={30}
                    step={1}
                    value={loanYears}
                    onChange={(e) => setLoanYears(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="md:col-span-5 bg-[#0f0f13] border border-[#1e1e27] rounded-xl p-5 flex flex-col justify-between space-y-6">
                <div>
                  <span className="text-xs font-mono uppercase tracking-widest text-zinc-500">Monthly EMI Due</span>
                  <div className="text-3xl lg:text-4xl font-mono font-bold text-emerald-400 tracking-tight mt-1">
                    {inr(emiCalcs.emi)}
                  </div>
                </div>

                <div className="space-y-3 font-mono">
                  <div className="p-3 bg-[#15151c] border border-[#22222e] rounded-lg flex justify-between items-center">
                    <span className="text-xs text-zinc-400">Total Interest</span>
                    <span className="text-sm font-semibold text-rose-400">+{inr(emiCalcs.totalInterest)}</span>
                  </div>
                  <div className="p-3 bg-[#15151c] border border-[#22222e] rounded-lg flex justify-between items-center">
                    <span className="text-xs text-zinc-400">Total Principal + Interest</span>
                    <span className="text-sm font-semibold text-zinc-100">{inr(emiCalcs.total)}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="h-2 w-full bg-[#1e1e27] rounded-full overflow-hidden flex">
                    <div className="bg-zinc-500" style={{ width: `${emiCalcs.principalShare * 100}%` }} />
                    <div className="bg-rose-400" style={{ width: `${(1 - emiCalcs.principalShare) * 100}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                    <span>Principal {(emiCalcs.principalShare * 100).toFixed(0)}%</span>
                    <span>Interest {((1 - emiCalcs.principalShare) * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* LOAN COMPARE */}
          {activeTool === "loancompare" && (
            <div className="space-y-5">
              <div className="bg-[#0f0f13] border border-[#1e1e27] rounded-xl p-5">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-zinc-400 font-mono">Loan Amount for Comparison</span>
                  <div className="flex items-center bg-[#181820] border border-[#262633] rounded px-3 py-1">
                    <span className="text-xs text-zinc-500 mr-1">₹</span>
                    <input
                      type="number"
                      value={cmpLoanAmount}
                      onChange={(e) => setCmpLoanAmount(Number(e.target.value) || 0)}
                      className="w-28 bg-transparent text-right font-mono font-semibold text-zinc-100 text-sm focus:outline-none"
                    />
                  </div>
                </div>
                <input
                  type="range"
                  min={100000}
                  max={20000000}
                  step={100000}
                  value={cmpLoanAmount}
                  onChange={(e) => setCmpLoanAmount(Number(e.target.value))}
                  className="w-full mt-2"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="bg-[#0f0f13] border border-[#1e1e27] rounded-xl p-5 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono font-bold text-blue-400">OFFER / BANK A</span>
                    <div className="flex items-center space-x-1">
                      <input
                        type="number"
                        step="0.05"
                        value={bankARate}
                        onChange={(e) => setBankARate(Number(e.target.value) || 0)}
                        className="w-16 bg-[#181820] border border-[#262633] rounded p-1 font-mono text-sm text-blue-400 text-right"
                      />
                      <span className="text-xs text-zinc-500 font-mono">%</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] text-zinc-400 font-mono">Tenure (Years)</span>
                    <input
                      type="number"
                      value={bankAYears}
                      onChange={(e) => setBankAYears(Number(e.target.value) || 0)}
                      className="w-full bg-[#181820] border border-[#262633] rounded p-1.5 font-mono text-xs text-zinc-100"
                    />
                  </div>
                  <div className="p-3 bg-[#14141a] rounded border border-[#20202a] font-mono space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-400">Monthly EMI:</span>
                      <span className="font-bold text-zinc-100">{inr(loanCompareCalcs.emiA)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-400">Total Interest:</span>
                      <span className="text-rose-400">{inr(loanCompareCalcs.interestA)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#0f0f13] border border-[#1e1e27] rounded-xl p-5 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono font-bold text-emerald-400">OFFER / BANK B</span>
                    <div className="flex items-center space-x-1">
                      <input
                        type="number"
                        step="0.05"
                        value={bankBRate}
                        onChange={(e) => setBankBRate(Number(e.target.value) || 0)}
                        className="w-16 bg-[#181820] border border-[#262633] rounded p-1 font-mono text-sm text-emerald-400 text-right"
                      />
                      <span className="text-xs text-zinc-500 font-mono">%</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] text-zinc-400 font-mono">Tenure (Years)</span>
                    <input
                      type="number"
                      value={bankBYears}
                      onChange={(e) => setBankBYears(Number(e.target.value) || 0)}
                      className="w-full bg-[#181820] border border-[#262633] rounded p-1.5 font-mono text-xs text-zinc-100"
                    />
                  </div>
                  <div className="p-3 bg-[#14141a] rounded border border-[#20202a] font-mono space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-400">Monthly EMI:</span>
                      <span className="font-bold text-zinc-100">{inr(loanCompareCalcs.emiB)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-400">Total Interest:</span>
                      <span className="text-rose-400">{inr(loanCompareCalcs.interestB)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 bg-[#0f0f13] border border-[#1e1e27] rounded-xl text-center">
                <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Cost Comparison</span>
                <div className="text-2xl md:text-3xl font-mono font-bold text-emerald-400 mt-1">
                  {loanCompareCalcs.cheaperBank} saves {inr(loanCompareCalcs.interestDifference)}
                </div>
                <p className="text-xs font-mono text-zinc-400 mt-1">
                  EMI difference: {inr(loanCompareCalcs.emiDifference)}/month.
                </p>
              </div>
            </div>
          )}

          {/* INFLATION */}
          {activeTool === "inflation" && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              <div className="md:col-span-7 bg-[#0f0f13] border border-[#1e1e27] rounded-xl p-5 space-y-5">
                <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-emerald-400">
                  Purchasing Power Reality
                </h2>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-400 font-mono">Current Monthly Household Expense</span>
                    <div className="flex items-center bg-[#181820] border border-[#262633] rounded px-3 py-1">
                      <span className="text-xs text-zinc-500 mr-1">₹</span>
                      <input
                        type="number"
                        value={currentExpense}
                        onChange={(e) => setCurrentExpense(Number(e.target.value) || 0)}
                        className="w-24 bg-transparent text-right font-mono font-semibold text-zinc-100 text-sm focus:outline-none"
                      />
                    </div>
                  </div>
                  <input
                    type="range"
                    min={10000}
                    max={500000}
                    step={5000}
                    value={currentExpense}
                    onChange={(e) => setCurrentExpense(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <span className="text-xs text-zinc-400 font-mono">Inflation Rate (%)</span>
                    <input
                      type="number"
                      step="0.1"
                      value={inflationRate}
                      onChange={(e) => setInflationRate(Number(e.target.value) || 0)}
                      className="w-full bg-[#181820] border border-[#262633] rounded px-3 py-2 font-mono text-sm text-zinc-100"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-xs text-zinc-400 font-mono">Years into Future</span>
                    <input
                      type="number"
                      value={inflationHorizon}
                      onChange={(e) => setInflationHorizon(Number(e.target.value) || 0)}
                      className="w-full bg-[#181820] border border-[#262633] rounded px-3 py-2 font-mono text-sm text-zinc-100"
                    />
                  </div>
                </div>
              </div>

              <div className="md:col-span-5 bg-[#0f0f13] border border-[#1e1e27] rounded-xl p-5 flex flex-col justify-between space-y-6">
                <div>
                  <span className="text-xs font-mono uppercase tracking-widest text-zinc-500">Future Monthly Equivalent</span>
                  <div className="text-3xl lg:text-4xl font-mono font-bold text-rose-400 tracking-tight mt-1">
                    {inr(inflationCalcs.futureMonthly)}
                  </div>
                  <span className="text-xs font-mono text-zinc-500 block mt-1">
                    Requires {inflationCalcs.multiplier.toFixed(2)}x of today&apos;s cost to survive identically.
                  </span>
                </div>

                <div className="p-4 bg-[#15151c] border border-[#22222e] rounded-lg font-mono text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Current Annual Outflow:</span>
                    <span className="text-zinc-200">{inr(inflationCalcs.currentAnnual)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Future Annual Outflow:</span>
                    <span className="text-zinc-200">{inr(inflationCalcs.futureAnnual)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-[#22222e]">
                    <span className="text-zinc-500">₹100 Purchasing Power drops to:</span>
                    <span className="text-emerald-400 font-bold">₹{inflationCalcs.erodedValue.toFixed(1)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* FIRE */}
          {activeTool === "fire" && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              <div className="md:col-span-7 bg-[#0f0f13] border border-[#1e1e27] rounded-xl p-5 space-y-5">
                <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-emerald-400">
                  FIRE Financial Independence
                </h2>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-400 font-mono">Annual Living Expenses</span>
                    <div className="flex items-center bg-[#181820] border border-[#262633] rounded px-3 py-1">
                      <span className="text-xs text-zinc-500 mr-1">₹</span>
                      <input
                        type="number"
                        value={fireAnnualExpense}
                        onChange={(e) => setFireAnnualExpense(Number(e.target.value) || 0)}
                        className="w-28 bg-transparent text-right font-mono font-semibold text-zinc-100 text-sm focus:outline-none"
                      />
                    </div>
                  </div>
                  <input
                    type="range"
                    min={200000}
                    max={5000000}
                    step={50000}
                    value={fireAnnualExpense}
                    onChange={(e) => setFireAnnualExpense(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <span className="text-xs text-zinc-400 font-mono">Current Existing Savings</span>
                    <input
                      type="number"
                      value={fireCurrentSavings}
                      onChange={(e) => setFireCurrentSavings(Number(e.target.value) || 0)}
                      className="w-full bg-[#181820] border border-[#262633] rounded px-3 py-2 font-mono text-sm text-zinc-100"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-xs text-zinc-400 font-mono">Monthly Saving Capacity</span>
                    <input
                      type="number"
                      value={fireMonthlySaving}
                      onChange={(e) => setFireMonthlySaving(Number(e.target.value) || 0)}
                      className="w-full bg-[#181820] border border-[#262633] rounded px-3 py-2 font-mono text-sm text-zinc-100"
                    />
                  </div>

                  <div className="space-y-1.5 col-span-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-zinc-400 font-mono">Expected Return (p.a.)</span>
                      <span className="text-xs font-mono font-semibold text-zinc-100">{fireReturnRate}%</span>
                    </div>
                    <input
                      type="range"
                      aria-label="Expected Return (p.a.)"
                      min={4}
                      max={18}
                      step={0.5}
                      value={fireReturnRate}
                      onChange={(e) => setFireReturnRate(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              <div className="md:col-span-5 bg-[#0f0f13] border border-[#1e1e27] rounded-xl p-5 flex flex-col justify-between space-y-6">
                <div>
                  <span className="text-xs font-mono uppercase tracking-widest text-zinc-500">Freedom Horizon</span>
                  <div className="text-3xl lg:text-4xl font-mono font-bold text-emerald-400 tracking-tight mt-1">
                    {fireCalcs.yearsToFire === null ? "50+" : fireCalcs.yearsToFire} Years
                  </div>
                  <span className="text-xs font-mono text-zinc-500 block mt-1">
                    To reach complete self-sustaining wealth
                  </span>
                </div>

                <div className="p-4 bg-[#15151c] border border-[#22222e] rounded-lg font-mono text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Target FIRE Corpus (25x):</span>
                    <span className="text-emerald-400 font-bold">{inr(fireCalcs.targetCorpus)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Safe Annual Withdrawal:</span>
                    <span className="text-zinc-200">{inr(fireAnnualExpense)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MONETIZATION SPONSOR UNIT */}
          <div className="w-full bg-[#0a0a0d] border border-[#1a1a24] rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase bg-[#181822] text-zinc-500 border border-[#262636]">
                SPONSORED
              </span>
              <span className="text-xs font-mono text-zinc-400">
                Compare direct mutual funds & zero-brokerage Demat accounts
              </span>
            </div>
            <button className="px-3 py-1 rounded text-xs font-mono bg-[#14141c] hover:bg-[#1a1a24] text-emerald-400 border border-[#222230] transition-colors">
              Explore →
            </button>
          </div>

        </div>
      </main>

      {/* 3. STATIC CATEGORICAL BOTTOM DOCK */}
      <footer className="shrink-0 bg-[#0a0a0d] border-t border-[#1b1b24] safe-bottom z-30">
        <div className="flex justify-around items-center max-w-lg mx-auto py-2">
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => handleCategorySwitch(cat.id)}
                className="flex flex-col items-center justify-center flex-1 py-1 transition-all"
              >
                <span
                  className={`text-xs font-mono transition-colors ${
                    isActive ? "text-emerald-400 font-bold" : "text-zinc-500"
                  }`}
                >
                  {cat.icon}
                </span>
                <span
                  className={`text-[10px] font-mono mt-0.5 tracking-tight ${
                    isActive ? "text-zinc-100 font-bold" : "text-zinc-500"
                  }`}
                >
                  {cat.label}
                </span>
              </button>
            );
          })}
        </div>
      </footer>

    </div>
  );
}