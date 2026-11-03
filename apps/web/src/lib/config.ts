// Public build-time config. Each NEXT_PUBLIC_* must be read literally so Next can inline it. Never put a secret here.
const clean = (v: string | undefined) => (v ?? '').trim();

export const config = {
  siteUrl: (clean(process.env.NEXT_PUBLIC_SITE_URL) || 'http://localhost:3000').replace(/\/$/, ''),
  noindex: clean(process.env.NEXT_PUBLIC_NOINDEX) === '1',
  contactEmail: clean(process.env.NEXT_PUBLIC_CONTACT_EMAIL) || 'support@equisteg.com',
  playUrl: clean(process.env.NEXT_PUBLIC_PLAY_URL),
  /** Registered business address shown on Contact/Terms (Razorpay website review). FOUNDER: set it before going live. */
  businessAddress: clean(process.env.NEXT_PUBLIC_BUSINESS_ADDRESS) || '<Equisteg registered address>',
  apiBase: clean(process.env.NEXT_PUBLIC_API_BASE).replace(/\/$/, ''),
  licencePublicKey: clean(process.env.NEXT_PUBLIC_LICENCE_PUBLIC_KEY),
  /** dev | staging | production. Pro tokens issued by another environment's API are refused (empty = not checked). */
  env: clean(process.env.NEXT_PUBLIC_ENV),
  /** Razorpay Checkout on /pricing. Anything but '1' → the buy buttons show "Coming soon". */
  razorpayEnabled: clean(process.env.NEXT_PUBLIC_RAZORPAY_ENABLED) === '1',
  /** Feature kill switches (comma list), e.g. "checkout". Switched by a redeploy. */
  killSwitches: clean(process.env.NEXT_PUBLIC_KILL_SWITCHES).split(',').map((s) => s.trim()).filter(Boolean),
} as const;

export const EQUISTEG_URL = 'https://equisteg.com';
