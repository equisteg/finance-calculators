'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { financialHealth, FREE_LIMITS, type HealthInput } from '@finealth/finance-core';
import { isHealthInput, isSnapshotList, KEYS, load, save, type Snapshot } from '@/lib/storage';
import { usePersistent } from '@/lib/usePersistent';
import { usePro } from '../ProProvider';
import { Bar, NumberField, Panel, ProGate, ScoreRing, ToolPage, useMoney, type ToolCurrency } from '../ui';
import { AREA_ICON } from '../GlassIcon';

/** Example household per currency so the first visit shows a real result. */
export function exampleHealth(currency: ToolCurrency): HealthInput {
  const k = currency === 'INR' ? 1 : 1 / 20;
  const r = (n: number) => Math.round(n * k);
  return {
    monthlyIncome: r(100_000),
    monthlyExpenses: r(60_000),
    monthlyDebtPayments: r(15_000),
    emergencyFund: r(225_000),
    costlyDebt: r(60_000),
    investments: r(1_200_000),
    age: 35,
    dependents: 2,
    lifeCover: r(5_000_000),
    hasHealthCover: true,
  };
}

const isNullableHealth = (v: unknown): v is HealthInput | null => v === null || isHealthInput(v);
const STATUS_TONE = { good: 'ok', fair: 'warn', poor: 'bad' } as const;

