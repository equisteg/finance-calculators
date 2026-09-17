"use client";

import { useState } from "react";
import CalculatorShell, {
  BreakdownDonut,
  CalculatorSlider,
  useCalculatorCurrency,
} from "@/components/CalculatorShell";
import { formatMoney } from "@/lib/format";
import { compoundGrowth } from "@/lib/finance";

const AMOUNTS = {
  INR: { principal: 200_000, principalMax: 5_000_000, principalStep: 10_000, addition: 50_000, additionMax: 1_000_000, additionStep: 5_000 },
  other: { principal: 10_000, principalMax: 500_000, principalStep: 1_000, addition: 2_500, additionMax: 100_000, additionStep: 500 },
};

const FREQUENCIES = [
  { label: "Annually", val: 1 },
  { label: "Quarterly", val: 4 },
  { label: "Monthly", val: 12 },
];

export default function CompoundInterestCalculator() {
  const currency = useCalculatorCurrency();
  const amounts = currency === "INR" ? AMOUNTS.INR : AMOUNTS.other;
  const money = (value: number) => formatMoney(value, currency);

  const [principal, setPrincipal] = useState<number>(amounts.principal);
  const [annualContribution, setAnnualContribution] = useState<number>(amounts.addition);
  const [rate, setRate] = useState<number>(10);
  const [years, setYears] = useState<number>(15);
  const [frequency, setFrequency] = useState<number>(1);

  const [valuesCurrency, setValuesCurrency] = useState(currency);
  if (valuesCurrency !== currency) {
    setValuesCurrency(currency);
    setPrincipal(amounts.principal);
    setAnnualContribution(amounts.addition);
  }

  const growth = compoundGrowth(principal, annualContribution, rate, years, frequency);
  const depositShare = growth.maturity > 0 ? growth.invested / growth.maturity : 1;

  return (
    <CalculatorShell
      eyebrow="Model 03 · Compounding"
      title="Compound Interest Engine"
      subtitle="Opening balance plus a contribution at the end of each year."
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 bg-[#0c0c10] border border-white/[0.08] rounded-2xl p-6 sm:p-8 space-y-8">
          <CalculatorSlider
            label="Initial Principal"
            display={money(principal)}
            value={principal}
            onChange={setPrincipal}
            min={0}
            max={amounts.principalMax}
            step={amounts.principalStep}
          />
          <CalculatorSlider
            label="Annual Addition"
            display={money(annualContribution)}
            value={annualContribution}
            onChange={setAnnualContribution}
            min={0}
            max={amounts.additionMax}
            step={amounts.additionStep}
          />
          <CalculatorSlider
            label="Interest Rate (p.a.)"
            display={`${rate}%`}
            value={rate}
            onChange={setRate}
            min={1}
            max={25}
            step={0.5}
          />
          <CalculatorSlider
            label="Horizon"
            display={`${years} ${years === 1 ? "Year" : "Years"}`}
            value={years}
            onChange={setYears}
            min={1}
            max={40}
            step={1}
          />

          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 block mb-3">
              Compounding Frequency
            </span>
            <div className="grid grid-cols-3 gap-3">
              {FREQUENCIES.map((freq) => (
                <button
                  key={freq.val}
                  type="button"
                  onClick={() => setFrequency(freq.val)}
                  aria-pressed={frequency === freq.val}
                  className={`py-2 text-xs font-mono rounded-lg border transition ${
                    frequency === freq.val
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      : "bg-white/[0.02] text-zinc-400 border-white/[0.08] hover:border-white/20"
                  }`}
                >
                  {freq.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 bg-[#0c0c10] border border-white/[0.08] rounded-2xl p-6 sm:p-8">
          <span className="text-[11px] font-mono uppercase tracking-widest text-zinc-400 block">
            Future Balance
          </span>
          <div className="text-3xl sm:text-4xl font-bold text-white font-mono mt-2">{money(growth.maturity)}</div>

          <BreakdownDonut
            share={depositShare}
            centerLabel="Interest"
            centerValue={`${Math.round((1 - depositShare) * 100)}%`}
            firstLabel="Deposits"
            secondLabel="Interest"
          />

          <div className="space-y-3 border-t border-white/[0.06] pt-4 text-sm font-mono">
            <div className="flex justify-between text-zinc-400">
              <span>Total Capital Deposited</span>
              <span className="text-white">{money(growth.invested)}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Interest Yield</span>
              <span className="text-emerald-400">+{money(growth.gains)}</span>
            </div>
          </div>
        </div>
      </div>
    </CalculatorShell>
  );
}
