"use client";

import { useState } from "react";
import CalculatorShell, {
  BreakdownDonut,
  CalculatorSlider,
  useCalculatorCurrency,
} from "@/components/CalculatorShell";
import { formatMoney } from "@/lib/format";
import { loanSummary } from "@/lib/finance";

const PRINCIPAL = {
  INR: { initial: 3_000_000, min: 100_000, max: 20_000_000, step: 50_000 },
  other: { initial: 300_000, min: 10_000, max: 2_000_000, step: 5_000 },
};

export default function EmiCalculator() {
  const currency = useCalculatorCurrency();
  const range = currency === "INR" ? PRINCIPAL.INR : PRINCIPAL.other;
  const money = (value: number) => formatMoney(value, currency);

  const [principal, setPrincipal] = useState<number>(range.initial);
  const [annualRate, setAnnualRate] = useState<number>(8.5);
  const [years, setYears] = useState<number>(20);

  const [valuesCurrency, setValuesCurrency] = useState(currency);
  if (valuesCurrency !== currency) {
    setValuesCurrency(currency);
    setPrincipal(range.initial);
  }

  const loan = loanSummary(principal, annualRate, years);

  return (
    <CalculatorShell
      eyebrow="Model 02 · Amortization"
      title="EMI & Debt Schedule"
      subtitle="Equated monthly installment on a diminishing-balance loan."
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 bg-[#0c0c10] border border-white/[0.08] rounded-2xl p-6 sm:p-8 space-y-8">
          <CalculatorSlider
            label="Borrowing Principal"
            display={money(principal)}
            value={principal}
            onChange={setPrincipal}
            min={range.min}
            max={range.max}
            step={range.step}
            minLabel={money(range.min)}
            maxLabel={money(range.max)}
          />
          <CalculatorSlider
            label="Annual Interest Rate"
            display={`${annualRate}%`}
            value={annualRate}
            onChange={setAnnualRate}
            min={1}
            max={24}
            step={0.1}
            minLabel="1%"
            maxLabel="24%"
          />
          <CalculatorSlider
            label="Loan Tenure"
            display={`${years} ${years === 1 ? "Year" : "Years"} (${years * 12} Mos)`}
            value={years}
            onChange={setYears}
            min={1}
            max={30}
            step={1}
            minLabel="1 Year"
            maxLabel="30 Years"
          />
        </div>

        <div className="lg:col-span-5 bg-[#0c0c10] border border-white/[0.08] rounded-2xl p-6 sm:p-8">
          <span className="text-[11px] font-mono uppercase tracking-widest text-zinc-400 block">
            Equated Monthly Installment
          </span>
          <div className="text-3xl sm:text-4xl font-bold text-white font-mono mt-2">{money(loan.emi)}</div>

          <BreakdownDonut
            share={loan.principalShare}
            centerLabel="Principal"
            centerValue={`${Math.round(loan.principalShare * 100)}%`}
            firstLabel="Principal"
            secondLabel="Interest"
          />

          <div className="space-y-3 border-t border-white/[0.06] pt-4 text-sm font-mono">
            <div className="flex justify-between text-zinc-400">
              <span>Principal Borrowed</span>
              <span className="text-white">{money(principal)}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Total Interest Paid</span>
              <span className="text-rose-400">+{money(loan.totalInterest)}</span>
            </div>
            <div className="flex justify-between border-t border-white/[0.06] pt-3 font-bold">
              <span className="text-zinc-300">Aggregate Payback</span>
              <span className="text-emerald-400">{money(loan.totalPayment)}</span>
            </div>
          </div>
        </div>
      </div>
    </CalculatorShell>
  );
}
