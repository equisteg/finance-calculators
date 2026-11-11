import { useMemo, useState } from 'react';
import { Text } from 'react-native';
import { exampleRetirement, isRetirementInput, KEYS, projectRetirement, retirementOdds, type RetirementInput } from '@finealth/finance-core';
import { usePro } from '@/components/ProProvider';
import { Button, Card, NumberField, ProGate, Screen, Stat, Stats, useStyles } from '@/components/ui';
import { useMoney } from '@/lib/money';
import { usePersistent } from '@/lib/storage';

const isNullable = (v: unknown): v is RetirementInput | null => v === null || isRetirementInput(v);

export default function RetirementScreen() {
  const { p } = useStyles();
  const { currency, money } = useMoney();
  const { isPro } = usePro();
  const [stored, setStored] = usePersistent<RetirementInput | null>(KEYS.retirement, null, isNullable);
  const input = stored ?? exampleRetirement(currency);
  const set = (patch: Partial<RetirementInput>) => setStored({ ...input, ...patch });
  const r = useMemo(() => projectRetirement(input), [input]);
  const [runAt, setRunAt] = useState(0);
  // Runs only when asked (1,000 paths), with the numbers at that moment.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const odds = useMemo(() => (runAt && isPro ? retirementOdds(input) : null), [runAt, isPro]);
  const pct = odds ? Math.round(odds.successRate * 100) : 0;

  return (
    <Screen title="Retirement planner" intro="How much you will have when you stop working, how much you need, and (with Pro) the chance your money lasts when markets go up and down." testID="screen-retirement">
      <Card testID="retirement-result">
        <Stats>
          <Stat label={`At age ${input.retireAge} you will have`} value={money(r.corpusAtRetirement)} testID="ret-corpus" />
          <Stat label="You will need about" value={money(r.corpusNeeded)} testID="ret-needed" />
          <Stat label="First-year spending" value={money(r.firstYearSpending)} sub="Today's spending after inflation" />
          <Stat label="On expected returns" value={r.onTrack ? `Lasts to ${input.planToAge}` : `Runs out at ${r.runsOutAt}`} tone={r.onTrack ? 'ok' : 'bad'} testID="ret-verdict" />
        </Stats>
        <Text style={{ color: p.muted, fontSize: 13, lineHeight: 19 }}>
          This straight-line projection assumes the same return every year. Real markets move around, which is why a plan that looks fine on average can still run short.
        </Text>
      </Card>

      {isPro ? (
        <Card title="Retirement odds" testID="ret-odds">
          <Button title={odds ? 'Run again with these numbers' : 'Run 1,000 simulations'} onPress={() => setRunAt(Date.now())} testID="run-odds" />
          {odds ? (
            <>
              <Text testID="odds-success" style={{ color: p.fg, fontSize: 22, fontWeight: '700' }}>
                {pct} % chance your money lasts to {input.planToAge}
              </Text>
              <Stats>
                <Stat label="Bad markets (10th pct)" value={money(odds.atRetirement.p10)} tone="bad" />
                <Stat label="Typical (median)" value={money(odds.atRetirement.p50)} />
                <Stat label="Good markets (90th pct)" value={money(odds.atRetirement.p90)} tone="ok" />
              </Stats>
              <Text style={{ color: p.muted, fontSize: 13, lineHeight: 19 }}>
                Pot size at retirement across {odds.runs} runs.
                {odds.medianRunOutAge !== null ? ` When the money runs short, it is typically around age ${odds.medianRunOutAge}.` : ''} Many planners aim for 80 % or more. Returns are drawn from a normal distribution, which understates rare crashes.
              </Text>
            </>
          ) : null}
        </Card>
      ) : (
        <ProGate title="Retirement odds (Monte Carlo)" detail="Run your plan through 1,000 simulated market histories and see the chance your money lasts, plus good, typical and bad outcomes." testID="ret-pro-gate" />
      )}

      <Card title="Your plan">
        <NumberField label="Age now" value={input.currentAge} onChange={(n) => set({ currentAge: Math.round(n) })} max={100} />
        <NumberField label="Retire at" value={input.retireAge} onChange={(n) => set({ retireAge: Math.round(n) })} max={100} />
        <NumberField label="Plan until age" value={input.planToAge} onChange={(n) => set({ planToAge: Math.round(n) })} max={110} />
        <NumberField label="Saved so far" value={input.currentSavings} onChange={(n) => set({ currentSavings: n })} />
        <NumberField label="Monthly saving" value={input.monthlySaving} onChange={(n) => set({ monthlySaving: n })} testID="in-ret-saving" />
        <NumberField label="Yearly spending" hint="In today's money" value={input.yearlySpendingToday} onChange={(n) => set({ yearlySpendingToday: n })} />
        <NumberField label="Inflation" suffix="%" value={input.inflationPct} onChange={(n) => set({ inflationPct: n })} max={20} />
        <NumberField label="Return while working" suffix="%" value={input.returnPct} onChange={(n) => set({ returnPct: n })} max={30} />
        <NumberField label="Return after retiring" suffix="%" value={input.retiredReturnPct} onChange={(n) => set({ retiredReturnPct: n })} max={30} />
        <NumberField label="Volatility" suffix="%" hint="About 15 for mostly shares, 6 for mostly bonds" value={input.volatilityPct} onChange={(n) => set({ volatilityPct: n })} max={60} />
        {stored !== null ? <Button title="Reset to the example" kind="secondary" onPress={() => setStored(null)} /> : null}
      </Card>
    </Screen>
  );
}
