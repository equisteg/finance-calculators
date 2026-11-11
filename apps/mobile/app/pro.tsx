import { useEffect, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import type { ProPlan } from '@finealth/shared-types';
import { PLAN_PRICES, PRO_FEATURES } from '@finealth/finance-core';
import { usePro } from '@/components/ProProvider';
import { Button, Card, Notice, Screen, TextField, useStyles } from '@/components/ui';
import { loadPrices, type PlayPrice } from '@/lib/billing';
import { config } from '@/lib/config';
import { KEY_HINT } from '@/lib/pro';

const PLAN_NAME: Record<ProPlan, string> = { pro_monthly: 'Monthly', pro_yearly: 'Yearly', pro_lifetime: 'Lifetime' };

export default function ProScreen() {
  const { p } = useStyles();
  const pro = usePro();
  const [prices, setPrices] = useState<PlayPrice[] | null>(null);
  const [key, setKey] = useState('');
  useEffect(() => {
    let alive = true;
    loadPrices().then((x) => alive && setPrices(x));
    return () => {
      alive = false;
    };
  }, []);
  const playPrice = (plan: ProPlan) => prices?.find((x) => x.plan === plan)?.price;

  if (pro.status.state === 'pro') {
    const c = pro.status.claims;
    return (
      <Screen title="You have Pro" ad={false} disclaimer={false} testID="screen-pro">
        <Card testID="pro-active">
          <Text style={{ color: p.ok, fontWeight: '700', fontSize: 18 }}>{PLAN_NAME[c.plan]} plan is active</Text>
          <Text style={{ color: p.muted }}>
            {pro.status.src === 'play' ? 'Bought on Google Play. Manage or cancel it in Google Play → Payments & subscriptions.' : 'Bought on the Finealth website.'}
          </Text>
          <Text style={{ color: p.muted, fontSize: 12 }}>The app re-checks your purchase every few days; it keeps working offline in between.</Text>
          {pro.status.src === 'play' ? <Button title="Manage subscription" kind="secondary" onPress={() => Linking.openURL('https://play.google.com/store/account/subscriptions')} /> : null}
          <Button title="Remove Pro from this phone" kind="danger" onPress={pro.remove} testID="pro-remove" />
        </Card>
        {pro.message ? <Notice tone="ok">{pro.message}</Notice> : null}
      </Screen>
    );
  }

  return (
    <Screen title="Finealth Pro" intro="Every calculator and the health score stay free. Pro is the full plan built on your numbers." ad={false} disclaimer={false} testID="screen-pro">
      {pro.message ? <Notice testID="pro-message">{pro.message}</Notice> : null}
      {pro.status.state === 'free' && pro.status.unconfirmed ? <Notice>Couldn’t confirm Pro. We’ll retry when you are online.</Notice> : null}
      <Card title="What you get">
        {PRO_FEATURES.map((f) => (
          <View key={f.id} style={{ gap: 2 }}>
            <Text style={{ color: p.fg, fontWeight: '700' }}>✓ {f.title}</Text>
            <Text style={{ color: p.muted, fontSize: 13 }}>{f.detail}</Text>
          </View>
        ))}
      </Card>
      {PLAN_PRICES.map((x) => {
        const live = playPrice(x.plan);
        return (
          <Card key={x.plan} testID={`plan-${x.plan}`} highlight={x.plan === 'pro_yearly'}>
            <Text style={{ color: p.fg, fontWeight: '700', fontSize: 17 }}>{x.label}</Text>
            <Text style={{ color: p.fg, fontSize: 24, fontWeight: '800' }}>{live ?? `${x.inr} / ${x.intl}`}</Text>
            <Text style={{ color: p.muted }}>{x.note}</Text>
            <Button title={`Buy ${x.label}`} onPress={() => pro.buy(x.plan)} busy={pro.busy} disabled={prices !== null && !live} testID={`buy-${x.plan}`} />
          </Card>
        );
      })}
      {prices !== null && prices.length === 0 ? <Notice>Google Play billing is not available on this device right now. Prices shown are list prices.</Notice> : null}
      <Text style={{ color: p.muted, fontSize: 12, lineHeight: 18 }}>
        Payment is handled by Google Play. Subscriptions renew until you cancel in Google Play. By buying you agree to the{' '}
        <Text accessibilityRole="link" style={{ color: p.accent }} onPress={() => Linking.openURL(`${config.siteUrl}/terms/`)}>
          Terms
        </Text>{' '}
        and{' '}
        <Text accessibilityRole="link" style={{ color: p.accent }} onPress={() => Linking.openURL(`${config.siteUrl}/refund/`)}>
          Refund policy
        </Text>
        , and that Finealth gives estimates, not financial advice.
      </Text>

      <Card title="Already bought?">
        <Button title="Restore Google Play purchase" kind="secondary" onPress={pro.restore} busy={pro.busy} testID="restore-play" />
        <TextField label="Bought on the website? Licence key" value={key} onChange={setKey} hint={KEY_HINT} testID="licence-key" maxLength={60} />
        <Button title="Activate licence key" kind="secondary" onPress={() => pro.activateKey(key)} busy={pro.busy} disabled={!key.trim()} testID="activate-key" />
      </Card>
    </Screen>
  );
}
