'use client';

import { useState } from 'react';
import { comparePrepayment } from '@finealth/finance-core';
import { NumberField, Panel, Stat, ToolPage, useMoney } from '../ui';
import { AREA_ICON } from '../GlassIcon';

const span = (m: number) => (!Number.isFinite(m) ? 'never' : m < 12 ? `${m} months` : `${Math.floor(m / 12)} yr ${m % 12} mo`);

export function PrepaymentTool() {
  const { currency, money } = useMoney();
  const inr = currency === 'INR';
  const [outstanding, setOutstanding] = useState(inr ? 2_500_000 : 250_000);
  const [apr, setApr] = useState(inr ? 8.75 : 6.5);
  const [monthsLeft, setMonthsLeft] = useState(180);
  const [lump, setLump] = useState(inr ? 200_000 : 20_000);
  const [extra, setExtra] = useState(0);
  const r = comparePrepayment({ outstanding, aprPct: apr, monthsLeft, lumpSum: lump, extraMonthly: extra });

  return (
    <ToolPage
      icon={AREA_ICON['/loan-prepayment/']}
      eyebrow="Reduce tenure or reduce EMI?"
      title="Loan Prepayment Optimiser"
      intro="Paying part of a loan early? Compare keeping your EMI and finishing sooner with keeping the end date and paying less each month."
    >
      <div className="grid gap-6 md:grid-cols-12 items-start">
        <Panel title="Your loan" className="md:col-span-5">
          <div className="fieldgrid grid gap-x-4 gap-y-4 grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
            <NumberField label="Balance today" value={outstanding} onChange={setOutstanding} testId="in-outstanding" />
            <NumberField label="Interest rate" suffix="%" value={apr} onChange={setApr} max={40} />
            <NumberField label="Months left" value={monthsLeft} onChange={(n) => setMonthsLeft(Math.min(480, n))} step={1} max={480} />
            <NumberField label="Part-payment now" value={lump} onChange={setLump} testId="in-lump" />
            <NumberField label="Extra every month" hint="Adds to the reduce-tenure option" value={extra} onChange={setExtra} />
          </div>
          <p className="hint mt-4">Current EMI: {money(r.emi)} · Interest left if you change nothing: {money(r.baseline.totalInterest)}</p>
        </Panel>

        <div className="md:col-span-7 grid gap-6 content-start sm:grid-cols-2">
          <Panel title="Keep EMI, finish sooner" testId="prepay-tenure" className={r.better === 'reduceTenure' ? '!border-emerald-400/60' : ''}>
            <div className="grid gap-3">
              <Stat label="Interest saved" value={money(r.reduceTenure.interestSaved)} tone="ok" testId="tenure-saved" />
              <Stat label="Loan ends" value={`${span(r.reduceTenure.monthsSaved)} sooner`} sub={`New tenure ${span(r.reduceTenure.months)}`} />
            </div>
          </Panel>
          <Panel title="Keep end date, lower EMI" testId="prepay-emi" className={r.better === 'reduceEmi' ? '!border-emerald-400/60' : ''}>
            <div className="grid gap-3">
              <Stat label="Interest saved" value={money(r.reduceEmi.interestSaved)} tone="ok" testId="emi-saved" />
              <Stat label="New EMI" value={money(r.reduceEmi.newEmi)} sub={`${money(r.emi - r.reduceEmi.newEmi)} less each month`} />
            </div>
          </Panel>
          <p className="sm:col-span-2 m-0 text-sm text-zinc-300">
            Keeping the EMI and shortening the loan almost always saves more interest. Lowering the EMI frees cash each month, which helps if your budget is tight. Check your lender&apos;s prepayment charges first; many floating-rate home loans in India have none.
          </p>
        </div>
      </div>
    </ToolPage>
  );
}
