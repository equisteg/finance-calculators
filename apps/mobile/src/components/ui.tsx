import { useState, type ReactNode } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { radius, space, TOUCH, usePalette } from '@/theme';
import { config } from '@/lib/config';
import { clampInput, parseInput } from '@/lib/input';
import { AdBanner } from './AdBanner';

export type Tone = 'ok' | 'warn' | 'bad';

export function useStyles() {
  const p = usePalette();
  return { p, tone: (t?: Tone) => (t === 'ok' ? p.ok : t === 'warn' ? p.warn : t === 'bad' ? p.bad : p.fg) };
}

/** Scrollable page with the title, the content, the disclaimer (finance rule: under every result) and one ad slot. */
export function Screen(props: { title: string; intro?: string; children: ReactNode; disclaimer?: boolean; ad?: boolean; testID?: string }) {
  const { p } = useStyles();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: p.bg }}
      contentContainerStyle={{ padding: space.lg, paddingBottom: space.xl + insets.bottom, gap: space.lg }}
      keyboardShouldPersistTaps="handled"
      testID={props.testID}
    >
      <View style={{ gap: space.xs }}>
        <Text accessibilityRole="header" style={[styles.h1, { color: p.fg }]}>
          {props.title}
        </Text>
        {props.intro ? <Text style={{ color: p.muted, fontSize: 15, lineHeight: 22 }}>{props.intro}</Text> : null}
      </View>
      {props.children}
      {props.disclaimer !== false && <Disclaimer />}
      {props.ad !== false && <AdBanner />}
    </ScrollView>
  );
}

export function Card(props: { title?: string; children: ReactNode; style?: ViewStyle; testID?: string; highlight?: boolean }) {
  const { p } = useStyles();
  return (
    <View
      testID={props.testID}
      style={[{ backgroundColor: p.card, borderColor: props.highlight ? p.accent : p.line, borderWidth: props.highlight ? 2 : 1, borderRadius: radius.lg, padding: space.lg, gap: space.md }, props.style]}
    >
      {props.title ? (
        <Text accessibilityRole="header" style={{ color: p.fg, fontSize: 17, fontWeight: '700' }}>
          {props.title}
        </Text>
      ) : null}
      {props.children}
    </View>
  );
}

export { clampInput, parseInput };

/** Number input that keeps what the user is typing and reports a clamped number. */
export function NumberField(props: { label: string; value: number; onChange: (n: number) => void; suffix?: string; hint?: string; max?: number; min?: number; testID?: string }) {
  const { p } = useStyles();
  const [text, setText] = useState(String(props.value));
  const [bad, setBad] = useState(false);
  const [seen, setSeen] = useState(props.value);
  // Follow outside changes (example reset, currency switch, clamping) without fighting the user's typing.
  if (seen !== props.value) {
    setSeen(props.value);
    if (parseInput(text) !== props.value) setText(String(props.value));
  }
  const onText = (s: string) => {
    setText(s);
    const n = parseInput(s);
    if (n === null) return setBad(true);
    setBad(false);
    const clamped = clampInput(n, props.min, props.max);
    // Show the number the plan uses: "1000" in a field that stops at 100 turns into "100" at once.
    if (clamped !== n) setText(String(clamped));
    props.onChange(clamped);
  };
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ color: p.muted, fontSize: 13, fontWeight: '600' }}>{props.label}</Text>
      <View style={[styles.inputRow, { borderColor: bad ? p.bad : p.lineHi, backgroundColor: p.surface }]}>
        <TextInput
          testID={props.testID}
          accessibilityLabel={props.label}
          value={text}
          onChangeText={onText}
          keyboardType="decimal-pad"
          inputMode="decimal"
          style={[styles.input, { color: p.fg }]}
          placeholderTextColor={p.muted}
        />
        {props.suffix ? <Text style={{ color: p.muted, paddingRight: space.md }}>{props.suffix}</Text> : null}
      </View>
      {bad ? <Text style={{ color: p.bad, fontSize: 12 }}>Enter a number.</Text> : props.hint ? <Text style={{ color: p.muted, fontSize: 12 }}>{props.hint}</Text> : null}
    </View>
  );
}

