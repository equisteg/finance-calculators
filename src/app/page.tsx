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

  // Region-specific tool catalog
  const getToolsForRegion = (region: string) => {
    switch (region) {
      case "USD":
        return [
          { id: "mortgage_us", label: "30-Yr Mortgage & PMI" },
          { id: "retirement_us", label: "401(k) & Roth IRA" },
          { id: "paycheck_us", label: "Federal + State Paycheck" },
          { id: "salestax_us", label: "State & Local Sales Tax" },
        ];
      case "GBP":
        return [
          { id: "isa_uk", label: "Cash & Stocks ISA (£20k Limit)" },
          { id: "sdlt_uk", label: "Stamp Duty (SDLT)" },
          { id: "paye_uk", label: "PAYE Tax & National Insurance" },
          { id: "mortgage_uk", label: "Fixed-Term Repayment" },
        ];
      case "EUR":
        return [
          { id: "vat_eu", label: "EU Harmonized VAT" },
          { id: "euribor_loan", label: "Euribor Variable Mortgage" },
          { id: "savings_eu", label: "Compound Growth Modeler" },
        ];
      case "INR":
      default:
        return [
          { id: "emi_in", label: "Home/Car Loan EMI" },
          { id: "sip_in", label: "Mutual Fund SIP & Step-Up" },
          { id: "tax_in", label: "Income Tax (New vs Old)" },
          { id: "gst_in", label: "GST (CGST + SGST Split)" },
          { id: "fdrd_in", label: "Bank FD & Post Office RD" },
        ];
    }
  };

  const regionalTools = getToolsForRegion(baseCurrency);
  const [activeToolId, setActiveToolId] = useState<string>(regionalTools[0].id);

  // Auto-align default active tab when changing jurisdiction
  React.useEffect(() => {
    const currentTools = getToolsForRegion(baseCurrency);
    setActiveToolId(currentTools[0].id);
  }, [baseCurrency]);

  // Indian city spread calculation
  const citySpread =
    baseCurrency === "INR"
      ? INDIAN_CITIES[selectedIndianCity] || INDIAN_CITIES["Mumbai"]
      : null;

  // Generic computation states
  const [valA, setValA] = useState<number>(2500000);
  const [valB, setValB] = useState<number>(8.5);
  const [valC, setValC] = useState<number>(20);

  // Loan EMI formula
  const rMonth = valB / 12 / 100;
  const nMonths = valC * 12;
  const emiComputed =
    rMonth > 0
      ? Math.round((valA * rMonth * Math.pow(1 + rMonth, nMonths)) / (Math.pow(1 + rMonth, nMonths) - 1))
      : Math.round(valA / nMonths);

  // SIP / 401(k) formula
  const monthlyDeposit = baseCurrency === "INR" ? 10000 : 500;
  const expectedRate = valB / 100 / 12;
  const compoundFuture =
    expectedRate > 0
      ? Math.round(monthlyDeposit * ((Math.pow(1 + expectedRate, nMonths) - 1) / expectedRate) * (1 + expectedRate))
      : monthlyDeposit * nMonths;

  return (
    <div className="min-h-screen bg-[#050508] text-zinc-100">
      {/* Header bar */}
      <header className="border-b border-white/[0.08] bg-[#09090d]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-base font-bold tracking-tight text-white font-mono">
              FINEALTH
            </span>
            <span className="text-[10px] font-mono text-zinc-500 border border-white/[0.08] px-1.5 py-0.5 rounded">
              {activeProfile.currencyCode}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={baseCurrency}
              onChange={(e) => setBaseCurrency(e.target.value)}
              className="bg-[#141418] text-white border border-white/[0.15] text-xs font-mono rounded-lg px-2.5 py-1 outline-none cursor-pointer"
            >
              <option value="INR">🇮🇳 India (INR)</option>
              <option value="USD">🇺🇸 United States (USD)</option>
              <option value="EUR">🇪🇺 Europe (EUR)</option>
              <option value="GBP">🇬🇧 United Kingdom (GBP)</option>
            </select>

            <button
              onClick={manualRefresh}
              disabled={isSyncing}
              className="hidden sm:inline-flex items-center gap-1 text-xs font-mono text-zinc-400 hover:text-white px-2 py-1"
            >
              <span className={isSyncing ? "animate-spin" : ""}>⟳</span>
              <span>{lastUpdated}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Subtle, slim top ad space */}
        <AdSenseBanner client="ca-pub-XXXXXXXXXXXXXXXX" slot="1234567890" />

        {/* Jurisdiction & Title Banner */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {activeProfile.flag} {activeProfile.name} • {activeProfile.primaryExchange}
            </div>

            {baseCurrency === "INR" && (
              <div className="inline-flex items-center gap-1.5 bg-[#18181b] border border-white/[0.08] px-2.5 py-0.5 rounded-full text-xs font-mono text-white">
                <span className="text-zinc-400">City Spread:</span>
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

            {baseCurrency === "USD" && (
              <div className="inline-flex items-center gap-1.5 bg-[#18181b] border border-white/[0.08] px-2.5 py-0.5 rounded-full text-xs font-mono text-white">
                <span className="text-zinc-400">State:</span>
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

          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight font-serif">
            Financial Workspaces & Benchmarks for {baseCurrency === "INR" ? selectedIndianCity : activeProfile.name}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1 font-light">
            Verified domestic models for <span className="text-emerald-400 font-medium">{activeProfile.headlinePriority}</span>.
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
                className="bg-[#0e0e12] border border-white/[0.08] rounded-2xl p-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-1.5">
                    <div>
                      <span className="text-[9px] font-mono uppercase tracking-widest text-emerald-400/90 block">
                        {asset.category}
                      </span>
                      <h3 className="text-base font-bold text-white mt-0.5">
                        {asset.name}
                      </h3>
                      <p className="text-[11px] text-zinc-400 font-mono">{asset.unit}</p>
                    </div>
                    <span
                      className={`text-xs font-mono font-bold ${
                        asset.changePct >= 0 ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {asset.changePct >= 0 ? "▲" : "▼"} {Math.abs(asset.changePct)}%
                    </span>
                  </div>

                  <div className="my-2 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <div className="text-xl font-extrabold text-white font-mono">
                      {formattedVal}
                    </div>
                  </div>
                </div>

                <div className="text-[10px] font-mono text-zinc-500 pt-1.5 border-t border-white/[0.04]">
                  {asset.taxNote}
                </div>
              </div>
            );
          })}
        </section>

        {/* Graphical Trajectory Section */}
        <section className="mb-10 bg-[#0e0e12] border border-white/[0.08] rounded-2xl p-5">
          <div className="mb-4">
            <h2 className="text-lg sm:text-xl font-bold text-white">
              Graphical Pricing Trajectory (Since Inception)
            </h2>
            <p className="text-xs text-zinc-400 font-mono">
              Historical baseline milestones for {activeProfile.name}.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeProfile.priorityAssets.slice(0, 2).map((asset) => (
              <div
                key={`curve-${asset.id}`}
                className="bg-white/[0.01] border border-white/[0.04] rounded-xl p-4"
              >
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-xs font-bold text-white">
                    {asset.name} ({asset.unit})
                  </h3>
                  <span className="text-[10px] font-mono text-emerald-400">
                    {asset.sourceAuthority}
                  </span>
                </div>

                <div className="h-32 w-full flex items-end justify-between gap-2 pt-4 pb-1 px-1 border-b border-white/[0.06]">
                  {asset.history.map((pt, idx) => {
                    const maxVal = Math.max(...asset.history.map((h) => h.numericValue));
                    const heightPct = Math.max(10, Math.round((pt.numericValue / maxVal) * 100));

                    return (
                      <div
                        key={idx}
                        className="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end"
                      >
                        <div className="absolute -top-6 opacity-0 group-hover:opacity-100 transition pointer-events-none bg-zinc-900 border border-white/20 text-[9px] font-mono text-emerald-400 px-1 py-0.5 rounded whitespace-nowrap z-20">
                          {pt.priceFormatted}
                        </div>
                        <div
                          style={{ height: `${heightPct}%` }}
                          className="w-full bg-emerald-500/20 group-hover:bg-emerald-500/40 border-t border-emerald-400 rounded-t transition-all"
                        />
                        <span className="text-[9px] font-mono text-zinc-400 mt-1">
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

        {/* Region-Specific Calculation Tools */}
        <section className="bg-[#0e0e12] border border-white/[0.08] rounded-2xl p-5 sm:p-6">
          <div className="mb-4">
            <h2 className="text-lg sm:text-xl font-bold text-white">
              {activeProfile.name} Specific Tools & Financial Engines
            </h2>
            <p className="text-xs text-zinc-400 font-mono">
              Tailored calculation models calibrated to {activeProfile.name} regulatory standards.
            </p>
          </div>

          {/* Region-Specific Tabs */}
          <div className="flex flex-wrap gap-2 mb-6 border-b border-white/[0.06] pb-3">
            {regionalTools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => setActiveToolId(tool.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition ${
                  activeToolId === tool.id
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-semibold"
                    : "bg-white/[0.02] text-zinc-400 hover:text-white border border-white/[0.04]"
                }`}
              >
                {tool.label}
              </button>
            ))}
          </div>

          {/* Tool 1: Loan / Mortgage Engine */}
          {(activeToolId === "emi_in" || activeToolId === "mortgage_us" || activeToolId === "mortgage_uk" || activeToolId === "euribor_loan") && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-mono text-zinc-400 mb-1">
                    <span>Borrowing Principal</span>
                    <span className="text-white font-bold">
                      {activeProfile.symbol}{valA.toLocaleString()}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={baseCurrency === "INR" ? 500000 : 50000}
                    max={baseCurrency === "INR" ? 20000000 : 1500000}
                    step={baseCurrency === "INR" ? 50000 : 5000}
                    value={valA}
                    onChange={(e) => setValA(Number(e.target.value))}
                    className="w-full accent-emerald-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-mono text-zinc-400 mb-1">
                    <span>Interest Rate (%)</span>
                    <span className="text-emerald-400 font-bold">{valB}%</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="18"
                    step="0.1"
                    value={valB}
                    onChange={(e) => setValB(Number(e.target.value))}
                    className="w-full accent-emerald-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-mono text-zinc-400 mb-1">
                    <span>Tenure Horizon</span>
                    <span className="text-white font-bold">{valC} Years</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    step="1"
                    value={valC}
                    onChange={(e) => setValC(Number(e.target.value))}
                    className="w-full accent-emerald-400"
                  />
                </div>
              </div>

              <div className="lg:col-span-5 bg-white/[0.02] border border-white/[0.04] rounded-xl p-5 flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-500 block mb-1">
                    {baseCurrency === "USD" ? "MONTHLY PRINCIPAL & INTEREST" : "ESTIMATED MONTHLY INSTALLMENT"}
                  </span>
                  <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono mb-4">
                    {activeProfile.symbol}{emiComputed.toLocaleString()}
                  </div>

                  <div className="space-y-2 border-t border-white/[0.04] pt-3 text-xs font-mono text-zinc-400">
                    <div className="flex justify-between">
                      <span>Total Principal:</span>
                      <span className="text-white">{activeProfile.symbol}{valA.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Interest Cost:</span>
                      <span className="text-rose-400">+{activeProfile.symbol}{(emiComputed * nMonths - valA).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tool 2: Wealth & SIP Engine */}
          {(activeToolId === "sip_in" || activeToolId === "retirement_us" || activeToolId === "isa_uk" || activeToolId === "savings_eu") && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 space-y-4">
                <p className="text-xs font-mono text-zinc-400">
                  Calibrated for {activeProfile.name} tax shelters (e.g., {baseCurrency === "INR" ? "Mutual Fund SIP" : baseCurrency === "USD" ? "401(k) / IRA" : "Cash ISA"}).
                </p>
                <div>
                  <div className="flex justify-between text-xs font-mono text-zinc-400 mb-1">
                    <span>Expected Return (%)</span>
                    <span className="text-emerald-400 font-bold">{valB}%</span>
                  </div>
                  <input
                    type="range"
                    min="3"
                    max="20"
                    step="0.5"
                    value={valB}
                    onChange={(e) => setValB(Number(e.target.value))}
                    className="w-full accent-emerald-400"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs font-mono text-zinc-400 mb-1">
                    <span>Investment Horizon</span>
                    <span className="text-white font-bold">{valC} Years</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="35"
                    step="1"
                    value={valC}
                    onChange={(e) => setValC(Number(e.target.value))}
                    className="w-full accent-emerald-400"
                  />
                </div>
              </div>

              <div className="lg:col-span-5 bg-white/[0.02] border border-white/[0.04] rounded-xl p-5 flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-500 block mb-1">
                    ESTIMATED ACCUMULATION
                  </span>
                  <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono mb-4">
                    {activeProfile.symbol}{compoundFuture.toLocaleString()}
                  </div>
                  <div className="text-xs font-mono text-zinc-400">
                    Monthly Contribution: <span className="text-white">{activeProfile.symbol}{monthlyDeposit.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tool 3: Tax and Special Engines */}
          {!["emi_in", "mortgage_us", "mortgage_uk", "euribor_loan", "sip_in", "retirement_us", "isa_uk", "savings_eu"].includes(activeToolId) && (
            <div className="py-8 text-center bg-white/[0.01] rounded-xl border border-white/[0.04]">
              <p className="text-xs font-mono text-zinc-400">
                {activeToolId.toUpperCase()} active for {activeProfile.name}. Adjust sliders in the related calculators above to see updated models.
              </p>
            </div>
          )}
        </section>

        {/* Subtle, slim bottom ad space */}
        <AdSenseBanner client="ca-pub-XXXXXXXXXXXXXXXX" slot="5678901234" />
      </main>

      <footer className="border-t border-white/[0.06] mt-16 py-6 text-center text-[11px] font-mono text-zinc-500">
        Finealth · Multi-Jurisdiction Financial Tools · Updated {lastUpdated}
      </footer>
    </div>
  );
}