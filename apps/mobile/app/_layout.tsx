import { useEffect, useState } from 'react';
import { Stack, SplashScreen } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AdsProvider } from '@/components/AdsProvider';
import { ProProvider } from '@/components/ProProvider';
import { store } from '@/lib/storage';
import { usePalette } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const p = usePalette();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    store.ready.finally(() => {
      setReady(true);
      SplashScreen.hideAsync().catch(() => undefined);
    });
  }, []);
  if (!ready) return null;
  return (
    <SafeAreaProvider>
      <ProProvider>
        <AdsProvider>
          <StatusBar style="auto" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: p.bg },
              headerTintColor: p.fg,
              headerShadowVisible: false,
              contentStyle: { backgroundColor: p.bg },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="debt" options={{ title: 'Debt payoff planner' }} />
            <Stack.Screen name="goals" options={{ title: 'Goal planner' }} />
            <Stack.Screen name="retirement" options={{ title: 'Retirement planner' }} />
            <Stack.Screen name="prepayment" options={{ title: 'Loan prepayment' }} />
            <Stack.Screen name="tool/[slug]" options={{ title: 'Calculator' }} />
            <Stack.Screen name="pro" options={{ title: 'Finealth Pro' }} />
            <Stack.Screen name="about" options={{ title: 'About' }} />
          </Stack>
        </AdsProvider>
      </ProProvider>
    </SafeAreaProvider>
  );
}
