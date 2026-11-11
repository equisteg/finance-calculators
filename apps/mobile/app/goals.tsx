import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { exampleGoals, FREE_LIMITS, isGoalList, KEYS, limitFor, planGoals, toCsv, type Goal } from '@finealth/finance-core';
import { usePro } from '@/components/ProProvider';
import { Bar, Button, Card, Notice, NumberField, Screen, Stat, Stats, useStyles } from '@/components/ui';
import { shareText } from '@/lib/files';
import { useMoney } from '@/lib/money';
import { usePersistent } from '@/lib/storage';
import { newId } from '@/lib/store';
import { radius, space, TOUCH } from '@/theme';

const isNullableGoals = (v: unknown): v is Goal[] | null => v === null || isGoalList(v);

export default function GoalsScreen() {
  const { p } = useStyles();
  const { currency, money } = useMoney();
  const { isPro } = usePro();
  const [stored, setStored] = usePersistent<Goal[] | null>(KEYS.goals, null, isNullableGoals);
  const goals = stored ?? exampleGoals(currency);
  const limit = limitFor('goals', isPro);
  const active = goals.slice(0, limit);
  const [budget, setBudget] = useState(currency === 'INR' ? 40_000 : 2_000);
  const [exportMsg, setExportMsg] = useState<string | null>(null);
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
  const exportCsv = async () => {
    const csv = toCsv(
      ['Priority', 'Goal', 'Cost today', 'Years', 'Future cost', 'Monthly needed', 'Allocated'],
      plan.goals.map((g, i) => [i + 1, g.name, active[i].costToday, active[i].years, g.futureCost, g.monthlyNeeded, g.allocated])
    );
    setExportMsg((await shareText('finealth-goals.csv', csv, 'text/csv')) ? null : 'Sharing is not available on this phone.');
  };

  return (
    <Screen title="Goal planner" intro="Tell us what you are saving for. We work out what it will really cost after inflation and the monthly saving that gets you there." testID="screen-goals">
      <Card title="Your monthly saving budget">
        <NumberField label="I can save each month" value={budget} onChange={setBudget} testID="in-goal-budget" />
        <Stats>
          <Stat label="Needed for these goals" value={money(plan.totalNeeded)} testID="goals-needed" />
          <Stat label={plan.surplus >= 0 ? 'Left over' : 'Shortfall'} value={money(Math.abs(plan.surplus))} tone={plan.surplus >= 0 ? 'ok' : 'bad'} testID="goals-surplus" />
        </Stats>
        <Text style={{ color: p.muted, fontSize: 13 }}>
          Goals are funded from the top down. {plan.surplus < 0 ? 'Push a goal out a few years, lower its cost, or raise the budget to close the gap.' : 'Every goal is covered.'}
        </Text>
      </Card>

      {goals.map((g, i) => {
        const r = plan.goals[i];
        const locked = i >= limit;
        return (
          <Card key={g.id} testID={`goal-${i}`} style={{ opacity: locked ? 0.6 : 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <Text style={{ color: p.accent, fontWeight: '700' }}>#{i + 1}</Text>
              <TextInput
                accessibilityLabel="Goal name"
                value={g.name}
                editable={!locked}
                maxLength={60}
                onChangeText={(t) => update(g.id, { name: t })}
                style={{ flex: 1, minHeight: TOUCH, color: p.fg, borderWidth: 1, borderColor: p.lineHi, borderRadius: radius.sm, paddingHorizontal: space.md, backgroundColor: p.surface, fontSize: 16 }}
              />
              {isPro ? (
                <>
                  <IconButton label={`Move ${g.name} up`} glyph="↑" onPress={() => move(i, -1)} disabled={i === 0} />
                  <IconButton label={`Move ${g.name} down`} glyph="↓" onPress={() => move(i, 1)} disabled={i === goals.length - 1} />
                </>
              ) : null}
              <IconButton label={`Remove ${g.name}`} glyph="✕" onPress={() => remove(g.id)} />
            </View>
            {locked ? (
              <Text testID={`goal-${i}-locked`} style={{ color: p.warn }}>
                Saved, but not planned on the free plan. It comes back with Pro.
              </Text>
            ) : (
              <>
                <NumberField label="Cost today" value={g.costToday} onChange={(n) => update(g.id, { costToday: n })} />
                <NumberField label="In years" value={g.years} onChange={(n) => update(g.id, { years: Math.round(n) })} max={60} />
                <NumberField label="Saved so far" value={g.currentSavings} onChange={(n) => update(g.id, { currentSavings: n })} />
                <NumberField label="Inflation" suffix="%" value={g.inflationPct} onChange={(n) => update(g.id, { inflationPct: n })} max={30} />
                <NumberField label="Expected return" suffix="%" value={g.returnPct} onChange={(n) => update(g.id, { returnPct: n })} max={30} />
                {isPro ? <NumberField label="Yearly step-up" suffix="%" value={g.stepUpPct ?? 0} onChange={(n) => update(g.id, { stepUpPct: n })} max={50} /> : null}
              </>
            )}
            {r ? (
              <View style={{ gap: 6 }}>
                <Text testID={`goal-${i}-result`} style={{ color: p.fg, lineHeight: 20 }}>
                  Will cost <Text style={{ fontWeight: '700' }}>{money(r.futureCost)}</Text> in {g.years} years. Save{' '}
                  <Text style={{ fontWeight: '700', color: p.ok }}>{money(r.monthlyNeeded)}</Text> a month{g.stepUpPct ? ` (rising ${g.stepUpPct} % a year)` : ''}.
                </Text>
                <Bar value={r.funded} tone={r.funded >= 1 ? 'ok' : r.funded >= 0.5 ? 'warn' : 'bad'} label={`${g.name} funded ${Math.round(r.funded * 100)} percent`} />
                <Text style={{ color: p.muted, fontSize: 12 }}>
                  Your budget covers {Math.round(r.funded * 100)} % ({money(r.allocated)} a month).
                </Text>
              </View>
            ) : null}
          </Card>
        );
      })}

      {goals.length < limit ? (
        <Button title="+ Add a goal" kind="secondary" onPress={add} testID="add-goal" />
      ) : (
        <Notice testID="goal-limit">The free plan plans {FREE_LIMITS.goals} goal at a time. Pro plans every goal from one budget, in priority order, with yearly step-ups and CSV export.</Notice>
      )}
      {stored !== null ? <Button title="Reset to the example" kind="secondary" onPress={() => setStored(null)} /> : null}
      {isPro ? <Button title="Export CSV" onPress={exportCsv} testID="export-goals-csv" /> : null}
      {exportMsg ? <Notice>{exportMsg}</Notice> : null}
    </Screen>
  );
}

function IconButton(props: { label: string; glyph: string; onPress: () => void; disabled?: boolean }) {
  const { p } = useStyles();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={props.label} accessibilityState={{ disabled: !!props.disabled }} disabled={props.disabled} onPress={props.onPress} style={{ width: TOUCH, height: TOUCH, alignItems: 'center', justifyContent: 'center', opacity: props.disabled ? 0.35 : 1 }}>
      <Text style={{ color: props.glyph === '✕' ? p.bad : p.fg, fontSize: 18 }}>{props.glyph}</Text>
    </Pressable>
  );
}
