// POST /api/v1/checkout          — creates a Razorpay order (lifetime) or subscription (yearly) at the SERVER's price.
// POST /api/v1/checkout/confirm  — checks the Checkout signature, then the payment with Razorpay, and returns the first
//                                  Pro token plus the buyer's licence key (pay_… or sub_…). Counts as activation #1,
//                                  once per payment (notes.fh_confirmed), so a retried confirm does not count again.
//                                  An `authorized` (not yet captured) lifetime payment of OUR order is captured here.
// Nothing is stored: the order/subscription notes `{ product: 'finealth', plan }` are how verify recognises our sales.
import { Hono } from 'hono';
import { licenceKeyHash } from '../../../../packages/finance-core/src/licence.ts';
import type { AppEnv } from '../env.ts';
import { CURRENCIES, PRODUCT_NOTE, SKUS, WEB_PLANS, YEARLY_TOTAL_COUNT, type Currency, type WebPlan } from '../config/skus.ts';
import { configured, HttpError, readJsonObject, unavailable } from '../lib/http.ts';
import { razorpay, requireRazorpay, upstreamUnavailable, verifySignature } from '../lib/razorpay.ts';
import { logLine, sha256Hex } from '../lib/scrub.ts';
import { issueToken, requireSigner } from '../lib/signing.ts';
import { resolveRazorpayKey } from './licence.ts';

export const INVALID_PAYMENT_MESSAGE = 'We could not confirm this payment.';
export const INTERNATIONAL_DISABLED_MESSAGE = 'International payments are not enabled yet.';
export const CHECKOUT_PAUSED_MESSAGE = 'Buying Pro is paused for a short while. Please try again later.';
/** KILL_SWITCHES contains `checkout` → new checkouts answer 503. Never applies to /confirm or /licence/verify. */
const checkoutKilled = (v: string | undefined) => (v ?? '').split(',').some((s) => s.trim() === 'checkout');
const invalidPayment = () => new HttpError(400, 'invalid_payment', INVALID_PAYMENT_MESSAGE);

const randomReceipt = () => {
  const b = crypto.getRandomValues(new Uint8Array(12));
  return `fh-${[...b].map((x) => x.toString(16).padStart(2, '0')).join('')}`; // 27 chars (Razorpay max 40)
};

export const checkout = new Hono<AppEnv>();

checkout.post('/', async (c) => {
  if (checkoutKilled(c.env.KILL_SWITCHES)) {
    logLine({ rid: c.get('rid'), evt: 'checkout', result: 'kill_switch' });
    throw new HttpError(503, 'unavailable', CHECKOUT_PAUSED_MESSAGE);
  }
  const body = await readJsonObject(c);
  const { plan, currency } = body;
  if (typeof plan !== 'string' || !WEB_PLANS.includes(plan as WebPlan)) {
    throw new HttpError(400, 'invalid_request', 'Choose a plan: pro_yearly or pro_lifetime.');
  }
  if (typeof currency !== 'string' || !CURRENCIES.includes(currency as Currency)) {
    throw new HttpError(400, 'invalid_request', 'Choose a currency: INR or USD.');
  }
  const webPlan = plan as WebPlan;
  const cur = currency as Currency;
  const rid = c.get('rid');
  const cfg = requireRazorpay(c.env, rid);
  await requireSigner(c.env); // never take money we could not confirm
  const sku = SKUS[webPlan];
  const amount = sku.price[cur];
  const notes = { product: PRODUCT_NOTE, plan: webPlan };
  const fail = (e: unknown) => upstreamUnavailable(e, { rid, evt: 'checkout', plan: webPlan, currency: cur });

  if (webPlan === 'pro_lifetime') {
    let order: { id?: string };
    try {
      order = await razorpay<{ id?: string }>(cfg, 'POST', '/orders', { amount, currency: cur, receipt: randomReceipt(), notes });
    } catch (e) {
      throw fail(e);
    }
    if (typeof order.id !== 'string' || !order.id.startsWith('order_')) throw fail(null);
    logLine({ rid, evt: 'checkout', plan: webPlan, currency: cur, result: 'order_created' });
    return c.json({ provider: 'razorpay', keyId: cfg.keyId, plan: webPlan, currency: cur, amount, orderId: order.id, name: 'Finealth', description: sku.description });
  }

  const planId = cur === 'USD' ? c.env.RAZORPAY_PLAN_ID_YEARLY_USD : c.env.RAZORPAY_PLAN_ID_YEARLY_INR;
  if (!configured(planId)) {
    logLine({ rid, evt: 'checkout', plan: webPlan, currency: cur, result: 'plan_missing' });
    if (cur === 'USD') throw new HttpError(503, 'unavailable', INTERNATIONAL_DISABLED_MESSAGE);
    throw unavailable();
  }
  let sub: { id?: string };
  try {
    sub = await razorpay<{ id?: string }>(cfg, 'POST', '/subscriptions', { plan_id: planId, total_count: YEARLY_TOTAL_COUNT, customer_notify: true, notes });
  } catch (e) {
    throw fail(e);
  }
  if (typeof sub.id !== 'string' || !sub.id.startsWith('sub_')) throw fail(null);
  logLine({ rid, evt: 'checkout', plan: webPlan, currency: cur, result: 'subscription_created' });
  return c.json({ provider: 'razorpay', keyId: cfg.keyId, plan: webPlan, currency: cur, amount, subscriptionId: sub.id, name: 'Finealth', description: sku.description });
});

