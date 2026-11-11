import { Pressable, Text, View } from 'react-native';
import { radius, space, TOUCH, usePalette } from '@/theme';

export function ListItem(props: { title: string; subtitle?: string; onPress: () => void; badge?: string; testID?: string }) {
  const p = usePalette();
  return (
    <Pressable
      testID={props.testID}
      accessibilityRole="button"
      accessibilityLabel={props.subtitle ? `${props.title}. ${props.subtitle}` : props.title}
      onPress={props.onPress}
      style={({ pressed }) => ({ minHeight: TOUCH, flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.md, borderWidth: 1, borderColor: p.line, backgroundColor: pressed ? p.surface : p.card })}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: p.fg, fontWeight: '700', fontSize: 15 }}>{props.title}</Text>
        {props.subtitle ? <Text style={{ color: p.muted, fontSize: 13, lineHeight: 18 }}>{props.subtitle}</Text> : null}
      </View>
      {props.badge ? <Text style={{ color: p.accent, fontSize: 11, fontWeight: '700' }}>{props.badge}</Text> : null}
      <Text style={{ color: p.muted, fontSize: 18 }}>›</Text>
    </Pressable>
  );
}
