import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import * as Print from 'expo-print';
import { exampleHealth, financialHealth, FREE_LIMITS, isHealthInput, isSnapshotList, KEYS, type HealthInput, type Snapshot } from '@finealth/finance-core';
import { usePro } from '@/components/ProProvider';
import { ScoreRing } from '@/components/ScoreRing';
import { Bar, Button, Card, Notice, NumberField, ProGate, Screen, Segmented, Stat, Stats, useStyles } from '@/components/ui';
import { useMoney } from '@/lib/money';
import { reportHtml } from '@/lib/report';
import { usePersistent } from '@/lib/storage';

const isNullableHealth = (v: unknown): v is HealthInput | null => v === null || isHealthInput(v);
const TONE = { good: 'ok', fair: 'warn', poor: 'bad' } as const;

export default function HealthScreen() {
  const { p } = useStyles();
  const { currency, money } = useMoney();
  const { isPro } = usePro();
  const [stored, setStored] = usePersistent<HealthInput | null>(KEYS.health, null, isNullableHealth);
  const input = stored ?? exampleHealth(currency);
  const set = (patch: Partial<HealthInput>) => setStored({ ...input, ...patch });
  const report = useMemo(() => financialHealth(input, money), [input, money]);
  const [snapshots, setSnapshots] = usePersistent<Snapshot[]>(KEYS.snapshots, [], isSnapshotList);
  const [saved, setSaved] = useState(false);
  const actions = isPro ? report.actions : report.actions.slice(0, FREE_LIMITS.healthActions);
  const netWorth = input.emergencyFund + input.investments - input.costlyDebt;

  const saveSnapshot = () => {
    const snap: Snapshot = { at: new Date().toISOString(), score: report.score, pillars: Object.fromEntries(report.pillars.map((x) => [x.id, x.score])), currency, netWorth };
    setSnapshots([...snapshots, snap].slice(-500));
    setSaved(true);
  };

  return (
    <Screen
      title="Financial health check"
      intro={`Answer ten questions and get a score out of 100, built from six rules of thumb.${stored === null ? ' The numbers below are an example household: replace them with yours.' : ''}`}
      testID="screen-health"
    >
      <Card testID="health-result">
        <View style={{ alignItems: 'center', gap: 8 }}>
          <ScoreRing score={report.score} grade={report.grade} />
          <Text testID="health-grade" style={{ color: p.fg, fontSize: 22, fontWeight: '700' }}>
            {report.grade}
          </Text>
          <Text style={{ color: p.muted, textAlign: 'center' }}>
            {report.metrics.monthlySurplus >= 0 ? `You keep ${money(report.metrics.monthlySurplus)} a month after spending and loan payments.` : `You are short by ${money(-report.metrics.monthlySurplus)} a month.`}
          </Text>
          <Text style={{ color: p.muted, fontSize: 12 }}>Net worth estimate: {money(netWorth)}</Text>
        </View>
        <Stats>
          <Stat label="Savings rate" value={`${Math.round(report.metrics.savingsRate * 100)} %`} tone={report.metrics.savingsRate >= 0.2 ? 'ok' : 'bad'} />
          <Stat label="Emergency fund" value={`${report.metrics.emergencyMonths.toFixed(1)} mo`} tone={report.metrics.emergencyMonths >= 6 ? 'ok' : 'bad'} />
          <Stat label="Loan payments" value={`${Math.round(report.metrics.debtToIncome * 100)} % of pay`} tone={report.metrics.debtToIncome > 0.36 ? 'bad' : report.metrics.debtToIncome <= 0.1 ? 'ok' : undefined} />
        </Stats>
      </Card>

      <Card title={isPro ? 'Your action plan' : 'Your top priority'} testID="health-actions">
        {actions.length === 0 ? (
          <Text style={{ color: p.ok }}>Every rule of thumb is met. Keep going, and re-check once a quarter.</Text>
        ) : (
          actions.map((a, i) => (
            <View key={a.pillar} style={{ gap: 2 }}>
              <Text style={{ color: p.fg, fontWeight: '700' }}>
                {i + 1}. {a.title} <Text style={{ color: p.ok, fontWeight: '600' }}>+{a.pointsAvailable} pts</Text>
              </Text>
              <Text style={{ color: p.muted, lineHeight: 20 }}>{a.detail}</Text>
            </View>
          ))
        )}
        {!isPro && report.actions.length > 1 ? (
          <Text style={{ color: p.muted, fontSize: 13 }}>
            {report.actions.length - 1} more {report.actions.length === 2 ? 'action is' : 'actions are'} ranked in the full report.
          </Text>
        ) : null}
      </Card>

      <Card title="Your numbers (per month unless stated)">
        <NumberField label="Take-home income" value={input.monthlyIncome} onChange={(n) => set({ monthlyIncome: n })} testID="in-income" />
        <NumberField label="Spending" hint="Everything except loan payments" value={input.monthlyExpenses} onChange={(n) => set({ monthlyExpenses: n })} testID="in-expenses" />
        <NumberField label="Loan & card payments" hint="EMIs and minimum card payments" value={input.monthlyDebtPayments} onChange={(n) => set({ monthlyDebtPayments: n })} testID="in-debtpay" />
        <NumberField label="Emergency savings" hint="Cash you can reach this week" value={input.emergencyFund} onChange={(n) => set({ emergencyFund: n })} testID="in-fund" />
        <NumberField label="Costly debt balance" hint="Cards, personal loans" value={input.costlyDebt} onChange={(n) => set({ costlyDebt: n })} testID="in-costly" />
        <NumberField label="Long-term investments" hint="Retirement accounts, funds, shares" value={input.investments} onChange={(n) => set({ investments: n })} testID="in-invest" />
        <NumberField label="Your age" value={input.age} onChange={(n) => set({ age: Math.round(n) })} max={100} testID="in-age" />
        <NumberField label="People who depend on you" value={input.dependents} onChange={(n) => set({ dependents: Math.round(n) })} max={20} />
        <NumberField label="Term life cover" hint="Total sum assured" value={input.lifeCover} onChange={(n) => set({ lifeCover: n })} />
        <Segmented
          label="Health insurance"
          value={input.hasHealthCover ? 'yes' : 'no'}
          options={[
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' },
          ]}
          onChange={(v) => set({ hasHealthCover: v === 'yes' })}
          testID="in-healthcover"
        />
        {stored !== null ? <Button title="Reset to the example" kind="secondary" onPress={() => setStored(null)} /> : null}
      </Card>

      {isPro ? (
        <>
          <Card title="Six pillars" testID="health-pillars">
            {report.pillars.map((x) => (
              <View key={x.id} style={{ gap: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: p.fg, fontWeight: '600' }}>{x.title}</Text>
                  <Text style={{ color: p.muted }}>{x.score}/100</Text>
                </View>
                <Bar value={x.score / 100} tone={TONE[x.status]} label={`${x.title} ${x.score} out of 100`} />
                <Text style={{ color: p.muted, fontSize: 12 }}>
                  You: {x.measure} · Rule of thumb: {x.target} · Weight {Math.round(x.weight * 100)} %
                </Text>
              </View>
            ))}
          </Card>
          <Card title="Track your progress">
            {saved ? <Notice tone="ok">Snapshot saved on this phone.</Notice> : null}
            <Button title="Save snapshot" onPress={saveSnapshot} testID="save-snapshot" />
            <Button title="Print or save as PDF" kind="secondary" onPress={() => Print.printAsync({ html: reportHtml(report, money) }).catch(() => undefined)} testID="print-report" />
            {snapshots.slice(-5).reverse().map((s) => (
              <Text key={s.at} style={{ color: p.muted }}>
                {s.at.slice(0, 10)} · score {s.score}
              </Text>
            ))}
          </Card>
        </>
      ) : (
        <ProGate
          title={`Full report: all six pillars and ${Math.max(0, report.actions.length - 1)} more actions`}
          detail="See where each point comes from, every action ranked by impact, print it as a PDF and save snapshots to track your score."
          testID="health-pro-gate"
        />
      )}
    </Screen>
  );
}
