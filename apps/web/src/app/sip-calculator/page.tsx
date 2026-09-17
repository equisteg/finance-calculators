"use client";

import { useState } from "react";
import CalculatorShell, {
  BreakdownDonut,
  CalculatorSlider,
  useCalculatorCurrency,
} from "@/components/CalculatorShell";
import { formatMoney } from "@/lib/format";
import { sipFutureValue } from "@/lib/finance";

const DEPOSIT = {
  INR: { initial: 10_000, min: 500, max: 200_000, step: 500 },
  other: { initial: 500, min: 50, max: 10_000, step: 50 },
};

export default function SipCalculatorPage() {
  const currency = useCalculatorCurrency();
  const range = currency === "INR" ? DEPOSIT.INR : DEPOSIT.other;
  const money = (value: number) => formatMoney(value, currency);

  const [monthlyInvestment, setMonthlyInvestment] = useState<number>(range.initial);
  const [expectedReturnRate, setExpectedReturnRate] = useState<number>(12);
  const [timePeriodYears, setTimePeriodYears] = useState<number>(10);

  // Re-base the deposit when the currency changes so it stays inside the new range.
  const [valuesCurrency, setValuesCurrency] = useState(currency);
  if (valuesCurrency !== currency) {
    setValuesCurrency(currency);
    setMonthlyInvestment(range.initial);
  }

  const sip = sipFutureValue(monthlyInvestment, expectedReturnRate, timePeriodYears);
  const investedShare = sip.maturity > 0 ? sip.invested / sip.maturity : 1;

  return (
    <CalculatorShell
      eyebrow="Model 01 · Systematic Investing"
      title={currency === "USD" ? "401(k) & Index Wealth Calculator" : "SIP Wealth Compounder"}
      subtitle="Monthly deposits at the start of each month, compounded monthly."
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 bg-[#0c0c10] border border-white/[0.08] rounded-2xl p-6 sm:p-8 space-y-8">
          <CalculatorSlider
            label="Monthly Deposit"
            display={money(monthlyInvestment)}
            value={monthlyInvestment}
            onChange={setMonthlyInvestment}
            min={range.min}
            max={range.max}
            step={range.step}
            minLabel={money(range.min)}
            maxLabel={money(range.max)}
          />
          <CalculatorSlider
            label="Expected Annual Return"
            display={`${expectedReturnRate}%`}
            value={expectedReturnRate}
            onChange={setExpectedReturnRate}
            min={1}
            max={30}
            step={0.5}
            minLabel="1%"
            maxLabel="30%"
          />
          <CalculatorSlider
            label="Investment Duration"
            display={`${timePeriodYears} ${timePeriodYears === 1 ? "Year" : "Years"}`}
            value={timePeriodYears}
            onChange={setTimePeriodYears}
            min={1}
            max={40}
            step={1}
            minLabel="1 Year"
            maxLabel="40 Years"
          />
        </div>

        <div className="lg:col-span-5 bg-[#0c0c10] border border-white/[0.08] rounded-2xl p-6 sm:p-8">
          <span className="text-[11px] font-mono uppercase tracking-widest text-zinc-400 block">
            Projected Accumulation
          </span>
          <div className="text-3xl sm:text-4xl font-bold text-white font-mono mt-2">{money(sip.maturity)}</div>

          <BreakdownDonut
            share={investedShare}
            centerLabel="Returns"
            centerValue={`${Math.round((1 - investedShare) * 100)}%`}
            firstLabel="Invested"
            secondLabel="Returns"
          />

          <div className="space-y-3 border-t border-white/[0.06] pt-4 text-sm font-mono">
            <div className="flex justify-between text-zinc-400">
              <span>Total Principal Contributed</span>
              <span className="text-white">{money(sip.invested)}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Estimated Compounded Gains</span>
              <span className="text-emerald-400">+{money(sip.gains)}</span>
            </div>
          </div>
        </div>
      </div>
    </CalculatorShell>
  );
}
