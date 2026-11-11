import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import mobileAds, { AdsConsent, AdsConsentPrivacyOptionsRequirementStatus } from 'react-native-google-mobile-ads';
import { usePro } from './ProProvider';

/**
 * AdMob for free users only (CLAUDE.md: mobile ads = AdMob only; paid users load no ads at all).
 * Order: Google's certified consent message (UMP) first → only if it allows ads, the SDK is started → banners may load.
 * Pro users, and users whose licence is still being checked, never reach either step.
 */
interface AdsState {
  ready: boolean;
  privacyOptionsRequired: boolean;
  showPrivacyOptions: () => Promise<void>;
}
const Ctx = createContext<AdsState>({ ready: false, privacyOptionsRequired: false, showPrivacyOptions: async () => undefined });

let started: Promise<{ canRequestAds: boolean; privacyOptionsRequired: boolean }> | null = null;
function start() {
  started ??= AdsConsent.gatherConsent()
    .catch(() => AdsConsent.getConsentInfo())
    .then(async (info) => {
      if (info.canRequestAds) await mobileAds().initialize();
      return { canRequestAds: info.canRequestAds, privacyOptionsRequired: info.privacyOptionsRequirementStatus === AdsConsentPrivacyOptionsRequirementStatus.REQUIRED };
    })
    .catch(() => ({ canRequestAds: false, privacyOptionsRequired: false }));
  return started;
}

export function AdsProvider({ children }: { children: ReactNode }) {
  const { adsAllowed } = usePro();
  const [ready, setReady] = useState(false);
  const [privacyOptionsRequired, setRequired] = useState(false);

  useEffect(() => {
    if (!adsAllowed) return;
    let alive = true;
    start().then((r) => {
      if (!alive) return;
      setReady(r.canRequestAds);
      setRequired(r.privacyOptionsRequired);
    });
    return () => {
      alive = false;
    };
  }, [adsAllowed]);

  const showPrivacyOptions = async () => {
    try {
      const info = await AdsConsent.showPrivacyOptionsForm();
      setReady(adsAllowed && info.canRequestAds);
      if (info.canRequestAds && adsAllowed) await mobileAds().initialize();
    } catch {
      /* form unavailable */
    }
  };

  return <Ctx.Provider value={{ ready: ready && adsAllowed, privacyOptionsRequired, showPrivacyOptions }}>{children}</Ctx.Provider>;
}

export const useAds = () => useContext(Ctx);
