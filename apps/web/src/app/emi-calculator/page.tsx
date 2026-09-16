"use client";

import { useState } from "react";

export default function EmiCalculator() {
  const [principal, setPrincipal] = useState<number>(3000000);
  const [annualRate, setAnnualRate] = useState<number>(8.5);
  const [years, setYears] = useState<number>(20);
  const [currency, setCurrency] = useState<"INR" | "USD">("INR");

  const P = principal;
  const r = annualRate / 12 / 100;
  const n = years * 12;

  const emi = Math.round((P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
  const totalAmount = emi * n;
  const totalInterest = Math.max(0, totalAmount - P);

  const principalRatio = totalAmount > 0 ? P / totalAmount : 0.5;

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
            Model 02 &middot; Amortization
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif text-stone-950 font-normal">
            EMI & Debt Schedule
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
                Borrowing Principal
              </label>
              <span className="font-serif text-2xl text-stone-950">{fmt(principal)}</span>
            </div>
            <input
              type="range"
              min="100000"
              max="20000000"
              step="50000"
              value={principal}
              onChange={(e) => setPrincipal(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-[11px] font-mono text-stone-400 mt-2">
              <span>{fmt(100000)}</span>
              <span>{fmt(20000000)}</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-baseline mb-3">
              <label className="text-xs font-mono uppercase tracking-wider text-stone-500">
                Annual Interest Rate
              </label>
              <span className="font-serif text-2xl text-stone-950">{annualRate}%</span>
            </div>
            <input
              type="range"
              min="4"
              max="24"
              step="0.1"
              value={annualRate}
              onChange={(e) => setAnnualRate(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-[11px] font-mono text-stone-400 mt-2">
              <span>4%</span>
              <span>24%</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-baseline mb-3">
              <label className="text-xs font-mono uppercase tracking-wider text-stone-500">
                Loan Tenure
              </label>
              <span className="font-serif text-2xl text-stone-950">
                {years} {years === 1 ? "Year" : "Years"} ({years * 12} Mos)
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="30"
              step="1"
              value={years}
              onChange={(e) => setYears(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-[11px] font-mono text-stone-400 mt-2">
              <span>1 Year</span>
              <span>30 Years</span>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-stone-200/90 rounded-2xl p-8 shadow-sm">
            <span className="text-[11px] font-mono uppercase tracking-widest text-stone-400 block mb-6">
              Installment Metric
            </span>

            <div className="text-center my-6 py-4 bg-stone-50 border border-stone-200/70 rounded-xl">
              <span className="text-xs font-mono uppercase tracking-wider text-stone-400 block mb-1">
                Equated Monthly Installment
              </span>
              <span className="font-serif text-3xl sm:text-4xl text-stone-950">
                {fmt(emi)}
              </span>
            </div>

            <div className="flex items-center justify-center my-6">
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 140 140">
                  <circle
                    cx="70"
                    cy="70"
                    r={radius}
                    stroke="#E7E5E4"
                    strokeWidth="12"
                    fill="transparent"
                  />
                  <circle
                    cx="70"
                    cy="70"
                    r={radius}
                    stroke="#1C1917"
                    strokeWidth="12"
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-300 ease-out"
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="text-[10px] font-mono uppercase text-stone-400 block">Principal</span>
                  <span className="text-xs font-semibold text-stone-900">
                    {Math.round(principalRatio * 100)}%
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-stone-100">
              <div className="flex justify-between items-center text-sm font-light">
                <span className="flex items-center gap-2 text-stone-500">
                  <span className="w-2 h-2 rounded-full bg-stone-900" /> Principal Borrowed
                </span>
                <span className="font-mono text-stone-900">{fmt(principal)}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-light">
                <span className="flex items-center gap-2 text-stone-500">
                  <span className="w-2 h-2 rounded-full bg-stone-300" /> Total Interest Paid
                </span>
                <span className="font-mono text-rose-700">+{fmt(totalInterest)}</span>
              </div>
              <div className="pt-4 border-t border-stone-200 flex justify-between items-baseline">
                <span className="font-serif text-base text-stone-900">Aggregate Payback</span>
                <span className="font-serif text-2xl font-medium text-stone-950">
                  {fmt(totalAmount)}
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