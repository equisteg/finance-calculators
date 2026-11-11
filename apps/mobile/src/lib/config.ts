// Public build-time config. Each EXPO_PUBLIC_* must be read literally so Expo can inline it. Never put a secret here.
const clean = (v: string | undefined) => (v ?? '').trim();

export const PRODUCTION_URL = 'https://finealth.teiqtools.com';

export const config = {
  /** Worker that verifies purchases and issues Pro tokens (apps/api). */
  apiBase: (clean(process.env.EXPO_PUBLIC_API_BASE) || PRODUCTION_URL).replace(/\/$/, ''),
  /** Ed25519 public key (raw, base64url). Empty → Pro cannot be activated in this build. */
  licencePublicKey: clean(process.env.EXPO_PUBLIC_LICENCE_PUBLIC_KEY),
  /** dev | staging | production. Tokens issued by another environment's API are refused (empty = not checked). */
  env: clean(process.env.EXPO_PUBLIC_ENV),
  /** AdMob banner unit id; empty → Google's test banner (never a live ad in dev builds). */
  admobBannerId: clean(process.env.EXPO_PUBLIC_ADMOB_BANNER_ID),
  siteUrl: PRODUCTION_URL,
  contactEmail: 'support@equisteg.com',
} as const;

export const EQUISTEG_URL = 'https://equisteg.com';

/** Google Play products (must match Play Console and apps/api wrangler PLAY_SUBSCRIPTION_ID / PLAY_LIFETIME_PRODUCT_ID). */
export const PLAY = {
  subscriptionId: 'pro',
  basePlans: { pro_monthly: 'monthly', pro_yearly: 'yearly' },
  lifetimeProductId: 'pro_lifetime',
} as const;
