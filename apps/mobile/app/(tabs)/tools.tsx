import { useMemo, useState } from 'react';
import { Text } from 'react-native';
import { router } from 'expo-router';
import { APP_TOOLS as TOOLS, CATEGORIES } from '@finealth/finance-core/catalog';
import { ListItem } from '@/components/ListItem';
import { Screen, TextField, useStyles } from '@/components/ui';

export default function ToolsScreen() {
  const { p } = useStyles();
  const [q, setQ] = useState('');
  const groups = useMemo(() => {
    const s = q.trim().toLowerCase();
    const match = TOOLS.filter((t) => !s || `${t.title} ${t.summary} ${t.region}`.toLowerCase().includes(s));
    return CATEGORIES.map((c) => ({ c, tools: match.filter((t) => t.category === c) })).filter((g) => g.tools.length);
  }, [q]);
  return (
    <Screen title="Calculators" intro={`${TOOLS.length} free calculators, the same formulas as the website.`} disclaimer={false} ad={false} testID="screen-tools">
      <TextField label="Search calculators" value={q} onChange={setQ} testID="tools-search" maxLength={60} />
      {groups.length === 0 ? <Text style={{ color: p.muted }}>No calculator matches “{q}”.</Text> : null}
      {groups.map((g) => [
        <Text key={g.c} accessibilityRole="header" style={{ color: p.fg, fontWeight: '700', fontSize: 17, marginTop: 8 }}>
          {g.c}
        </Text>,
        ...g.tools.map((t) => (
          <ListItem key={t.slug} title={t.title} subtitle={t.summary} badge={t.region === 'Global' ? undefined : t.region} onPress={() => router.push({ pathname: '/tool/[slug]', params: { slug: t.slug } })} testID={`tool-${t.slug}`} />
        )),
      ])}
    </Screen>
  );
}
