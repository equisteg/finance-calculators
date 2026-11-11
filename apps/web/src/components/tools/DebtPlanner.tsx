'use client';

import { useMemo, useState } from 'react';
import { compareDebtStrategies, FREE_LIMITS, limitFor, planDebtPayoff, toCsv, type Debt, type DebtStrategy, exampleDebts } from '@finealth/finance-core';
import { download, isDebtList, KEYS, newId } from '@/lib/storage';
import { usePersistent } from '@/lib/usePersistent';
import { usePro } from '../ProProvider';
import { LineChart, NumberField, Panel, ProGate, Stat, ToolPage, useMoney } from '../ui';
import { AREA_ICON } from '../GlassIcon';


const isNullableDebts = (v: unknown): v is Debt[] | null => v === null || isDebtList(v);
const months = (m: number | null) => (m === null ? 'never' : m < 12 ? `${m} mo` : `${Math.floor(m / 12)} yr ${m % 12} mo`);
const STRATEGY_LABEL: Record<DebtStrategy, string> = {
  avalanche: 'Avalanche (highest rate first)',
  snowball: 'Snowball (smallest balance first)',
  custom: 'My order',
  minimum: 'Minimums only',
};

export function DebtPlanner() {
  const { currency, money } = useMoney();
  const symbol = ({ INR: '₹', USD: '$', EUR: '€', GBP: '£' } as const)[currency];
  const { isPro } = usePro();
  const [stored, setStored] = usePersistent<Debt[] | null>(KEYS.debts, null, isNullableDebts);
  const debts = stored ?? exampleDebts(currency);
  const limit = limitFor('debts', isPro);
  /** Free plan: only the first FREE_LIMITS.debts debts are planned (extra rows stay saved and come back with Pro). */
  const active = useMemo(() => debts.slice(0, limit), [debts, limit]);
  const minTotal = active.reduce((s, d) => s + d.minPayment, 0);
  const [extra, setExtra] = useState(Math.round(minTotal * 0.25));
  const [whatIf, setWhatIf] = useState(0);
  const [strategy, setStrategy] = useState<DebtStrategy>('avalanche');

  const budget = minTotal + extra;
  const cmp = useMemo(() => compareDebtStrategies(active, budget), [active, budget]);
  const chosen = strategy === 'avalanche' ? cmp.avalanche : strategy === 'snowball' ? cmp.snowball : planDebtPayoff(active, budget, strategy);
  const whatIfPlan = useMemo(() => (whatIf > 0 ? planDebtPayoff(active, budget + whatIf, strategy) : null), [active, budget, whatIf, strategy]);

  const update = (id: string, patch: Partial<Debt>) => setStored(debts.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  const remove = (id: string) => setStored(debts.filter((d) => d.id !== id));
  const add = () => setStored([...debts, { id: newId(), name: `Debt ${debts.length + 1}`, balance: 0, aprPct: 18, minPayment: 0 }]);

  const exportCsv = () => {
    const rows = chosen.schedule.map((m) => [m.month, m.paid.toFixed(2), m.interest.toFixed(2), m.balance.toFixed(2)]);
    download('finealth-debt-plan.csv', toCsv(['Month', 'Paid', 'Interest', 'Balance left'], rows), 'text/csv');
  };

  const step = Math.max(1, Math.ceil(chosen.schedule.length / 120));
  const sample = (plan: typeof chosen) => [active.reduce((s, d) => s + d.balance, 0), ...plan.schedule.filter((_, i) => i % step === 0).map((m) => m.balance)];

  return (
    <ToolPage
      icon={AREA_ICON['/debt-payoff/']}
      eyebrow="Snowball vs avalanche · month by month"
      title="Debt Payoff Planner"
      kpis={[
        { label: 'Total owed', value: money(active.reduce((sum, d) => sum + d.balance, 0)) },
        { label: 'Debt-free in', value: chosen.feasible ? months(chosen.months) : 'Not yet', tone: chosen.feasible ? 'ok' : 'bad' },
        { label: 'Monthly budget', value: money(budget) },
      ]}
      intro="Add your debts and what you can pay each month. See your debt-free date, the interest you save, and which order clears them fastest."
      actions={
        isPro ? (
          <button type="button" className="btn btn-secondary" onClick={exportCsv} disabled={!chosen.feasible} data-testid="export-debt-csv">
            Export CSV
          </button>
        ) : undefined
      }
    >
      <div className="grid gap-6 items-start">
        <div className="grid gap-6 content-start">
          <Panel title="Your debts">
            <ul className="grid gap-4">
              {debts.map((d, i) => {
                const locked = i >= limit;
                return (
                  <li key={d.id} className={`grid gap-3 md:grid-cols-[minmax(0,1.3fr)_minmax(0,3fr)] md:items-end md:gap-x-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3.5 ${locked ? 'opacity-50' : ''}`}>
                    <div className="flex gap-2">
                      <input aria-label="Debt name" className="input" value={d.name} maxLength={60} onChange={(e) => update(d.id, { name: e.target.value })} />
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => remove(d.id)} aria-label={`Remove ${d.name}`}>
                        ✕
                      </button>
                    </div>
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(6.5rem,1fr))] gap-2.5">
                      <NumberField label="Balance" prefix={symbol} value={d.balance} onChange={(n) => update(d.id, { balance: n })} />
                      <NumberField label="Rate" suffix="%" value={d.aprPct} onChange={(n) => update(d.id, { aprPct: n })} max={100} />
                      <NumberField label="Minimum" prefix={symbol} value={d.minPayment} onChange={(n) => update(d.id, { minPayment: n })} />
                    </div>
                  </li>
                );
              })}
            </ul>
            {debts.length < limit ? (
              <button type="button" className="btn btn-secondary btn-sm mt-4" onClick={add} data-testid="add-debt">
                + Add a debt
              </button>
            ) : (
              <p className="hint mt-4" data-testid="debt-limit">
                The free plan plans up to {FREE_LIMITS.debts} debts. <a href="/pricing/" className="link">Pro</a> has no limit.
              </p>
            )}
          </Panel>
          <Panel title="Your monthly budget">
            <div className="grid gap-4 md:grid-cols-2 items-start">
            <NumberField label="Extra on top of the minimums" value={extra} onChange={setExtra} hint={`Minimums total ${money(minTotal)}. You will pay ${money(budget)} a month.`} testId="in-extra" />
            <div>
              <label className="label" htmlFor="strategy">
                Strategy
              </label>
              <select id="strategy" className="input" value={strategy} onChange={(e) => setStrategy(e.target.value as DebtStrategy)}>
                {(['avalanche', 'snowball', 'custom'] as DebtStrategy[]).map((s) => (
                  <option key={s} value={s}>
                    {STRATEGY_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>
            </div>
          </Panel>
        </div>

        <div className="grid gap-6 content-start">
          {!chosen.feasible ? (
            <p className="notice notice-danger" role="alert" data-testid="debt-infeasible">
              {chosen.reason}
            </p>
          ) : (
            <Panel testId="debt-result">
              <div className="grid gap-3 sm:grid-cols-3">
                <Stat label="Debt-free in" value={months(chosen.months)} tone="ok" testId="debt-free-in" />
                <Stat label="Total interest" value={money(chosen.totalInterest)} testId="debt-interest" />
                <Stat
                  label="Saved vs minimums"
                  value={cmp.minimum.feasible ? money(Math.max(0, cmp.minimum.totalInterest - chosen.totalInterest)) : 'Minimums never finish'}
                  tone="ok"
                  sub={cmp.minimum.feasible ? `${months(Math.max(0, cmp.minimum.months - chosen.months))} sooner` : undefined}
                  testId="debt-saved"
                />
              </div>
              <p className="mt-4 mb-0 text-sm text-zinc-300">
                {cmp.best === 'avalanche' && cmp.snowball.feasible && cmp.avalanche.feasible
                  ? `Avalanche costs ${money(cmp.snowball.totalInterest - cmp.avalanche.totalInterest)} less interest than snowball. Snowball clears your first debt sooner, which some people find easier to stick with.`
                  : 'Both orders cost about the same here, so pick the one you will stick with.'}
              </p>
              <h3 className="label mt-6">Payoff order</h3>
              <ol className="grid gap-1 text-sm">
                {[...chosen.payoffs]
                  .sort((a, b) => (a.month ?? 1e9) - (b.month ?? 1e9))
                  .map((p) => (
                    <li key={p.id} className="flex flex-wrap justify-between gap-x-3 gap-y-0.5 rounded-xl bg-white/[0.03] border border-white/[0.05] px-3 py-2">
                      <span className="font-medium text-white">{p.name}</span>
                      <span className="tabular-nums text-zinc-300 text-right">
                        {months(p.month)} · interest {money(p.interest)}
                      </span>
                    </li>
                  ))}
              </ol>
            </Panel>
          )}

          <ProGate feature="What-if and month-by-month schedule" detail="Test an extra payment, see the balance fall month by month, compare strategies on a chart and export the schedule to CSV." testId="debt-pro-gate">
            <Panel title="What if I paid more?" testId="debt-whatif">
              <NumberField label="Extra each month" value={whatIf} onChange={setWhatIf} testId="in-whatif" />
              {whatIfPlan && whatIfPlan.feasible && chosen.feasible && (
                <p className="mt-3 mb-0 text-emerald-300" data-testid="whatif-result">
                  Paying {money(whatIf)} more a month makes you debt-free {months(chosen.months - whatIfPlan.months)} sooner and saves {money(chosen.totalInterest - whatIfPlan.totalInterest)} in interest.
                </p>
              )}
              {chosen.feasible && (
                <div className="mt-6">
                  <LineChart
                    ariaLabel="Total balance over time for each strategy"
                    series={[
                      { name: 'Your plan', colour: '#6f9a62', points: sample(chosen) },
                      ...(cmp.minimum.feasible ? [{ name: 'Minimums only', colour: '#c8553f', points: sample(cmp.minimum) }] : []),
                      ...(whatIfPlan?.feasible ? [{ name: 'With what-if', colour: '#5b7a99', points: sample(whatIfPlan) }] : []),
                    ]}
                    xLabel={(i) => `M${i * step}`}
                    yLabel={money}
                  />
                </div>
              )}
              <details className="mt-6">
                <summary className="cursor-pointer text-sm text-zinc-300">Month-by-month schedule ({chosen.schedule.length} months)</summary>
                <div className="max-h-80 overflow-auto mt-3">
                  <table className="w-full text-sm tabular-nums">
                    <thead className="text-zinc-400 text-left">
                      <tr>
                        <th className="py-1">Month</th>
                        <th>Paid</th>
                        <th>Interest</th>
                        <th>Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chosen.schedule.map((m) => (
                        <tr key={m.month} className="border-t border-white/[0.05]">
                          <td className="py-1">{m.month}</td>
                          <td>{money(m.paid)}</td>
                          <td>{money(m.interest)}</td>
                          <td>{money(m.balance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </Panel>
          </ProGate>
        </div>
      </div>
    </ToolPage>
  );
}
