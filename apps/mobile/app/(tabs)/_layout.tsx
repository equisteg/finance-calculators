import { Text, type ColorValue } from 'react-native';
import { Tabs } from 'expo-router/tabs';
import { usePalette } from '@/theme';

const glyph = (g: string) =>
  function TabIcon({ color }: { color: ColorValue }) {
    return (
      <Text style={{ color, fontSize: 20 }} accessibilityElementsHidden importantForAccessibility="no">
        {g}
      </Text>
    );
  };

export default function TabsLayout() {
  const p = usePalette();
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: p.bg },
        headerTintColor: p.fg,
        headerShadowVisible: false,
        tabBarStyle: { backgroundColor: p.surface, borderTopColor: p.line, minHeight: 60 },
        tabBarActiveTintColor: p.accent,
        tabBarInactiveTintColor: p.muted,
        sceneStyle: { backgroundColor: p.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Health', headerTitle: 'Finealth', tabBarIcon: glyph('◎'), tabBarButtonTestID: 'tab-health' }} />
      <Tabs.Screen name="plan" options={{ title: 'Plan', tabBarIcon: glyph('◆'), tabBarButtonTestID: 'tab-plan' }} />
      <Tabs.Screen name="tools" options={{ title: 'Calculators', tabBarIcon: glyph('∑'), tabBarButtonTestID: 'tab-tools' }} />
      <Tabs.Screen name="more" options={{ title: 'More', tabBarIcon: glyph('☰'), tabBarButtonTestID: 'tab-more' }} />
    </Tabs>
  );
}
