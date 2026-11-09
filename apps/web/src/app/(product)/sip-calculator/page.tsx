"use client";

import { useState } from "react";
import CalculatorShell, {
  BreakdownDonut,
  CalculatorSlider,
  useCalculatorCurrency,
} from "@/components/CalculatorShell";
import { formatMoney } from "@finealth/finance-core";
import { sipFutureValue } from "@finealth/finance-core";

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
      icon={{ name: 'coins', tone: 'emerald' }}
      eyebrow="Model 01 · Systematic Investing"
      title={currency === "USD" ? "401(k) & Index Wealth Calculator" : "SIP Wealth Compounder"}
      subtitle="Monthly deposits at the start of each month, compounded monthly."
    >
      <div className="grid grid-cols-1 items-start gap-6">
        <div className="card p-6 sm:p-8 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
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

        <div className="card glass-strong p-6 sm:p-8 calc-result">
          <span className="text-[11px] tabular-nums uppercase tracking-widest text-zinc-400 block">
            Projected Accumulation
          </span>
          <div>
            <div className="mt-2 font-bold tabular-nums gradient-text text-[clamp(1.8rem,1.2rem+2vw,2.6rem)] leading-tight">{money(sip.maturity)}</div>
          <div className="fitgrid grid gap-2 mt-4">
            <div className="stat !p-3"><span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">Money multiplied</span><span className="block mt-0.5 font-bold tabular-nums text-white whitespace-nowrap">{sip.invested > 0 ? `${(sip.maturity / sip.invested).toFixed(2)}×` : "—"}</span></div>
            <div className="stat !p-3"><span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">Deposits made</span><span className="block mt-0.5 font-bold tabular-nums text-white whitespace-nowrap">{timePeriodYears * 12}</span></div>
          </div>
          </div>

          <BreakdownDonut
            share={investedShare}
            centerLabel="Returns"
            centerValue={`${Math.round((1 - investedShare) * 100)}%`}
            firstLabel="Invested"
            secondLabel="Returns"
          />

          <div className="space-y-3 border-t border-white/[0.06] pt-4 text-sm tabular-nums">
            <div className="flex justify-between gap-3 text-zinc-400">
              <span>Total Principal Contributed</span>
              <span className="text-white shrink-0 whitespace-nowrap text-right font-semibold">{money(sip.invested)}</span>
            </div>
            <div className="flex justify-between gap-3 text-zinc-400">
              <span>Estimated Compounded Gains</span>
              <span className="text-emerald-400 shrink-0 whitespace-nowrap text-right font-semibold">+{money(sip.gains)}</span>
            </div>
          </div>
        </div>
      </div>
    </CalculatorShell>
  );
}
