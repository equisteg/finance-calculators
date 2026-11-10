/**
 * Types shared by apps/web, apps/mobile and apps/api (API contracts and the Pro token).
 * Nothing here holds personal data: Finealth keeps every financial number on the user's device.
 */

export type ProPlan = 'pro_monthly' | 'pro_yearly' | 'pro_lifetime';

/** Claims inside the signed Pro token issued by `apps/api` after the store confirms a purchase. Nothing personal. */
export interface LicenceClaims {
  /** Token format version. */
  v: 1;
  plan: ProPlan;
  /** Where the purchase lives: Razorpay (web) or Google Play (Android) is the only record (we keep no database). */
  src: 'razorpay' | 'play';
  /** Issued-at and expiry, seconds since epoch. Expiry ≤ 7 days so refunds/cancellations take effect. */
  iat: number;
  exp: number;
  /**
   * Razorpay tokens only: first 16 bytes of SHA-256(licence key), base64url (22 chars). Lets the API recognise a refresh
   * from a browser that already activated this key (it is not the key and cannot be turned back into it).
   */
  kh?: string;
  /** Environment of the API that issued the token. Clients reject a token from another environment. */
  env?: LicenceEnv;
}

export type LicenceEnv = 'dev' | 'staging' | 'production';

/** Body of every error the API returns. */
export interface ApiError {
  error: string;
  message: string;
}

/** `POST /api/v1/checkout` request. Amounts are never sent by the client. */
export interface CheckoutRequest {
  plan: 'pro_yearly' | 'pro_lifetime';
  currency: 'INR' | 'USD';
}

/** `POST /api/v1/licence/verify` and `/checkout/confirm` success body. */
export interface LicenceResponse {
  token: string;
  plan: ProPlan;
  exp: number;
  licenceKey?: string;
}