export function HealthCheck() {
  const { currency, money } = useMoney();
  const { isPro } = usePro();
  const [stored, setStored, loaded] = usePersistent<HealthInput | null>(KEYS.health, null, isNullableHealth);
  const input = stored ?? exampleHealth(currency);
  const set = (patch: Partial<HealthInput>) => setStored({ ...input, ...patch });
  const report = useMemo(() => financialHealth(input, money), [input, money]);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- read browser-only storage after mount so server HTML and the first client render match
  useEffect(() => setSnapshots(load(KEYS.snapshots, [], isSnapshotList)), []);

  const actionsShown = isPro ? report.actions : report.actions.slice(0, FREE_LIMITS.healthActions);
  const netWorth = input.emergencyFund + input.investments - input.costlyDebt;

  const saveSnapshot = () => {
    const snap: Snapshot = {
      at: new Date().toISOString(),
      score: report.score,
      pillars: Object.fromEntries(report.pillars.map((p) => [p.id, p.score])),
      currency,
      netWorth,
    };
    const next = [...snapshots, snap].slice(-500);
    save(KEYS.snapshots, next);
    setSnapshots(next);
    setSavedAt(snap.at);
  };

  return (
    <ToolPage
      icon={AREA_ICON['/health-check/']}
      eyebrow="Free · 2 minutes · nothing leaves your device"
      title="Financial Health Check"
      intro={
        <>
          Answer ten questions and get a score out of 100, built from six rules of thumb that money professionals use.
          {!loaded || stored === null ? ' The numbers below are an example household: replace them with yours.' : ''}
        </>
      }
      actions={
        isPro ? (
          <>
            <button type="button" className="btn btn-secondary" onClick={() => window.print()} data-testid="print-report">
              Print / save PDF
            </button>
            <button type="button" className="btn btn-primary" onClick={saveSnapshot} data-testid="save-snapshot">
              Save snapshot
            </button>
          </>
        ) : undefined
      }
    >
      {savedAt && (
        <p className="notice notice-ok mb-6" role="status">
          Snapshot saved on this device. See your progress on <Link href="/my-plan/" className="link">My Plan</Link>.
        </p>
      )}
      <div className="grid gap-6 md:grid-cols-12 items-start">
        <Panel title="Your numbers (per month unless stated)" className="md:col-span-5 no-print">
          <div className="grid gap-4 grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
            <NumberField label="Take-home income" value={input.monthlyIncome} onChange={(n) => set({ monthlyIncome: n })} testId="in-income" />
            <NumberField label="Spending" hint="Everything except loan payments" value={input.monthlyExpenses} onChange={(n) => set({ monthlyExpenses: n })} testId="in-expenses" />
            <NumberField label="Loan & card payments" hint="EMIs and minimum card payments" value={input.monthlyDebtPayments} onChange={(n) => set({ monthlyDebtPayments: n })} testId="in-debtpay" />
            <NumberField label="Emergency savings" hint="Cash you can reach this week" value={input.emergencyFund} onChange={(n) => set({ emergencyFund: n })} testId="in-fund" />
            <NumberField label="Costly debt balance" hint="Cards, personal loans" value={input.costlyDebt} onChange={(n) => set({ costlyDebt: n })} testId="in-costly" />
            <NumberField label="Long-term investments" hint="Retirement accounts, funds, shares" value={input.investments} onChange={(n) => set({ investments: n })} testId="in-invest" />
            <NumberField label="Your age" value={input.age} onChange={(n) => set({ age: n })} max={100} step={1} testId="in-age" />
            <NumberField label="People who depend on you" value={input.dependents} onChange={(n) => set({ dependents: n })} max={20} step={1} />
            <NumberField label="Term life cover" hint="Total sum assured" value={input.lifeCover} onChange={(n) => set({ lifeCover: n })} />
            <div>
              <span className="label">Health insurance</span>
              <div className="flex gap-2" role="group" aria-label="Health insurance">
                {[true, false].map((v) => (
                  <button key={String(v)} type="button" aria-pressed={input.hasHealthCover === v} className={`btn btn-sm ${input.hasHealthCover === v ? 'btn-primary' : 'btn-secondary'}`} onClick={() => set({ hasHealthCover: v })}>
                    {v ? 'Yes' : 'No'}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {stored !== null && (
            <button type="button" className="btn btn-ghost btn-sm mt-4" onClick={() => setStored(null)}>
              Reset to the example
            </button>
          )}
        </Panel>

        <div className="md:col-span-7 grid gap-6 content-start print-dark-text">
          <Panel testId="health-result">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <ScoreRing score={report.score} label={report.grade} />
              <div className="grid gap-2 text-center sm:text-left">
                <h2 className="text-2xl font-bold text-white" data-testid="health-grade">
                  {report.grade}
                </h2>
                <p className="m-0 text-zinc-400">
                  {report.metrics.monthlySurplus >= 0
                    ? `You keep ${money(report.metrics.monthlySurplus)} a month after spending and loan payments.`
                    : `You are short by ${money(-report.metrics.monthlySurplus)} a month.`}
                </p>
                <p className="m-0 text-xs font-mono text-zinc-500">Net worth estimate: {money(netWorth)} (savings + investments − costly debt)</p>
              </div>
            </div>
          </Panel>

          <Panel title={isPro ? 'Your action plan' : 'Your top priority'} testId="health-actions">
            {actionsShown.length === 0 ? (
              <p className="m-0 text-emerald-300">Every rule of thumb is met. Keep going, and re-check once a quarter.</p>
            ) : (
              <ol className="grid gap-4">
                {actionsShown.map((a, i) => (
                  <li key={a.pillar} className="grid gap-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="font-bold text-white">
                        {i + 1}. {a.title}
                      </h3>
                      <span className="text-xs font-mono text-emerald-300 shrink-0">+{a.pointsAvailable} pts</span>
                    </div>
                    <p className="m-0 text-sm text-zinc-300">{a.detail}</p>
                  </li>
                ))}
              </ol>
            )}
          </Panel>

          <ProGate
            feature={`Full report: all six pillars and ${Math.max(0, report.actions.length - 1)} more actions`}
            detail="See exactly where each point comes from, every action ranked by impact, print it as a PDF and save snapshots to track your score over time."
            testId="health-pro-gate"
          >
            <Panel title="Six pillars" testId="health-pillars">
              <ul className="grid gap-4">
                {report.pillars.map((p) => (
                  <li key={p.id} className="grid gap-1.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-semibold text-white">{p.title}</span>
                      <span className="font-mono text-sm text-zinc-300">{p.score}/100</span>
                    </div>
                    <Bar value={p.score / 100} tone={STATUS_TONE[p.status]} />
                    <p className="m-0 text-xs text-zinc-400">
                      You: {p.measure} · Rule of thumb: {p.target} · Weight {Math.round(p.weight * 100)} %
                    </p>
                  </li>
                ))}
              </ul>
            </Panel>
          </ProGate>
        </div>
      </div>
    </ToolPage>
  );
}