export function TextField(props: { label: string; value: string; onChange: (s: string) => void; multiline?: boolean; hint?: string; testID?: string; maxLength?: number }) {
  const { p } = useStyles();
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ color: p.muted, fontSize: 13, fontWeight: '600' }}>{props.label}</Text>
      <TextInput
        testID={props.testID}
        accessibilityLabel={props.label}
        value={props.value}
        onChangeText={props.onChange}
        multiline={props.multiline}
        maxLength={props.maxLength ?? 2000}
        autoCapitalize="none"
        autoCorrect={false}
        style={[styles.inputRow, styles.input, { color: p.fg, borderColor: p.lineHi, backgroundColor: p.surface, minHeight: props.multiline ? 110 : TOUCH, textAlignVertical: props.multiline ? 'top' : 'center', fontFamily: props.multiline ? 'monospace' : undefined }]}
      />
      {props.hint ? <Text style={{ color: p.muted, fontSize: 12 }}>{props.hint}</Text> : null}
    </View>
  );
}

export function ToggleRow(props: { label: string; value: boolean; onChange: (v: boolean) => void; hint?: string; testID?: string }) {
  const { p } = useStyles();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: TOUCH }}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: p.fg, fontSize: 15 }}>{props.label}</Text>
        {props.hint ? <Text style={{ color: p.muted, fontSize: 12 }}>{props.hint}</Text> : null}
      </View>
      <Switch testID={props.testID} accessibilityLabel={props.label} value={props.value} onValueChange={props.onChange} trackColor={{ true: p.accent, false: p.lineHi }} thumbColor={p.surface} />
    </View>
  );
}

