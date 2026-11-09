"use client";

import { useState } from "react";
import CalculatorShell, {
  BreakdownDonut,
  CalculatorSlider,
  useCalculatorCurrency,
} from "@/components/CalculatorShell";
import { formatMoney } from "@finealth/finance-core";
import { loanSummary } from "@finealth/finance-core";

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
      icon={{ name: 'debt', tone: 'rose' }}
      eyebrow="Model 02 · Amortization"
      title="EMI & Debt Schedule"
      subtitle="Equated monthly installment on a diminishing-balance loan."
    >
      <div className="grid grid-cols-1 items-start gap-6 items-start">
        <div className="card p-6 sm:p-8 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
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

        <div className="card glass-strong p-6 sm:p-8 calc-result">
          <span className="text-[11px] tabular-nums uppercase tracking-widest text-zinc-400 block">
            Equated Monthly Installment
          </span>
          <div>
            <div className="mt-2 font-bold tabular-nums gradient-text text-[clamp(1.8rem,1.2rem+2vw,2.6rem)] leading-tight">{money(loan.emi)}</div>
          <div className="fitgrid grid gap-2 mt-4">
            <div className="stat !p-3"><span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">Interest share</span><span className="block mt-0.5 font-bold tabular-nums text-white whitespace-nowrap">{principal > 0 ? `${Math.round((loan.totalInterest / (loan.totalInterest + principal)) * 100)} %` : "—"}</span></div>
            <div className="stat !p-3"><span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">Payments</span><span className="block mt-0.5 font-bold tabular-nums text-white whitespace-nowrap">{Math.round(years * 12)}</span></div>
          </div>
          </div>

          <BreakdownDonut
            share={loan.principalShare}
            centerLabel="Principal"
            centerValue={`${Math.round(loan.principalShare * 100)}%`}
            firstLabel="Principal"
            secondLabel="Interest"
          />

          <div className="space-y-3 border-t border-white/[0.06] pt-4 text-sm tabular-nums">
            <div className="flex justify-between gap-3 text-zinc-400">
              <span>Principal Borrowed</span>
              <span className="text-white shrink-0 whitespace-nowrap text-right font-semibold">{money(principal)}</span>
            </div>
            <div className="flex justify-between gap-3 text-zinc-400">
              <span>Total Interest Paid</span>
              <span className="text-rose-400 shrink-0 whitespace-nowrap text-right font-semibold">+{money(loan.totalInterest)}</span>
            </div>
            <div className="flex justify-between border-t border-white/[0.06] pt-3 font-bold">
              <span className="text-zinc-300">Aggregate Payback</span>
              <span className="text-emerald-400 shrink-0 whitespace-nowrap text-right font-semibold">{money(loan.totalPayment)}</span>
            </div>
          </div>
        </div>
      </div>
    </CalculatorShell>
  );
}
