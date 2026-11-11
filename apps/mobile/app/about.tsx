import Constants from 'expo-constants';
import { Linking, Text } from 'react-native';
import { RATES_LAST_CHECKED } from '@finealth/finance-core';
import { Card, Screen, useStyles } from '@/components/ui';
import { EQUISTEG_URL } from '@/lib/config';

export default function AboutScreen() {
  const { p } = useStyles();
  return (
    <Screen title="About Finealth" disclaimer ad={false} testID="screen-about">
      <Card>
        <Text style={{ color: p.fg, lineHeight: 22 }}>
          Finealth is a private financial health check and planner: a health score with ranked actions, debt, goal, retirement and loan planners, and free calculators. It works offline and keeps your numbers on this phone.
        </Text>
        <Text style={{ color: p.fg }}>
          A product by{' '}
          <Text accessibilityRole="link" style={{ color: p.accent, textDecorationLine: 'underline' }} onPress={() => Linking.openURL(EQUISTEG_URL)}>
            Equisteg
          </Text>
          .
        </Text>
        <Text style={{ color: p.muted, fontSize: 13 }}>
          Version {Constants.expoConfig?.version ?? '—'} · Tax rates last checked {RATES_LAST_CHECKED}
        </Text>
      </Card>
    </Screen>
  );
}
