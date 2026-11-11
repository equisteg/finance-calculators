'use client';

import { useMemo, useState } from 'react';
import { projectRetirement, retirementOdds, type RetirementInput, exampleRetirement } from '@finealth/finance-core';
import { isRetirementInput, KEYS } from '@/lib/storage';
import { usePersistent } from '@/lib/usePersistent';
import { usePro } from '../ProProvider';
import { NumberField, Panel, ProGate, Stat, ToolPage, useMoney } from '../ui';
import { AREA_ICON } from '../GlassIcon';


const isNullable = (v: unknown): v is RetirementInput | null => v === null || isRetirementInput(v);

export function RetirementPlanner() {
  const { currency, money } = useMoney();
  const { isPro } = usePro();
  const [stored, setStored] = usePersistent<RetirementInput | null>(KEYS.retirement, null, isNullable);
  const input = stored ?? exampleRetirement(currency);
  const set = (patch: Partial<RetirementInput>) => setStored({ ...input, ...patch });
  const p = useMemo(() => projectRetirement(input), [input]);
  const [runAt, setRunAt] = useState(0);
  const odds = useMemo(() => (isPro && runAt ? retirementOdds(input, 1000) : null), [isPro, runAt, input]);
  const pct = Math.round((odds?.successRate ?? 0) * 100);

  return (
    <ToolPage
      icon={AREA_ICON['/retirement-planner/']}
      eyebrow="Projection free · Monte Carlo odds with Pro"
      title="Retirement Planner"
      kpis={[
        { label: 'Years to go', value: `${Math.max(0, input.retireAge - input.currentAge)} yr` },
        { label: `At ${input.retireAge}`, value: money(p.corpusAtRetirement), tone: p.onTrack ? 'ok' : undefined },
        { label: 'Verdict', value: p.onTrack ? 'Lasts' : `Runs out at ${p.runsOutAt}`, tone: p.onTrack ? 'ok' : 'bad' },
      ]}
      intro="See how much you will have when you stop working, how much you need, and (with Pro) the chance your money lasts when markets go up and down."
    >
      <div className="grid gap-6 items-start">
        <Panel title="Your plan">
          <div className="fieldgrid grid gap-x-4 gap-y-4">
            <NumberField label="Age now" value={input.currentAge} onChange={(n) => set({ currentAge: n })} step={1} max={100} />
            <NumberField label="Retire at" value={input.retireAge} onChange={(n) => set({ retireAge: n })} step={1} max={100} />
            <NumberField label="Plan until age" value={input.planToAge} onChange={(n) => set({ planToAge: n })} step={1} max={110} />
            <NumberField label="Saved so far" value={input.currentSavings} onChange={(n) => set({ currentSavings: n })} />
            <NumberField label="Monthly saving" value={input.monthlySaving} onChange={(n) => set({ monthlySaving: n })} testId="in-ret-saving" />
            <NumberField label="Yearly spending" hint="In today's money" value={input.yearlySpendingToday} onChange={(n) => set({ yearlySpendingToday: n })} />
            <NumberField label="Inflation" suffix="%" value={input.inflationPct} onChange={(n) => set({ inflationPct: n })} max={20} />
            <NumberField label="Return while working" suffix="%" value={input.returnPct} onChange={(n) => set({ returnPct: n })} max={30} />
            <NumberField label="Return after retiring" suffix="%" value={input.retiredReturnPct} onChange={(n) => set({ retiredReturnPct: n })} max={30} />
            <NumberField label="Volatility" suffix="%" hint="About 15 for mostly shares, 6 for mostly bonds" value={input.volatilityPct} onChange={(n) => set({ volatilityPct: n })} max={60} />
          </div>
        </Panel>

        <div className="grid gap-6 content-start">
          <Panel testId="retirement-result">
            <div className="grid gap-3 sm:grid-cols-2">
              <Stat label={`At age ${input.retireAge} you will have`} value={money(p.corpusAtRetirement)} testId="ret-corpus" />
              <Stat label="You will need about" value={money(p.corpusNeeded)} testId="ret-needed" />
              <Stat label="First-year spending" value={money(p.firstYearSpending)} sub="Today's spending after inflation" />
              <Stat
                label="On expected returns"
                value={p.onTrack ? `Lasts to ${input.planToAge}` : `Runs out at ${p.runsOutAt}`}
                tone={p.onTrack ? 'ok' : 'bad'}
                testId="ret-verdict"
              />
            </div>
            <p className="mt-4 mb-0 text-sm text-zinc-400">
              This straight-line projection assumes the same return every year. Real markets move around, which is why a plan that looks fine on average can still run short.
            </p>
          </Panel>

          <ProGate feature="Retirement odds (Monte Carlo)" detail="Run your plan through 1,000 simulated market histories and see the chance your money lasts, plus good, typical and bad outcomes." testId="ret-pro-gate">
            <Panel title="Retirement odds" testId="ret-odds">
              <button type="button" className="btn btn-primary" onClick={() => setRunAt(Date.now())} data-testid="run-odds">
                {odds ? 'Run again with these numbers' : 'Run 1,000 simulations'}
              </button>
              {odds && (
                <div className="mt-5 grid gap-3">
                  <p className="m-0 text-2xl font-bold text-white" data-testid="odds-success">
                    {pct} % chance your money lasts to {input.planToAge}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Stat label="Bad markets (10th pct)" value={money(odds.atRetirement.p10)} tone="bad" />
                    <Stat label="Typical (median)" value={money(odds.atRetirement.p50)} />
                    <Stat label="Good markets (90th pct)" value={money(odds.atRetirement.p90)} tone="ok" />
                  </div>
                  <p className="m-0 text-sm text-zinc-400">
                    Pot size at retirement across {odds.runs.toLocaleString('en-US')} runs.
                    {odds.medianRunOutAge !== null ? ` When the money runs short, it is typically around age ${odds.medianRunOutAge}.` : ''} Many planners aim for 80 % or more. Returns are drawn from a normal distribution, which understates rare crashes.
                  </p>
                </div>
              )}
            </Panel>
          </ProGate>
        </div>
      </div>
    </ToolPage>
  );
}
