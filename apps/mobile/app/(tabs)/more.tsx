import { useState } from 'react';
import { Alert, Linking, Text } from 'react-native';
import { router } from 'expo-router';
import { useAds } from '@/components/AdsProvider';
import { ListItem } from '@/components/ListItem';
import { usePro } from '@/components/ProProvider';
import { Button, Card, Notice, Screen, Segmented, useStyles } from '@/components/ui';
import { config } from '@/lib/config';
import { pickText, shareText } from '@/lib/files';
import { store, useSettings } from '@/lib/storage';
import type { Settings } from '@/lib/store';

export default function MoreScreen() {
  const { p } = useStyles();
  const settings = useSettings();
  const { isPro, status } = usePro();
  const ads = useAds();
  const [msg, setMsg] = useState<string | null>(null);

  const backup = async () => {
    const ok = await shareText(`finealth-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(store.exportBackup(), null, 2), 'application/json');
    setMsg(ok ? null : 'Sharing is not available on this phone.');
  };
  const restore = async () => {
    const text = await pickText();
    if (text === null) return;
    const r = store.importBackup(text);
    setMsg(r.ok ? `Restored: ${r.restored.join(', ')}.` : r.message);
  };
  const clear = () =>
    Alert.alert('Delete all my numbers?', 'This removes every saved plan from this phone. It cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => store.clearAll().then(() => setMsg('All saved numbers were deleted from this phone.')) },
    ]);

  return (
    <Screen title="More" disclaimer={false} ad={false} testID="screen-more">
      <ListItem title={isPro ? 'Finealth Pro: active' : 'Get Finealth Pro'} subtitle={isPro ? 'See your plan' : 'No ads, full report, unlimited plans, retirement odds, export.'} onPress={() => router.push('/pro')} testID="open-pro" badge={status.state === 'checking' ? '…' : undefined} />
      <Card title="Currency">
        <Segmented<Settings['currency']>
          value={settings.currency}
          options={[
            { value: 'INR', label: '₹ INR' },
            { value: 'USD', label: '$ USD' },
            { value: 'EUR', label: '€ EUR' },
            { value: 'GBP', label: '£ GBP' },
          ]}
          onChange={(c) => store.set('settings', { ...settings, currency: c })}
          testID="currency"
        />
        <Text style={{ color: p.muted, fontSize: 12 }}>Changes the symbol, number format and example amounts. It does not convert amounts you typed.</Text>
      </Card>
      <Card title="Your data">
        <Text style={{ color: p.muted, lineHeight: 20 }}>Your numbers are stored only on this phone. Nothing you type is sent to us, to analytics or to the ad network.</Text>
        {/* Free for everyone, as on the website: the app keeps no cloud copy (allowBackup off), so this is the way to move phones. */}
        <Button title="Back up to a file" kind="secondary" onPress={backup} testID="backup" />
        <Button title="Restore from a backup" kind="secondary" onPress={restore} testID="restore" />
        <Button title="Delete all my numbers" kind="danger" onPress={clear} testID="clear-data" />
        {msg ? <Notice testID="more-message">{msg}</Notice> : null}
      </Card>
      {ads.privacyOptionsRequired ? <ListItem title="Ad privacy choices" subtitle="Change your ad consent." onPress={ads.showPrivacyOptions} testID="ad-privacy" /> : null}
      <ListItem title="About Finealth" onPress={() => router.push('/about')} testID="open-about" />
      <ListItem title="Privacy policy" onPress={() => Linking.openURL(`${config.siteUrl}/privacy/`)} />
      <ListItem title="Terms" onPress={() => Linking.openURL(`${config.siteUrl}/terms/`)} />
      <ListItem title="Contact support" subtitle={config.contactEmail} onPress={() => Linking.openURL(`mailto:${config.contactEmail}`)} />
    </Screen>
  );
}
