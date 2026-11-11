import { Text, View } from 'react-native';
import { usePalette } from '@/theme';

/** Big score with a coloured ring (no SVG dependency): green ≥ 80, amber ≥ 60, else red. */
export function ScoreRing({ score, grade }: { score: number; grade: string }) {
  const p = usePalette();
  const color = score >= 80 ? p.ok : score >= 60 ? p.warn : p.bad;
  return (
    <View
      accessible
      accessibilityLabel={`Health score ${score} out of 100, ${grade}`}
      style={{ width: 132, height: 132, borderRadius: 66, borderWidth: 10, borderColor: color, alignItems: 'center', justifyContent: 'center', backgroundColor: p.surface }}
    >
      <Text testID="health-score" style={{ color: p.fg, fontSize: 40, fontWeight: '800', fontVariant: ['tabular-nums'] }}>
        {score}
      </Text>
      <Text style={{ color: p.muted, fontSize: 12 }}>out of 100</Text>
    </View>
  );
}
