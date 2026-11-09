// Web Pro prices — SERVER config only. The browser never sends an amount: /api/v1/checkout reads it from here.
// /api/v1/licence/verify checks a lifetime payment against ITS OWN ORDER (created by /checkout at the price of that day:
// amount, currency, notes), so changing a price here never breaks keys sold at an older price.
// Amounts are in the currency's smallest unit (paise / cents), as Razorpay expects.
// The yearly price is charged by the Razorpay plan (dashboard → Subscriptions → Plans); keep the plans equal to these.
// NEVER edit or delete an existing Razorpay plan. To change the yearly price: create a new plan, put its id in
// RAZORPAY_PLAN_ID_YEARLY_INR/_USD, and ADD the old id to RAZORPAY_PLAN_IDS_YEARLY_LEGACY (comma list) so existing
// subscriptions keep verifying.
import type { ProPlan } from '@finealth/shared-types';

export const WEB_PLANS = ['pro_yearly', 'pro_lifetime'] as const;
export type WebPlan = (typeof WEB_PLANS)[number] & ProPlan;
export const CURRENCIES = ['INR', 'USD'] as const;
export type Currency = (typeof CURRENCIES)[number];

export const SKUS: Record<WebPlan, { description: string; price: Record<Currency, number> }> = {
  pro_lifetime: { description: 'Finealth Pro, lifetime', price: { INR: 49900, USD: 1999 } },
  // ₹199 / US$7.99 per year: shown at checkout; the Razorpay plan does the actual charging.
  pro_yearly: { description: 'Finealth Pro, yearly', price: { INR: 19900, USD: 799 } },
};

/** Notes put on every order and subscription; verify refuses anything without them. */
export const PRODUCT_NOTE = 'finealth';
/** Subscription billing cycles (10 years), then the subscription completes. */
export const YEARLY_TOTAL_COUNT = 10;
/** Pro stays on this long past current_end while Razorpay retries a failed renewal. */
export const RENEWAL_GRACE_SECONDS = 3 * 24 * 3600;
