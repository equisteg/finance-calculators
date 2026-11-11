import type { ExpoConfig } from 'expo/config';

/**
 * Finealth Android app (Expo, development builds via EAS; not Expo Go, because AdMob and Play Billing need native code).
 * Public build-time values only: every EXPO_PUBLIC_* value ends up in the app bundle. Never put a secret here.
 */
const env = (k: string) => (process.env[k] ?? '').trim();

// Google's published AdMob sample app id: shows test ads only. FOUNDER: set ADMOB_ANDROID_APP_ID for release builds.
const ADMOB_TEST_APP_ID = 'ca-app-pub-3940256099942544~3347511713';

const config: ExpoConfig = {
  name: 'Finealth',
  slug: 'finealth',
  platforms: ['android'],
  owner: env('EXPO_OWNER') || undefined,
  scheme: 'finealth',
  version: '2.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  backgroundColor: '#f5f1ea',
  android: {
    // Kept from the Capacitor app so this build updates the same Play listing (publisher.config.json).
    package: 'com.tezech.finealth',
    // The Capacitor app shipped versionCode 1; EAS increments from here (eas.json appVersionSource "remote").
    versionCode: 2,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#a84b2a',
    },
    // Financial numbers stay on this device only (CLAUDE.md "No database, local-first"): no cloud backup of app data.
    allowBackup: false,
    // Nothing in the app needs these; some libraries add them by default.
    blockedPermissions: [
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.RECORD_AUDIO',
      'android.permission.CAMERA',
    ],
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        imageWidth: 160,
        resizeMode: 'contain',
        backgroundColor: '#f5f1ea',
        dark: { image: './assets/splash-icon.png', backgroundColor: '#14110e' },
      },
    ],
    ['expo-build-properties', { android: { minSdkVersion: 24 } }],
    'expo-iap',
    [
      'react-native-google-mobile-ads',
      {
        androidAppId: env('ADMOB_ANDROID_APP_ID') || ADMOB_TEST_APP_ID,
        // No ad request before the consent check has run (UMP), see src/lib/ads.ts.
        delayAppMeasurementInit: true,
      },
    ],
  ],
  experiments: { typedRoutes: true },
  extra: {
    eas: env('EAS_PROJECT_ID') ? { projectId: env('EAS_PROJECT_ID') } : undefined,
  },
};

export default config;
