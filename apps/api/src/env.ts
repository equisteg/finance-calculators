/** Workers Rate Limiting binding (subset we use). */
export interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export interface Env {
  ENVIRONMENT?: string;
  /** Set per deploy: `wrangler deploy --var RELEASE:<sha>`. */
  RELEASE?: string;
  CANONICAL_HOST?: string;
  /** Comma-separated extra origins allowed to call the API (e.g. a preview URL). */
  ALLOWED_ORIGINS?: string;
  /** Public Razorpay key id: rzp_live_… in production, rzp_test_… in dev/staging (anything else is refused). */
  RAZORPAY_KEY_ID?: string;
  /** Razorpay plan ids (plan_…) of the yearly plans, created in the dashboard. USD unset = international off. */
  RAZORPAY_PLAN_ID_YEARLY_INR?: string;
  RAZORPAY_PLAN_ID_YEARLY_USD?: string;
  /**
   * Comma-separated plan ids of RETIRED yearly plans whose subscriptions must keep working (Razorpay plans cannot be
   * edited: a price change means a new plan; move the old id here instead of deleting it).
   */
  RAZORPAY_PLAN_IDS_YEARLY_LEGACY?: string;
  /** Comma-separated server kill switches. `checkout` → POST /checkout answers 503 (verify/confirm are never switched off). */
  KILL_SWITCHES?: string;
  /** Max browsers a licence key may be activated on (counter in Razorpay payment notes; default 5). */
  MAX_ACTIVATIONS?: string;
  PLAY_PACKAGE_NAME?: string;
  PLAY_SUBSCRIPTION_ID?: string;
  PLAY_LIFETIME_PRODUCT_ID?: string;
  // Secrets (wrangler secret put)
  LICENCE_SIGNING_KEY?: string;
  RAZORPAY_KEY_SECRET?: string;
  GOOGLE_PLAY_SA_KEY?: string;
  // Bindings
  RL_STRICT?: RateLimiter;
  RL_API?: RateLimiter;
  ASSETS?: { fetch(req: Request): Promise<Response> };
}

export type AppEnv = { Bindings: Env; Variables: { rid: string } };
