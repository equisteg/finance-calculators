// POST /api/v1/play/verify — Android Pro via Google Play Billing. Stateless: Google Play is the only record.
// Google Play Developer API v3 (developers.google.com/android-publisher/api-ref, checked Oct 2026):
//   subscriptions: GET .../applications/{pkg}/purchases/subscriptionsv2/tokens/{token}
//     subscriptionState: SUBSCRIPTION_STATE_{ACTIVE|IN_GRACE_PERIOD|CANCELED|EXPIRED|ON_HOLD|PAUSED|PENDING|PENDING_PURCHASE_CANCELED}
//     lineItems[]: { productId, expiryTime (RFC 3339), offerDetails: { basePlanId } }
//   one-time:      GET .../applications/{pkg}/purchases/products/{productId}/tokens/{token}
//     purchaseState 0 Purchased / 1 Canceled / 2 Pending; refundableQuantity = quantity not refunded.
import { Hono } from 'hono';
import type { ProPlan } from '@finealth/shared-types';
import type { AppEnv } from '../env.ts';
import { googleAccessToken, parseServiceAccount } from '../lib/google.ts';
import { configured, fetchWithRetry, HttpError, readJsonObject, unavailable } from '../lib/http.ts';
import { logLine, sha256Hex } from '../lib/scrub.ts';
import { issueToken, nowSeconds, requireSigner } from '../lib/signing.ts';

export const PUBLISHER_BASE = 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications';
export const INVALID_PURCHASE_MESSAGE = 'We could not confirm this purchase with Google Play. Try "Restore purchases" again.';
const invalidPurchase = () => new HttpError(400, 'invalid_key', INVALID_PURCHASE_MESSAGE);
const BASE_PLANS: Record<string, ProPlan> = { monthly: 'pro_monthly', yearly: 'pro_yearly' };
const ACTIVE = new Set(['SUBSCRIPTION_STATE_ACTIVE', 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD', 'SUBSCRIPTION_STATE_CANCELED']);
const PENDING = new Set(['SUBSCRIPTION_STATE_PENDING']);

interface SubscriptionV2 {
  subscriptionState?: string;
  lineItems?: { productId?: string; expiryTime?: string; offerDetails?: { basePlanId?: string } }[];
}
interface ProductPurchase {
  purchaseState?: number;
  productId?: string;
  quantity?: number;
  refundableQuantity?: number;
}

export const play = new Hono<AppEnv>();

play.post('/verify', async (c) => {
  const body = await readJsonObject(c);
  const { purchaseToken, productId, kind } = body;
  if (kind !== 'subscription' && kind !== 'product') throw new HttpError(400, 'invalid_request', 'kind must be "subscription" or "product".');
  if (typeof productId !== 'string' || !/^[a-z0-9._]{1,150}$/.test(productId)) throw new HttpError(400, 'invalid_request', 'Unknown product.');
  if (typeof purchaseToken !== 'string' || !/^[A-Za-z0-9._:-]{10,4096}$/.test(purchaseToken)) throw invalidPurchase();

  const env = c.env;
  const expected = kind === 'subscription' ? env.PLAY_SUBSCRIPTION_ID : env.PLAY_LIFETIME_PRODUCT_ID;
  if (!configured(env.PLAY_PACKAGE_NAME) || !configured(expected)) throw unavailable();
  if (productId !== expected) throw new HttpError(400, 'invalid_request', 'Unknown product.');
  const sa = parseServiceAccount(env.GOOGLE_PLAY_SA_KEY);
  if (!sa) throw unavailable();
  const signer = await requireSigner(env);

  const tokenRef = await sha256Hex(purchaseToken, 4);
  const log = (result: string, extra: Record<string, unknown> = {}) =>
    logLine({ rid: c.get('rid'), evt: 'licence_verify', src: 'play', kind, tokenRef, result, ...extra });

  const accessToken = await googleAccessToken(sa);
  const pkg = encodeURIComponent(env.PLAY_PACKAGE_NAME);
  const url =
    kind === 'subscription'
      ? `${PUBLISHER_BASE}/${pkg}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`
      : `${PUBLISHER_BASE}/${pkg}/purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}`;

  let res: Response;
  try {
    res = await fetchWithRetry(url, { headers: { authorization: `Bearer ${accessToken}`, accept: 'application/json' } });
  } catch {
    log('upstream_unreachable');
    throw unavailable();
  }
  if (res.status === 410) {
    // Google: the purchase token is no longer valid (refunded, revoked or long expired).
    log('gone');
    throw new HttpError(403, 'expired', 'This purchase is no longer active on Google Play.');
  }
  if (res.status === 400 || res.status === 404) {
    log('invalid', { upstream: res.status });
    throw invalidPurchase();
  }
  if (!res.ok) {
    // 401/403 here mean our service account is not linked / lacks permission: an ops problem, not the user's.
    log('upstream_error', { upstream: res.status });
    throw unavailable();
  }
  const now = nowSeconds();

  if (kind === 'subscription') {
    const sub = ((await res.json().catch(() => null)) ?? {}) as SubscriptionV2;
    const item = sub.lineItems?.find((li) => li.productId === expected);
    const plan = item?.offerDetails?.basePlanId ? BASE_PLANS[item.offerDetails.basePlanId] : undefined;
    if (!item || !plan) {
      log('invalid', { reason: 'line_item' });
      throw invalidPurchase();
    }
    const expMs = item.expiryTime ? Date.parse(item.expiryTime) : NaN;
    const expiry = Number.isFinite(expMs) ? Math.floor(expMs / 1000) : undefined;
    const state = sub.subscriptionState ?? '';
    if (PENDING.has(state)) {
      log('pending');
      throw new HttpError(409, 'pending', 'Your payment is still pending with Google Play. Try again once it completes.');
    }
    if (!ACTIVE.has(state) || expiry === undefined || expiry <= now) {
      log('expired', { state });
      throw new HttpError(403, 'expired', 'This subscription has ended. Renew it in Google Play to keep Pro.');
    }
    const token = await issueToken(c.env, signer, plan, 'play', { storeExpiry: expiry, now });
    log('ok', { plan });
    return c.json({ token });
  }

  const p = ((await res.json().catch(() => null)) ?? {}) as ProductPurchase;
  if (p.productId && p.productId !== expected) {
    log('invalid', { reason: 'product' });
    throw invalidPurchase();
  }
  if (p.purchaseState === 2) {
    log('pending');
    throw new HttpError(409, 'pending', 'Your payment is still pending with Google Play. Try again once it completes.');
  }
  if (p.purchaseState === 1 || p.refundableQuantity === 0) {
    log('refunded');
    throw new HttpError(403, 'refunded', 'This purchase was refunded or cancelled, so Pro is no longer active.');
  }
  if (p.purchaseState !== 0) {
    log('invalid', { reason: 'state' });
    throw invalidPurchase();
  }
  const token = await issueToken(c.env, signer, 'pro_lifetime', 'play', { now });
  log('ok', { plan: 'pro_lifetime' });
  return c.json({ token });
});
