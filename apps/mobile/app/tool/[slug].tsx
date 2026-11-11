import { useMemo, useState } from 'react';
import { Linking, Text } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { APP_TOOL_BY_SLUG, CHECKED_LABEL, type ToolDef, type Values } from '@finealth/finance-core/catalog';
import { Card, Notice, NumberField, Screen, Segmented, Stat, Stats, TextField, ToggleRow, useStyles } from '@/components/ui';
import { makeFmt, useMoney } from '@/lib/money';

/** One calculator from the shared catalogue, driven entirely by its entry (same as the web /tools/<slug>/ page). */
export default function ToolScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const def = APP_TOOL_BY_SLUG[String(slug)];
  const { currency } = useMoney();
  if (!def) {
    return (
      <Screen title="Calculator not found" disclaimer={false} ad={false}>
        <Notice>This calculator is not in this version of the app.</Notice>
      </Screen>
    );
  }
  // Start again from the right defaults when the app currency changes.
  return <ToolBody key={`${def.slug}-${def.currency ?? currency}`} def={def} siteCurrency={currency} />;
}

function ToolBody({ def, siteCurrency }: { def: ToolDef; siteCurrency: string }) {
  const { p } = useStyles();
  const currency = def.currency ?? siteCurrency;
  const isInr = !def.currency && siteCurrency === 'INR';
  const [values, setValues] = useState<Values>(() => Object.fromEntries(def.fields.map((f) => [f.key, isInr && f.inr !== undefined ? f.inr : f.def])));
  const set = (k: string, v: number | string | boolean) => setValues((old) => ({ ...old, [k]: v }));
  const fmt = useMemo(() => makeFmt(currency), [currency]);

  let result: ReturnType<ToolDef['compute']>;
  try {
    result = def.compute(values, fmt);
  } catch {
    result = { rows: [{ label: 'Result', value: 'Check the inputs' }] };
  }

  return (
    <Screen title={def.title} intro={`${def.region} · ${def.category}. ${def.summary}`} testID={`screen-tool-${def.slug}`}>
      <Stack.Screen options={{ title: def.title }} />
      <Card title="Result" testID="tool-result">
        <Stats>
          {result.rows.map((r, i) => (
            <Stat key={r.label} label={r.label} value={r.value} tone={r.tone} sub={r.sub} testID={i === 0 ? 'tool-primary' : undefined} />
          ))}
        </Stats>
        {result.note ? (
          <Text testID="tool-note" style={{ color: p.warn }}>
            {result.note}
          </Text>
        ) : null}
      </Card>
      <Card title="Your numbers">
        {def.fields.map((f) => {
          const testID = `in-${f.key}`;
          if (f.kind === 'select')
            return f.options && f.options.length <= 4 ? (
              <Segmented key={f.key} label={f.label} value={String(values[f.key])} options={f.options} onChange={(v) => set(f.key, v)} testID={testID} />
            ) : (
              <OptionList key={f.key} label={f.label} value={String(values[f.key])} options={f.options ?? []} onChange={(v) => set(f.key, v)} testID={testID} />
            );
          if (f.kind === 'toggle') return <ToggleRow key={f.key} label={f.label} hint={f.hint} value={values[f.key] === true} onChange={(v) => set(f.key, v)} testID={testID} />;
          if (f.kind === 'text') return <TextField key={f.key} label={f.label} hint={f.hint} value={String(values[f.key])} onChange={(v) => set(f.key, v)} multiline testID={testID} />;
          return <NumberField key={f.key} label={f.label} value={Number(values[f.key])} onChange={(x) => set(f.key, x)} suffix={f.suffix} hint={f.hint} max={f.max} min={-1e15} testID={testID} />;
        })}
      </Card>
      <Card testID="tool-source">
        <Text style={{ color: p.fg, lineHeight: 20 }}>
          <Text style={{ fontWeight: '700' }}>How it is worked out. </Text>
          {def.source}
        </Text>
        {def.statutory ? (
          <Text style={{ color: p.fg, lineHeight: 20 }}>
            <Text style={{ fontWeight: '700' }}>Rates last checked: </Text>
            {CHECKED_LABEL}. Governments change rates in budgets; always confirm with the official source.
            {def.official ? (
              <Text accessibilityRole="link" style={{ color: p.accent, textDecorationLine: 'underline' }} onPress={() => Linking.openURL(def.official!.url)}>
                {' '}
                {def.official.label}
              </Text>
            ) : null}
          </Text>
        ) : null}
        {def.limits ? (
          <Text style={{ color: p.fg, lineHeight: 20 }}>
            <Text style={{ fontWeight: '700' }}>Not covered: </Text>
            {def.limits}
          </Text>
        ) : null}
      </Card>
    </Screen>
  );
}

/** Long option lists (e.g. 60+ VAT countries): a filter box and the matching options. */
function OptionList(props: { label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void; testID?: string }) {
  const { p } = useStyles();
  const [q, setQ] = useState('');
  const current = props.options.find((o) => o.value === props.value);
  const shown = props.options.filter((o) => !q || o.label.toLowerCase().includes(q.toLowerCase())).slice(0, 8);
  return (
    <>
      <Text style={{ color: p.muted, fontSize: 13, fontWeight: '600' }}>
        {props.label}: <Text style={{ color: p.fg }}>{current?.label ?? '—'}</Text>
      </Text>
      <TextField label={`Find ${props.label.toLowerCase()}`} value={q} onChange={setQ} testID={props.testID ? `${props.testID}-search` : undefined} maxLength={40} />
      <Segmented value={props.value} options={shown} onChange={props.onChange} testID={props.testID} />
    </>
  );
}