const PAY_ID = /^pay_[A-Za-z0-9]{8,40}$/;
const ORDER_ID = /^order_[A-Za-z0-9]{8,40}$/;
const SUB_ID = /^sub_[A-Za-z0-9]{8,40}$/;

checkout.post('/confirm', async (c) => {
  const body = await readJsonObject(c);
  const paymentId = body.razorpay_payment_id;
  const signature = body.razorpay_signature;
  const orderId = body.razorpay_order_id;
  const subId = body.razorpay_subscription_id;
  const hasOrder = orderId !== undefined && orderId !== null;
  const hasSub = subId !== undefined && subId !== null;
  if (hasOrder === hasSub) throw new HttpError(400, 'invalid_request', 'Send exactly one of razorpay_order_id or razorpay_subscription_id.');
  if (typeof signature !== 'string' || typeof paymentId !== 'string' || !PAY_ID.test(paymentId)) throw invalidPayment();
  if (hasOrder && (typeof orderId !== 'string' || !ORDER_ID.test(orderId))) throw invalidPayment();
  if (hasSub && (typeof subId !== 'string' || !SUB_ID.test(subId))) throw invalidPayment();

  const rid = c.get('rid');
  const cfg = requireRazorpay(c.env, rid);
  const signer = await requireSigner(c.env);
  const key = (hasOrder ? paymentId : subId) as string;
  const keyRef = await sha256Hex(key, 4);
  const log = (result: string, extra: Record<string, unknown> = {}) =>
    logLine({ rid, evt: 'checkout_confirm', src: 'razorpay', flow: hasOrder ? 'order' : 'subscription', keyRef, result, ...extra });

  const payload = hasOrder ? `${orderId}|${paymentId}` : `${paymentId}|${subId}`;
  if (!(await verifySignature(cfg.keySecret, payload, signature))) {
    log('bad_signature');
    throw invalidPayment();
  }

  const r = await resolveRazorpayKey(
    c.env,
    cfg,
    key,
    hasOrder ? { mode: 'confirm', orderId: orderId as string } : { mode: 'confirm', firstPaymentId: paymentId },
    log,
  );
  const token = await issueToken(c.env, signer, r.plan, 'razorpay', { storeExpiry: r.storeExpiry, kh: await licenceKeyHash(r.key) });
  log('ok', { plan: r.plan });
  return c.json({ token, key: r.key, plan: r.plan });
});
