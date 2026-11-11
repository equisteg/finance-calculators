import { useState } from 'react';
import { Text, View } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { config } from '@/lib/config';
import { usePalette } from '@/theme';
import { useAds } from './AdsProvider';

/**
 * One banner at the end of a screen, below the result and the disclaimer: never over content, beside navigation or
 * buttons, or mid-task. Nothing renders (no space reserved) for Pro users or before consent allows ads.
 * Banner requests carry no financial input: AdMob gets only what the SDK sends by itself.
 */
export function AdBanner() {
  const { ready } = useAds();
  const p = usePalette();
  const [failed, setFailed] = useState(false);
  if (!ready || failed) return null;
  return (
    <View testID="ad-slot" style={{ alignItems: 'center', gap: 4, marginTop: 8 }}>
      <Text style={{ color: p.muted, fontSize: 11 }}>Advertisement</Text>
      <BannerAd unitId={config.admobBannerId || TestIds.ADAPTIVE_BANNER} size={BannerAdSize.INLINE_ADAPTIVE_BANNER} onAdFailedToLoad={() => setFailed(true)} />
    </View>
  );
}
