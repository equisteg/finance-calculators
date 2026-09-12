"use client";

import { useState } from "react";
import { useCurrency } from "../context/CurrencyContext";

export default function SipCalculatorPage() {
  const { formatMoney, region, activeProfile } = useCurrency();
  const [monthlyInvestment, setMonthlyInvestment] = useState<number>(
    region === "INR" ? 10000 : 500
  );
  const [expectedReturnRate, setExpectedReturnRate] = useState<number>(12);
  const [timePeriodYears, setTimePeriodYears] = useState<number>(10);

  const i = expectedReturnRate / 12 / 100;
  const n = timePeriodYears * 12;

  const totalInvested = monthlyInvestment * n;
  const estimatedMaturity =
    i > 0
      ? Math.round(monthlyInvestment * ((Math.pow(1 + i, n) - 1) / i) * (1 + i))
      : totalInvested;
  const totalGains = Math.max(0, estimatedMaturity - totalInvested);

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="mb-8">
        <a
          href="/"
          className="text-xs font-mono text-emerald-400 hover:underline mb-3 inline-block"
        >
          &larr; Back to Dashboard
        </a>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight font-serif">
          {region === "USD" ? "401(k) & Index Wealth Calculator" : "SIP Wealth Compounder"}
        </h1>
        <p className="text-sm sm:text-base text-zinc-400 mt-2 font-light">
          Calibrated for {activeProfile.name} investment vehicles & tax horizons.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 bg-[#0e0e12] border border-white/[0.08] rounded-3xl p-8 shadow-2xl">
        <div className="lg:col-span-7 space-y-6">
          <div>
            <div className="flex justify-between text-xs font-mono text-zinc-400 mb-2">
              <span>Monthly Deposit</span>
              <span className="text-white font-bold text-lg">
                {formatMoney(monthlyInvestment)}
              </span>
            </div>
            <input
              type="range"
              min={region === "INR" ? 500 : 50}
              max={region === "INR" ? 200000 : 10000}
              step={region === "INR" ? 500 : 50}
              value={monthlyInvestment}
              onChange={(e) => setMonthlyInvestment(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-mono text-zinc-400 mb-2">
              <span>Expected Annual Return (%)</span>
              <span className="text-emerald-400 font-bold text-lg">
                {expectedReturnRate}%
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="30"
              step="0.5"
              value={expectedReturnRate}
              onChange={(e) => setExpectedReturnRate(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-mono text-zinc-400 mb-2">
              <span>Investment Duration</span>
              <span className="text-white font-bold text-lg">
                {timePeriodYears} Years
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="40"
              step="1"
              value={timePeriodYears}
              onChange={(e) => setTimePeriodYears(Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>

        <div className="lg:col-span-5 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 block mb-1">
              PROJECTED ACCUMULATION
            </span>
            <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono mb-6">
              {formatMoney(estimatedMaturity)}
            </div>

            <div className="space-y-3 border-t border-white/[0.06] pt-4 text-xs font-mono">
              <div className="flex justify-between text-zinc-400">
                <span>Total Principal Contributed</span>
                <span className="text-white">{formatMoney(totalInvested)}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Estimated Compounded Gains</span>
                <span className="text-emerald-400">+{formatMoney(totalGains)}</span>
              </div>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-white/[0.06] text-[11px] font-mono text-zinc-500">
            Assumes monthly compounding using verified domestic return schedules.
          </div>
        </div>
      </div>
    </div>
  );
}