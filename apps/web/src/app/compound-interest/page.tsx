"use client";

import { useState } from "react";

export default function CompoundInterestCalculator() {
  const [principal, setPrincipal] = useState<number>(200000);
  const [annualContribution, setAnnualContribution] = useState<number>(50000);
  const [rate, setRate] = useState<number>(10);
  const [years, setYears] = useState<number>(15);
  const [frequency, setFrequency] = useState<number>(1);
  const [currency, setCurrency] = useState<"INR" | "USD">("INR");

  const P = principal;
  const PMT = annualContribution;
  const r = rate / 100;
  const t = years;
  const n = frequency;

  const principalCompound = P * Math.pow(1 + r / n, n * t);

  let additionsTotal = 0;
  for (let yr = 1; yr <= t; yr++) {
    additionsTotal += PMT * Math.pow(1 + r / n, n * (t - yr));
  }

  const futureValue = Math.round(principalCompound + additionsTotal);
  const totalPrincipal = Math.round(P + PMT * t);
  const totalInterest = Math.max(0, futureValue - totalPrincipal);

  const principalRatio = futureValue > 0 ? totalPrincipal / futureValue : 0.5;

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - principalRatio * circumference;

  const fmt = (val: number) => {
    if (currency === "INR") {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(val);
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-stone-200/80 pb-8 mb-12 gap-4">
        <div>
          <span className="text-xs font-mono uppercase tracking-[0.2em] text-stone-400 block mb-2">
            Model 03 &middot; Compounding
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif text-stone-950 font-normal">
            Compound Interest Engine
          </h1>
        </div>
        <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-lg border border-stone-200 self-start sm:self-auto">
          <button
            onClick={() => setCurrency("INR")}
            className={`px-3 py-1 text-xs font-mono rounded-md transition ${
              currency === "INR" ? "bg-white text-stone-950 shadow-sm" : "text-stone-500 hover:text-stone-900"
            }`}
          >
            INR (₹)
          </button>
          <button
            onClick={() => setCurrency("USD")}
            className={`px-3 py-1 text-xs font-mono rounded-md transition ${
              currency === "USD" ? "bg-white text-stone-950 shadow-sm" : "text-stone-500 hover:text-stone-900"
            }`}
          >
            USD ($)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Sliders */}
        <div className="lg:col-span-7 bg-white border border-stone-200/90 rounded-2xl p-8 space-y-8 shadow-sm">
          <div>
            <div className="flex justify-between items-baseline mb-3">
              <label className="text-xs font-mono uppercase tracking-wider text-stone-500">
                Initial Principal
              </label>
              <span className="font-serif text-2xl text-stone-950">{fmt(principal)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="5000000"
              step="10000"
              value={principal}
              onChange={(e) => setPrincipal(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <div className="flex justify-between items-baseline mb-3">
              <label className="text-xs font-mono uppercase tracking-wider text-stone-500">
                Annual Addition
              </label>
              <span className="font-serif text-2xl text-stone-950">{fmt(annualContribution)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1000000"
              step="5000"
              value={annualContribution}
              onChange={(e) => setAnnualContribution(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <div className="flex justify-between items-baseline mb-3">
              <label className="text-xs font-mono uppercase tracking-wider text-stone-500">
                Interest Rate (p.a)
              </label>
              <span className="font-serif text-2xl text-stone-950">{rate}%</span>
            </div>
            <input
              type="range"
              min="1"
              max="25"
              step="0.5"
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <div className="flex justify-between items-baseline mb-3">
              <label className="text-xs font-mono uppercase tracking-wider text-stone-500">
                Horizon
              </label>
              <span className="font-serif text-2xl text-stone-950">
                {years} {years === 1 ? "Year" : "Years"}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="40"
              step="1"
              value={years}
              onChange={(e) => setYears(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="text-xs font-mono uppercase tracking-wider text-stone-500 block mb-3">
              Compounding Frequency
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Annually", val: 1 },
                { label: "Quarterly", val: 4 },
                { label: "Monthly", val: 12 },
              ].map((freq) => (
                <button
                  key={freq.val}
                  type="button"
                  onClick={() => setFrequency(freq.val)}
                  className={`py-2 text-xs font-mono rounded-lg border transition ${
                    frequency === freq.val
                      ? "bg-stone-900 text-white border-stone-900 shadow-sm"
                      : "bg-white text-stone-600 border-stone-200 hover:border-stone-400"
                  }`}
                >
                  {freq.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-stone-200/90 rounded-2xl p-8 shadow-sm">
            <span className="text-[11px] font-mono uppercase tracking-widest text-stone-400 block mb-6">
              Balance Breakdown
            </span>

            <div className="flex items-center justify-center my-6">
              <div className="relative w-40 h-40 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 140 140">
                  <circle
                    cx="70"
                    cy="70"
                    r={radius}
                    stroke="#E7E5E4"
                    strokeWidth="14"
                    fill="transparent"
                  />
                  <circle
                    cx="70"
                    cy="70"
                    r={radius}
                    stroke="#1C1917"
                    strokeWidth="14"
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-300 ease-out"
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="text-[10px] font-mono uppercase text-stone-400 block">Interest</span>
                  <span className="text-sm font-semibold text-stone-900">
                    {Math.round((1 - principalRatio) * 100)}%
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-stone-100">
              <div className="flex justify-between items-center text-sm font-light">
                <span className="flex items-center gap-2 text-stone-500">
                  <span className="w-2 h-2 rounded-full bg-stone-900" /> Total Capital Deposited
                </span>
                <span className="font-mono text-stone-900">{fmt(totalPrincipal)}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-light">
                <span className="flex items-center gap-2 text-stone-500">
                  <span className="w-2 h-2 rounded-full bg-stone-300" /> Interest Yield
                </span>
                <span className="font-mono text-emerald-700">+{fmt(totalInterest)}</span>
              </div>
              <div className="pt-4 border-t border-stone-200 flex justify-between items-baseline">
                <span className="font-serif text-base text-stone-900">Future Balance</span>
                <span className="font-serif text-2xl font-medium text-stone-950">
                  {fmt(futureValue)}
                </span>
              </div>
            </div>
          </div>

          <div className="border border-dashed border-stone-300 rounded-xl p-6 text-center bg-stone-50/50 text-[11px] font-mono text-stone-400">
            [ RESERVED UTILITY AD PLACEMENT ]
          </div>
        </div>
      </div>
    </div>
  );
}