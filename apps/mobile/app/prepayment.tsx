import { useState } from 'react';
import { Text } from 'react-native';
import { comparePrepayment } from '@finealth/finance-core';
import { Card, NumberField, Screen, Stat, Stats, useStyles } from '@/components/ui';
import { useMoney } from '@/lib/money';

const span = (m: number) => {
  if (!Number.isFinite(m)) return 'never';
  if (m < 12) return m === 1 ? '1 month' : `${m} months`;
  return m % 12 ? `${Math.floor(m / 12)} yr ${m % 12} mo` : `${m / 12} yr`;
};

export default function PrepaymentScreen() {
  const { p } = useStyles();
  const { currency, money } = useMoney();
  const inr = currency === 'INR';
  const [outstanding, setOutstanding] = useState(inr ? 2_500_000 : 250_000);
  const [apr, setApr] = useState(inr ? 8.75 : 6.5);
  const [monthsLeft, setMonthsLeft] = useState(180);
  const [lump, setLump] = useState(inr ? 200_000 : 20_000);
  const [extra, setExtra] = useState(0);
  const r = comparePrepayment({ outstanding, aprPct: apr, monthsLeft, lumpSum: lump, extraMonthly: extra });

  return (
    <Screen title="Loan prepayment optimiser" intro="Paying part of a loan early? Compare keeping your EMI and finishing sooner with keeping the end date and paying less each month." testID="screen-prepayment">
      <Card title="Keep EMI, finish sooner" testID="prepay-tenure" highlight={r.better === 'reduceTenure'}>
        <Stats>
          <Stat label="Interest saved" value={money(r.reduceTenure.interestSaved)} tone="ok" testID="tenure-saved" />
          <Stat label="Loan ends" value={`${span(r.reduceTenure.monthsSaved)} sooner`} sub={`New tenure ${span(r.reduceTenure.months)}`} />
        </Stats>
      </Card>
      <Card title="Keep end date, lower EMI" testID="prepay-emi" highlight={r.better === 'reduceEmi'}>
        <Stats>
          <Stat label="Interest saved" value={money(r.reduceEmi.interestSaved)} tone="ok" testID="emi-saved" />
          <Stat label="New EMI" value={money(r.reduceEmi.newEmi)} sub={`${money(r.emi - r.reduceEmi.newEmi)} less each month`} />
        </Stats>
      </Card>
      <Text style={{ color: p.muted, lineHeight: 20 }}>
        Keeping the EMI and shortening the loan almost always saves more interest. Lowering the EMI frees cash each month, which helps if your budget is tight. Check your lender&apos;s prepayment charges first.
      </Text>
      <Card title="Your loan">
        <NumberField label="Balance today" value={outstanding} onChange={setOutstanding} testID="in-outstanding" />
        <NumberField label="Interest rate" suffix="%" value={apr} onChange={setApr} max={40} />
        <NumberField label="Months left" value={monthsLeft} onChange={(n) => setMonthsLeft(Math.round(n))} max={480} />
        <NumberField label="Part-payment now" value={lump} onChange={setLump} testID="in-lump" />
        <NumberField label="Extra every month" hint="Adds to the reduce-tenure option" value={extra} onChange={setExtra} />
        <Text style={{ color: p.muted, fontSize: 13 }}>
          Current EMI: {money(r.emi)} · Interest left if you change nothing: {money(r.baseline.totalInterest)}
        </Text>
      </Card>
    </Screen>
  );
}
