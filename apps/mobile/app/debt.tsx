import { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { compareDebtStrategies, exampleDebts, FREE_LIMITS, isDebtList, KEYS, limitFor, planDebtPayoff, toCsv, type Debt, type DebtStrategy } from '@finealth/finance-core';
import { usePro } from '@/components/ProProvider';
import { Button, Card, Notice, NumberField, ProGate, Screen, Segmented, Stat, Stats, useStyles } from '@/components/ui';
import { shareText } from '@/lib/files';
import { useMoney } from '@/lib/money';
import { usePersistent } from '@/lib/storage';
import { newId } from '@/lib/store';
import { radius, space, TOUCH } from '@/theme';

const isNullableDebts = (v: unknown): v is Debt[] | null => v === null || isDebtList(v);
const months = (m: number | null) => (m === null ? 'never' : m < 12 ? `${m} mo` : `${Math.floor(m / 12)} yr ${m % 12} mo`);

export default function DebtScreen() {
  const { p } = useStyles();
  const { currency, money } = useMoney();
  const { isPro } = usePro();
  const [stored, setStored] = usePersistent<Debt[] | null>(KEYS.debts, null, isNullableDebts);
  const debts = stored ?? exampleDebts(currency);
  const limit = limitFor('debts', isPro);
  // Free plan: only the first FREE_LIMITS.debts debts are planned (extra rows stay saved and come back with Pro).
  const active = useMemo(() => debts.slice(0, limit), [debts, limit]);
  const minTotal = active.reduce((s, d) => s + d.minPayment, 0);
  const [extra, setExtra] = useState(Math.round(minTotal * 0.25));
  const [whatIf, setWhatIf] = useState(0);
  const [strategy, setStrategy] = useState<DebtStrategy>('avalanche');
  const [showSchedule, setShowSchedule] = useState(false);
  const [exportMsg, setExportMsg] = useState<string | null>(null);

  const budget = minTotal + extra;
  const cmp = useMemo(() => compareDebtStrategies(active, budget), [active, budget]);
  const chosen = strategy === 'avalanche' ? cmp.avalanche : strategy === 'snowball' ? cmp.snowball : planDebtPayoff(active, budget, strategy);
  const whatIfPlan = useMemo(() => (whatIf > 0 ? planDebtPayoff(active, budget + whatIf, strategy) : null), [active, budget, whatIf, strategy]);

  const update = (id: string, patch: Partial<Debt>) => setStored(debts.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  const remove = (id: string) => setStored(debts.filter((d) => d.id !== id));
  const add = () => setStored([...debts, { id: newId(), name: `Debt ${debts.length + 1}`, balance: 0, aprPct: 18, minPayment: 0 }]);
  const exportCsv = async () => {
    const rows = chosen.schedule.map((m) => [m.month, m.paid.toFixed(2), m.interest.toFixed(2), m.balance.toFixed(2)]);
    const ok = await shareText('finealth-debt-plan.csv', toCsv(['Month', 'Paid', 'Interest', 'Balance left'], rows), 'text/csv');
    setExportMsg(ok ? null : 'Sharing is not available on this phone.');
  };

  return (
    <Screen title="Debt payoff planner" intro="Add your debts and what you can pay each month. See your debt-free date, the interest you save and which order clears them fastest." testID="screen-debt">
      {!chosen.feasible ? (
        <Notice tone="bad" testID="debt-infeasible">
          {chosen.reason ?? 'This budget cannot clear these debts.'}
        </Notice>
      ) : (
        <Card testID="debt-result">
          <Stats>
            <Stat label="Debt-free in" value={months(chosen.months)} tone="ok" testID="debt-free-in" />
            <Stat label="Total interest" value={money(chosen.totalInterest)} testID="debt-interest" />
            <Stat
              label="Saved vs minimums"
              value={cmp.minimum.feasible ? money(Math.max(0, cmp.minimum.totalInterest - chosen.totalInterest)) : 'Minimums never finish'}
              tone="ok"
              sub={cmp.minimum.feasible ? `${months(Math.max(0, cmp.minimum.months - chosen.months))} sooner` : undefined}
              testID="debt-saved"
            />
          </Stats>
          <Text style={{ color: p.muted, lineHeight: 20 }}>
            {cmp.best === 'avalanche' && cmp.snowball.feasible && cmp.avalanche.feasible && cmp.snowball.totalInterest > cmp.avalanche.totalInterest
              ? `Avalanche costs ${money(cmp.snowball.totalInterest - cmp.avalanche.totalInterest)} less interest than snowball. Snowball clears your first debt sooner, which some people find easier to stick with.`
              : 'Both orders cost about the same here, so pick the one you will stick with.'}
          </Text>
          <Text style={{ color: p.fg, fontWeight: '700' }}>Payoff order</Text>
          {[...chosen.payoffs]
            .sort((a, b) => (a.month ?? 1e9) - (b.month ?? 1e9))
            .map((x) => (
              <View key={x.id} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                <Text style={{ color: p.fg, flex: 1 }}>{x.name}</Text>
                <Text style={{ color: p.muted }}>
                  {months(x.month)} · interest {money(x.interest)}
                </Text>
              </View>
            ))}
        </Card>
      )}

      <Card title="Your debts">
        {debts.map((d, i) => {
          const locked = i >= limit;
          return (
            <View key={d.id} style={{ gap: space.sm, opacity: locked ? 0.5 : 1, borderWidth: 1, borderColor: p.line, borderRadius: radius.md, padding: space.md }}>
              <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
                <TextInput
                  accessibilityLabel="Debt name"
                  value={d.name}
                  maxLength={60}
                  onChangeText={(t) => update(d.id, { name: t })}
                  style={{ flex: 1, minHeight: TOUCH, color: p.fg, borderWidth: 1, borderColor: p.lineHi, borderRadius: radius.sm, paddingHorizontal: space.md, backgroundColor: p.surface, fontSize: 16 }}
                />
                <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${d.name}`} onPress={() => remove(d.id)} style={{ width: TOUCH, height: TOUCH, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: p.bad, fontSize: 18 }}>✕</Text>
                </Pressable>
              </View>
              <NumberField label="Balance" value={d.balance} onChange={(n) => update(d.id, { balance: n })} testID={`debt-${i}-balance`} />
              <NumberField label="Interest rate" suffix="%" value={d.aprPct} onChange={(n) => update(d.id, { aprPct: n })} max={100} testID={`debt-${i}-rate`} />
              <NumberField label="Minimum payment" value={d.minPayment} onChange={(n) => update(d.id, { minPayment: n })} testID={`debt-${i}-min`} />
              {locked ? <Text style={{ color: p.muted, fontSize: 12 }}>Saved, but not planned on the free plan.</Text> : null}
            </View>
          );
        })}
        {debts.length < limit ? (
          <Button title="+ Add a debt" kind="secondary" onPress={add} testID="add-debt" />
        ) : (
          <Text testID="debt-limit" style={{ color: p.muted }}>
            The free plan plans up to {FREE_LIMITS.debts} debts. Pro has no limit.
          </Text>
        )}
        {stored !== null ? <Button title="Reset to the example" kind="secondary" onPress={() => setStored(null)} /> : null}
      </Card>

      <Card title="Your monthly budget">
        <NumberField label="Extra on top of the minimums" value={extra} onChange={setExtra} hint={`Minimums total ${money(minTotal)}. You will pay ${money(budget)} a month.`} testID="in-extra" />
        <Segmented
          label="Strategy"
          value={strategy}
          options={[
            { value: 'avalanche', label: 'Avalanche' },
            { value: 'snowball', label: 'Snowball' },
            { value: 'custom', label: 'My order' },
          ]}
          onChange={setStrategy}
          testID="strategy"
        />
        <Text style={{ color: p.muted, fontSize: 12 }}>Avalanche pays the highest rate first; snowball pays the smallest balance first.</Text>
      </Card>

      {isPro ? (
        <Card title="What if I paid more?" testID="debt-whatif">
          <NumberField label="Extra each month" value={whatIf} onChange={setWhatIf} testID="in-whatif" />
          {whatIfPlan && whatIfPlan.feasible && chosen.feasible ? (
            <Text testID="whatif-result" style={{ color: p.ok, lineHeight: 20 }}>
              Paying {money(whatIf)} more a month makes you debt-free {months(chosen.months - whatIfPlan.months)} sooner and saves {money(chosen.totalInterest - whatIfPlan.totalInterest)} in interest.
            </Text>
          ) : null}
          <Button title={showSchedule ? 'Hide schedule' : `Month-by-month schedule (${chosen.schedule.length} months)`} kind="secondary" onPress={() => setShowSchedule(!showSchedule)} testID="toggle-schedule" />
          {showSchedule
            ? chosen.schedule.slice(0, 600).map((m) => (
                <Text key={m.month} style={{ color: p.muted, fontVariant: ['tabular-nums'], fontSize: 13 }}>
                  M{m.month}: paid {money(m.paid)} · interest {money(m.interest)} · left {money(m.balance)}
                </Text>
              ))
            : null}
          <Button title="Export CSV" onPress={exportCsv} disabled={!chosen.feasible} testID="export-debt-csv" />
          {exportMsg ? <Notice>{exportMsg}</Notice> : null}
        </Card>
      ) : (
        <ProGate title="What-if and month-by-month schedule" detail="Test an extra payment, see the balance fall month by month and export the schedule to CSV. Pro also plans unlimited debts." testID="debt-pro-gate" />
      )}
    </Screen>
  );
}
