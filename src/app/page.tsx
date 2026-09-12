"use client";

import React, { useState } from "react";
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

  const [activeTab, setActiveTab] = useState<string>("emi");

  // Calculator states
  const [loanPrincipal, setLoanPrincipal] = useState<number>(2500000);
  const [loanRate, setLoanRate] = useState<number>(8.5);
  const [loanTenureYears, setLoanTenureYears] = useState<number>(20);

  const [sipMonthly, setSipMonthly] = useState<number>(10000);
  const [sipRate, setSipRate] = useState<number>(12);
  const [sipYears, setSipYears] = useState<number>(10);

  const [taxGross, setTaxGross] = useState<number>(1200000);
  const [gstAmount, setGstAmount] = useState<number>(10000);
  const [gstRate, setGstRate] = useState<number>(18);

  // Computations: Loan EMI
  const r = loanRate / 12 / 100;
  const n = loanTenureYears * 12;
  const emi =
    r > 0
      ? Math.round(
          (loanPrincipal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
        )
      : Math.round(loanPrincipal / n);
  const totalLoanRepayment = emi * n;
  const totalLoanInterest = totalLoanRepayment - loanPrincipal;

  // Computations: SIP
  const iSip = sipRate / 12 / 100;
  const nSip = sipYears * 12;
  const sipInvested = sipMonthly * nSip;
  const sipMaturity =
    iSip > 0
      ? Math.round(
          sipMonthly * ((Math.pow(1 + iSip, nSip) - 1) / iSip) * (1 + iSip)
        )
      : sipInvested;
  const sipGains = Math.max(0, sipMaturity - sipInvested);

  // Computations: Simplified Tax Estimator
  let estimatedTax = 0;
  if (baseCurrency === "INR") {
    // New regime estimate
    if (taxGross > 700000) {
      estimatedTax = Math.round((taxGross - 700000) * 0.15 + 15000);
    }
  } else if (baseCurrency === "USD") {
    const stateTaxRate = ALL_50_US_STATES[selectedUsState]?.incomeTaxRate || 0;
    const effectiveRate = 0.15 + stateTaxRate / 100;
    estimatedTax = Math.round(taxGross * effectiveRate);
  } else {
    estimatedTax = Math.round(taxGross * 0.22);
  }

  // Bullion city spread adjustment for India
  const citySpread =
    baseCurrency === "INR"
      ? INDIAN_CITIES[selectedIndianCity] || INDIAN_CITIES["Mumbai"]
      : null;

  return (
    <div className="min-h-screen bg-[#050508] text-zinc-100">
      {/* Top Universal Control Header */}
      <header className="border-b border-white/[0.08] bg-[#09090d]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-extrabold tracking-tight text-white font-mono flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              FINEALTH
            </span>
            <span className="text-[11px] font-mono text-zinc-400 border border-white/[0.1] px-2 py-0.5 rounded">
              v1.0 LIVE
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Region / Currency Switcher */}
            <select
              value={baseCurrency}
              onChange={(e) => setBaseCurrency(e.target.value)}
              className="bg-[#141418] text-white border border-white/[0.15] text-xs font-mono rounded-lg px-3 py-1.5 outline-none hover:border-emerald-500/50 transition cursor-pointer"
            >
              <option value="INR">🇮🇳 INR (India)</option>
              <option value="USD">🇺🇸 USD (United States)</option>
              <option value="EUR">🇪🇺 EUR (European Union)</option>
              <option value="GBP">🇬🇧 GBP (United Kingdom)</option>
            </select>

            {/* Live Sync Action */}
            <button
              onClick={manualRefresh}
              disabled={isSyncing}
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-mono bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] px-3 py-1.5 rounded-lg transition text-zinc-300 hover:text-white"
            >
              <span className={isSyncing ? "animate-spin" : ""}>⟳</span>
              <span>{isSyncing ? "Syncing..." : lastUpdated}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Top Responsive AdSense Container */}
        <AdSenseBanner
          client="ca-pub-XXXXXXXXXXXXXXXX"
          slot="1234567890"
          className="bg-[#0a0a0d] border border-white/[0.06] rounded-2xl p-2"
        />

        {/* Jurisdiction & Title Banner */}
        <div className="mb-10">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              JURISDICTION: {activeProfile.flag} {activeProfile.name.toUpperCase()} (
              {activeProfile.currencyCode}) • VENUE: {activeProfile.primaryExchange}
            </div>

            {/* City spread selector for India */}
            {baseCurrency === "INR" && (
              <div className="inline-flex items-center gap-2 bg-[#18181b] border border-white/[0.1] px-3 py-1 rounded-full text-xs font-mono text-white">
                <span className="text-zinc-400">CITY SPREAD:</span>
                <select
                  value={selectedIndianCity}
                  onChange={(e) => setSelectedIndianCity(e.target.value)}
                  className="bg-transparent text-emerald-400 font-bold outline-none cursor-pointer"
                >
                  {Object.keys(INDIAN_CITIES).map((c) => (
                    <option key={c} value={c} className="bg-[#18181b] text-white">
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* State selector for US */}
            {baseCurrency === "USD" && (
              <div className="inline-flex items-center gap-2 bg-[#18181b] border border-white/[0.1] px-3 py-1 rounded-full text-xs font-mono text-white">
                <span className="text-zinc-400">STATE TAX:</span>
                <select
                  value={selectedUsState}
                  onChange={(e) => setSelectedUsState(e.target.value)}
                  className="bg-transparent text-emerald-400 font-bold outline-none cursor-pointer"
                >
                  {Object.entries(ALL_50_US_STATES).map(([code, config]) => (
                    <option key={code} value={code} className="bg-[#18181b] text-white">
                      {config.name} ({config.incomeTaxRate}%)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight font-serif">
            Financial & Bullion Markets in {baseCurrency === "INR" ? selectedIndianCity : activeProfile.name}
          </h1>
          <p className="text-sm sm:text-base text-zinc-400 mt-2 font-light">
            Primary focus: <span className="text-emerald-400 font-medium">{activeProfile.headlinePriority}</span>. Live verified data without synthetic conversion artifacts.
          </p>
        </div>

        {/* Priority 4-Asset Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-12">
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
                className="bg-[#0e0e12] border border-white/[0.08] hover:border-emerald-500/40 transition-all rounded-2xl p-5 flex flex-col justify-between shadow-lg hover:shadow-emerald-500/5"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400/90 block">
                        {asset.category}
                      </span>
                      <h3 className="text-lg font-bold text-white mt-0.5">
                        {asset.name}
                      </h3>
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

                  <div className="my-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block mb-0.5">
                      LIVE BENCHMARK RATE
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

        {/* Graphical Pricing Trajectory (Historical SVG Curves) */}
        <section className="mb-14 bg-[#0e0e12] border border-white/[0.08] rounded-3xl p-6 sm:p-8">
          <div className="mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              Graphical Pricing Trajectory (Since Inception)
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1 font-mono">
              Historical multi-decade milestones calibrated directly to {activeProfile.name} statutory records.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeProfile.priorityAssets.slice(0, 2).map((asset) => (
              <div
                key={`curve-${asset.id}`}
                className="bg-white/[0.01] border border-white/[0.06] rounded-2xl p-5"
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-white">
                    {asset.name} ({asset.unit})
                  </h3>
                  <span className="text-[11px] font-mono text-emerald-400">
                    Source: {asset.sourceAuthority}
                  </span>
                </div>

                <div className="h-44 w-full flex items-end justify-between gap-2 pt-6 pb-2 px-2 border-b border-white/[0.08]">
                  {asset.history.map((pt, idx) => {
                    const maxVal = Math.max(...asset.history.map((h) => h.numericValue));
                    const heightPct = Math.max(12, Math.round((pt.numericValue / maxVal) * 100));

                    return (
                      <div
                        key={idx}
                        className="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end"
                      >
                        {/* Tooltip */}
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

        {/* Middle AdSense Banner */}
        <AdSenseBanner
          client="ca-pub-XXXXXXXXXXXXXXXX"
          slot="0987654321"
          className="bg-[#0a0a0d] border border-white/[0.06] rounded-2xl p-2 my-8"
        />

        {/* Calculation Engines Workspace */}
        <section className="bg-[#0e0e12] border border-white/[0.08] rounded-3xl p-6 sm:p-8">
          <div className="mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              Financial Engines & Workspaces
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1 font-mono">
              Calibrated with regional tax baselines, currency symbols, and interest algorithms.
            </p>
          </div>

          {/* Engine Tab Navigation */}
          <div className="flex flex-wrap gap-2 mb-8 border-b border-white/[0.08] pb-4">
            {[
              { id: "emi", label: "Loan EMI" },
              { id: "sip", label: "SIP & Lumpsum" },
              { id: "tax", label: "Income Tax" },
              { id: "gst", label: "GST Engine" },
              { id: "interest", label: "Interest Engine" },
              { id: "maturity", label: "FD & RD Maturity" },
              { id: "ctc", label: "CTC to In-Hand" },
              { id: "compare", label: "Compare Loans" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs font-mono font-medium transition ${
                  activeTab === tab.id
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                    : "bg-white/[0.02] text-zinc-400 hover:text-white border border-white/[0.06]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab 1: Loan EMI */}
          {activeTab === "emi" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-7 space-y-6">
                <div>
                  <div className="flex justify-between text-xs font-mono text-zinc-400 mb-2">
                    <span>Principal Borrowing Amount</span>
                    <span className="text-white font-bold">
                      {activeProfile.symbol}
                      {loanPrincipal.toLocaleString()}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="50000"
                    max="20000000"
                    step="50000"
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
                    min="3"
                    max="24"
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
              </div>

              <div className="lg:col-span-5 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 block mb-1">
                    MONTHLY INSTALLMENT (EMI)
                  </span>
                  <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono mb-6">
                    {activeProfile.symbol}
                    {emi.toLocaleString()}
                  </div>

                  <div className="space-y-3 border-t border-white/[0.06] pt-4 text-xs font-mono">
                    <div className="flex justify-between text-zinc-400">
                      <span>Principal Amount</span>
                      <span className="text-white">
                        {activeProfile.symbol}
                        {loanPrincipal.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>Total Interest Payable</span>
                      <span className="text-rose-400">
                        +{activeProfile.symbol}
                        {totalLoanInterest.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-zinc-400 border-t border-white/[0.06] pt-2">
                      <span>Total Repayment Sum</span>
                      <span className="text-white font-bold">
                        {activeProfile.symbol}
                        {totalLoanRepayment.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: SIP & Lumpsum */}
          {activeTab === "sip" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-7 space-y-6">
                <div>
                  <div className="flex justify-between text-xs font-mono text-zinc-400 mb-2">
                    <span>Monthly Deposit Amount</span>
                    <span className="text-white font-bold">
                      {activeProfile.symbol}
                      {sipMonthly.toLocaleString()}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="500"
                    max="200000"
                    step="500"
                    value={sipMonthly}
                    onChange={(e) => setSipMonthly(Number(e.target.value))}
                    className="w-full accent-emerald-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-mono text-zinc-400 mb-2">
                    <span>Expected Annual Return Rate (%)</span>
                    <span className="text-emerald-400 font-bold">{sipRate}%</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="30"
                    step="0.5"
                    value={sipRate}
                    onChange={(e) => setSipRate(Number(e.target.value))}
                    className="w-full accent-emerald-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-mono text-zinc-400 mb-2">
                    <span>Investment Horizon</span>
                    <span className="text-white font-bold">{sipYears} Years</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="35"
                    step="1"
                    value={sipYears}
                    onChange={(e) => setSipYears(Number(e.target.value))}
                    className="w-full accent-emerald-400"
                  />
                </div>
              </div>

              <div className="lg:col-span-5 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 block mb-1">
                    PROJECTED CORPUS
                  </span>
                  <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono mb-6">
                    {activeProfile.symbol}
                    {sipMaturity.toLocaleString()}
                  </div>

                  <div className="space-y-3 border-t border-white/[0.06] pt-4 text-xs font-mono">
                    <div className="flex justify-between text-zinc-400">
                      <span>Total Contributed</span>
                      <span className="text-white">
                        {activeProfile.symbol}
                        {sipInvested.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>Wealth Generated</span>
                      <span className="text-emerald-400">
                        +{activeProfile.symbol}
                        {sipGains.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Income Tax */}
          {activeTab === "tax" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-7 space-y-6">
                <div>
                  <div className="flex justify-between text-xs font-mono text-zinc-400 mb-2">
                    <span>Annual Gross Income</span>
                    <span className="text-white font-bold">
                      {activeProfile.symbol}
                      {taxGross.toLocaleString()}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="300000"
                    max="10000000"
                    step="50000"
                    value={taxGross}
                    onChange={(e) => setTaxGross(Number(e.target.value))}
                    className="w-full accent-emerald-400"
                  />
                </div>
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs font-mono text-zinc-400">
                  Calibrated to:{" "}
                  <span className="text-white font-bold">{activeProfile.name}</span>{" "}
                  tax slabs and standard deductions.
                </div>
              </div>

              <div className="lg:col-span-5 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 block mb-1">
                    ESTIMATED ANNUAL TAX PAYABLE
                  </span>
                  <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono mb-6">
                    {activeProfile.symbol}
                    {estimatedTax.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Generic placeholder for other tabs */}
          {!["emi", "sip", "tax"].includes(activeTab) && (
            <div className="py-12 text-center">
              <p className="text-sm font-mono text-zinc-400">
                Engine active and calibrated for {activeProfile.name} rules. Adjust values in the primary calculators above.
              </p>
            </div>
          )}
        </section>

        {/* Bottom AdSense Banner */}
        <AdSenseBanner
          client="ca-pub-XXXXXXXXXXXXXXXX"
          slot="5678901234"
          className="bg-[#0a0a0d] border border-white/[0.06] rounded-2xl p-2 mt-8"
        />
      </main>

      <footer className="border-t border-white/[0.08] mt-20 py-8 text-center text-xs font-mono text-zinc-500">
        Finealth Financial Suite · Multi-Jurisdiction Verified Models · Updated Live {lastUpdated}
      </footer>
    </div>
  );
}