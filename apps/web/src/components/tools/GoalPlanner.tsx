'use client';

import { useState } from 'react';
import { FREE_LIMITS, limitFor, planGoals, toCsv, type Goal, exampleGoals } from '@finealth/finance-core';
import { download, isGoalList, KEYS, newId } from '@/lib/storage';
import { usePersistent } from '@/lib/usePersistent';
import { usePro } from '../ProProvider';
import { Bar, NumberField, Panel, Stat, ToolPage, useMoney } from '../ui';
import { AREA_ICON } from '../GlassIcon';


const isNullableGoals = (v: unknown): v is Goal[] | null => v === null || isGoalList(v);

export function GoalPlanner() {
  const { currency, money } = useMoney();
  const { isPro } = usePro();
  const [stored, setStored] = usePersistent<Goal[] | null>(KEYS.goals, null, isNullableGoals);
  const goals = stored ?? exampleGoals(currency);
  const limit = limitFor('goals', isPro);
  const active = goals.slice(0, limit);
  const [budget, setBudget] = useState(currency === 'INR' ? 40_000 : 2_000);
  const plan = planGoals(active, budget);

  const update = (id: string, patch: Partial<Goal>) => setStored(goals.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  const remove = (id: string) => setStored(goals.filter((g) => g.id !== id));
  const move = (i: number, dir: -1 | 1) => {
    const next = [...goals];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setStored(next);
  };
  const add = () =>
    setStored([...goals, { id: newId(), name: `Goal ${goals.length + 1}`, costToday: currency === 'INR' ? 500_000 : 20_000, years: 5, inflationPct: currency === 'INR' ? 6 : 3, returnPct: 8, currentSavings: 0, stepUpPct: 0 }]);

  const exportCsv = () =>
    download(
      'finealth-goals.csv',
      toCsv(
        ['Priority', 'Goal', 'Cost today', 'Years', 'Future cost', 'Monthly needed', 'Allocated'],
        plan.goals.map((g, i) => [i + 1, g.name, active[i].costToday, active[i].years, g.futureCost, g.monthlyNeeded, g.allocated]),
      ),
      'text/csv',
    );

  return (
    <ToolPage
      icon={AREA_ICON['/goal-planner/']}
      eyebrow="Inflation-adjusted · priority funding"
      title="Goal Planner"
      kpis={[
        { label: 'Goals planned', value: `${active.length} of ${goals.length}` },
        { label: 'Need each month', value: money(plan.totalNeeded) },
        { label: plan.surplus >= 0 ? 'Left over' : 'Short by', value: money(Math.abs(plan.surplus)), tone: plan.surplus >= 0 ? 'ok' : 'bad' },
      ]}
      intro="Tell us what you are saving for. We work out what it will really cost after inflation and the monthly saving that gets you there."
      actions={
        isPro ? (
          <button type="button" className="btn btn-secondary" onClick={exportCsv} data-testid="export-goals-csv">
            Export CSV
          </button>
        ) : undefined
      }
    >
      <div className="grid gap-6 items-start">
        <div className="grid gap-4 content-start">
          {goals.map((g, i) => {
            const p = plan.goals[i];
            const locked = i >= limit;
            return (
              <Panel key={g.id} testId={`goal-${i}`}>
                <div className="flex gap-2 mb-4">
                  <span className="pill pill-ok self-center">#{i + 1}</span>
                  <input aria-label="Goal name" className="input" value={g.name} maxLength={60} disabled={locked} onChange={(e) => update(g.id, { name: e.target.value })} />
                  {isPro && (
                    <>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => move(i, -1)} aria-label={`Move ${g.name} up`} disabled={i === 0}>
                        ↑
                      </button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => move(i, 1)} aria-label={`Move ${g.name} down`} disabled={i === goals.length - 1}>
                        ↓
                      </button>
                    </>
                  )}
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => remove(g.id)} aria-label={`Remove ${g.name}`}>
                    ✕
                  </button>
                </div>
                {locked && (
                  <p className="m-0 mb-3 text-sm text-amber-300" data-testid={`goal-${i}-locked`}>
                    Saved, but not planned on the free plan. It comes back with Pro.
                  </p>
                )}
                <fieldset disabled={locked} className="m-0 p-0 border-0 min-w-0 disabled:opacity-60">
                <div className="fieldgrid grid gap-x-3 gap-y-3">
                  <NumberField label="Cost today" value={g.costToday} onChange={(n) => update(g.id, { costToday: n })} />
                  <NumberField label="In years" value={g.years} onChange={(n) => update(g.id, { years: Math.min(60, n) })} max={60} step={1} />
                  <NumberField label="Saved so far" value={g.currentSavings} onChange={(n) => update(g.id, { currentSavings: n })} />
                  <NumberField label="Inflation" suffix="%" value={g.inflationPct} onChange={(n) => update(g.id, { inflationPct: n })} max={30} />
                  <NumberField label="Expected return" suffix="%" value={g.returnPct} onChange={(n) => update(g.id, { returnPct: n })} max={30} />
                  {isPro && <NumberField label="Yearly step-up" suffix="%" value={g.stepUpPct ?? 0} onChange={(n) => update(g.id, { stepUpPct: n })} max={50} />}
                </div>
                </fieldset>
                {p && (
                  <div className="mt-4 grid gap-2">
                    <p className="m-0 text-sm text-zinc-300" data-testid={`goal-${i}-result`}>
                      Will cost <strong className="text-white">{money(p.futureCost)}</strong> in {g.years} years. Save{' '}
                      <strong className="text-emerald-300">{money(p.monthlyNeeded)}</strong> a month{g.stepUpPct ? ` (rising ${g.stepUpPct} % a year)` : ''}.
                    </p>
                    <Bar value={p.funded} tone={p.funded >= 1 ? 'ok' : p.funded >= 0.5 ? 'warn' : 'bad'} />
                    <p className="m-0 text-xs text-zinc-400">
                      Your budget covers {Math.round(p.funded * 100)} % ({money(p.allocated)} a month).
                    </p>
                  </div>
                )}
              </Panel>
            );
          })}
          {goals.length < limit ? (
            <button type="button" className="btn btn-secondary" onClick={add} data-testid="add-goal">
              + Add a goal
            </button>
          ) : (
            <p className="notice notice-warn m-0" data-testid="goal-limit">
              The free plan plans {FREE_LIMITS.goals} goal at a time. <a href="/pricing/" className="link">Pro</a> plans every goal from one budget, in priority order, with yearly step-ups and CSV export.
            </p>
          )}
        </div>

        <div className="grid gap-6 content-start">
          <Panel title="Your monthly saving budget">
            <NumberField label="I can save each month" value={budget} onChange={setBudget} testId="in-goal-budget" />
            <div className="fitgrid grid gap-3 grid-cols-[repeat(auto-fit,minmax(min(10rem,100%),1fr))] mt-4">
              <Stat label="Needed for these goals" value={money(plan.totalNeeded)} testId="goals-needed" />
              <Stat
                label={plan.surplus >= 0 ? 'Left over' : 'Shortfall'}
                value={money(Math.abs(plan.surplus))}
                tone={plan.surplus >= 0 ? 'ok' : 'bad'}
                testId="goals-surplus"
              />
            </div>
            <p className="hint">
              Goals are funded from the top down. {plan.surplus < 0 ? 'Push a goal out a few years, lower its cost, or raise the budget to close the gap.' : 'Every goal is covered.'}
            </p>
          </Panel>
        </div>
      </div>
    </ToolPage>
  );
}