/** Choice between a few options, as accessible radio buttons. */
export function Segmented<T extends string>(props: { label?: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; testID?: string }) {
  const { p } = useStyles();
  return (
    <View style={{ gap: 4 }} accessibilityRole="radiogroup" accessibilityLabel={props.label}>
      {props.label ? <Text style={{ color: p.muted, fontSize: 13, fontWeight: '600' }}>{props.label}</Text> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {props.options.map((o) => {
          const on = o.value === props.value;
          return (
            <Pressable
              key={o.value}
              testID={props.testID ? `${props.testID}-${o.value}` : undefined}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => props.onChange(o.value)}
              style={{ minHeight: TOUCH, justifyContent: 'center', paddingHorizontal: space.md, borderRadius: radius.sm, borderWidth: 1, borderColor: on ? p.accent : p.lineHi, backgroundColor: on ? p.accent : p.surface }}
            >
              <Text style={{ color: on ? p.onAccent : p.fg, fontWeight: '600' }}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function Stat(props: { label: string; value: string; tone?: Tone; sub?: string; testID?: string }) {
  const { p, tone } = useStyles();
  return (
    <View style={{ flexGrow: 1, flexBasis: '45%', minWidth: 140, backgroundColor: p.surface, borderRadius: radius.md, borderWidth: 1, borderColor: p.line, padding: space.md, gap: 2 }}>
      <Text style={{ color: p.muted, fontSize: 12, fontWeight: '600' }}>{props.label}</Text>
      <Text testID={props.testID} style={{ color: tone(props.tone), fontSize: 20, fontWeight: '700', fontVariant: ['tabular-nums'] }} accessibilityLabel={`${props.label}: ${props.value}`}>
        {props.value}
      </Text>
      {props.sub ? <Text style={{ color: p.muted, fontSize: 12 }}>{props.sub}</Text> : null}
    </View>
  );
}

export function Stats({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>{children}</View>;
}

export function Button(props: { title: string; onPress: () => void; kind?: 'primary' | 'secondary' | 'danger'; disabled?: boolean; testID?: string; busy?: boolean }) {
  const { p } = useStyles();
  const kind = props.kind ?? 'primary';
  const bg = kind === 'primary' ? p.accent : 'transparent';
  const fg = kind === 'primary' ? p.onAccent : kind === 'danger' ? p.bad : p.accent;
  return (
    <Pressable
      testID={props.testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!props.disabled || !!props.busy, busy: !!props.busy }}
      disabled={props.disabled || props.busy}
      onPress={props.onPress}
      style={({ pressed }) => ({ minHeight: TOUCH, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.lg, backgroundColor: bg, borderWidth: kind === 'primary' ? 0 : 1, borderColor: fg, opacity: props.disabled ? 0.5 : pressed ? 0.85 : 1 })}
    >
      <Text style={{ color: fg, fontWeight: '700', fontSize: 15 }}>{props.busy ? 'Please wait…' : props.title}</Text>
    </Pressable>
  );
}

/** Horizontal progress bar 0..1. */
export function Bar(props: { value: number; tone?: Tone; label: string }) {
  const { p, tone } = useStyles();
  const v = Math.max(0, Math.min(1, Number.isFinite(props.value) ? props.value : 0));
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={props.label} accessibilityValue={{ min: 0, max: 100, now: Math.round(v * 100) }} style={{ height: 8, borderRadius: 4, backgroundColor: p.line, overflow: 'hidden' }}>
      <View style={{ width: `${v * 100}%`, height: '100%', backgroundColor: props.tone ? tone(props.tone) : p.accent }} />
    </View>
  );
}

export function Notice(props: { children: ReactNode; tone?: Tone; testID?: string }) {
  const { p } = useStyles();
  const bg = props.tone === 'bad' ? p.badBg : props.tone === 'ok' ? p.okBg : p.warnBg;
  return (
    <View testID={props.testID} style={{ backgroundColor: bg, borderRadius: radius.md, padding: space.md }}>
      <Text style={{ color: p.fg, fontSize: 14, lineHeight: 20 }}>{props.children}</Text>
    </View>
  );
}

/** Shown under every result (finance category rule): readable size and contrast, never hidden. */
export function Disclaimer() {
  const { p } = useStyles();
  return (
    <View testID="disclaimer" style={{ backgroundColor: p.warnBg, borderRadius: radius.md, padding: space.md }}>
      <Text style={{ color: p.fg, fontSize: 13, lineHeight: 19 }}>
        <Text style={{ fontWeight: '700' }}>Information only. </Text>
        These are estimates from the numbers you entered and common rules of thumb. They are not financial, tax, investment or legal advice, may contain errors, and tax rates and rules change. Check important decisions with the official source or a qualified professional.{' '}
        <Text accessibilityRole="link" style={{ color: p.accent, textDecorationLine: 'underline' }} onPress={() => Linking.openURL(`${config.siteUrl}/terms/`)}>
          Terms
        </Text>
      </Text>
    </View>
  );
}

/** Locked Pro feature: says what it is and opens the Pro screen. */
export function ProGate(props: { title: string; detail: string; testID?: string }) {
  const { p } = useStyles();
  return (
    <View testID={props.testID ?? 'pro-gate'} style={{ borderRadius: radius.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: p.accent, padding: space.lg, gap: space.sm }}>
      <Text style={{ color: p.accent, fontWeight: '700', fontSize: 12, letterSpacing: 0.6 }}>PRO</Text>
      <Text style={{ color: p.fg, fontWeight: '700', fontSize: 16 }}>{props.title}</Text>
      <Text style={{ color: p.muted, fontSize: 14, lineHeight: 20 }}>{props.detail}</Text>
      <Button title="See Pro" kind="secondary" onPress={() => router.push('/pro')} testID="pro-gate-open" />
    </View>
  );
}

export function Row(props: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }, props.style]}>{props.children}</View>;
}

const styles = StyleSheet.create({
  h1: { fontSize: 28, fontWeight: '700', letterSpacing: -0.4 },
  inputRow: { flexDirection: 'row', alignItems: 'center', minHeight: TOUCH, borderRadius: radius.sm, borderWidth: 1 },
  input: { flex: 1, paddingHorizontal: space.md, fontSize: 16, minHeight: TOUCH },
});
