// POST /api/v1/licence/verify — web Pro via Razorpay. Stateless: Razorpay is the only record of a purchase.
// The licence key is the Razorpay id the buyer got at checkout: pay_… (lifetime payment) or sub_… (yearly subscription).
// A pay_… id of a SUBSCRIPTION charge (from a renewal receipt) is resolved to its subscription (payment.invoice_id →
// invoice.subscription_id) and answered as that sub_… key (returned as `key` so the client can keep it).
// Every call asks Razorpay "is this still paid?" and returns a short-lived signed token (see lib/razorpay.ts for the API).
//
// Body: { key, activate?: boolean, token?: string }
//   activate: true          → Restore Pro on a browser: counts one activation.
//   refresh  (no activate)  → MUST send the browser's last token. It is free only when that token: verifies with OUR
//                             signing key (expiry ignored), was issued ≤ 30 days ago, has src razorpay, kh =
//                             licenceKeyHash(key) and env = this Worker's environment. Anything else counts as an
//                             activation, so a refresh can never be used to skip the limit.
// Activation limit (still stateless): the counter lives in Razorpay payment notes, `fh_activations`.
//   pay_: the counter is on that payment. sub_: subscription notes cannot be updated through the API, so the counter is on
//   the subscription's first paid payment (from its invoices). Read-modify-write: best effort (RSK-104).
import { Hono } from 'hono';
import { licenceKeyHash, verifyLicenceSignature } from '../../../../packages/finance-core/src/licence.ts';
import type { AppEnv, Env } from '../env.ts';
import { PRODUCT_NOTE, RENEWAL_GRACE_SECONDS, type WebPlan } from '../config/skus.ts';
import { configured, HttpError, readJsonObject, unavailable } from '../lib/http.ts';
import {
  isNotFound,
  notesOf,
  razorpay,
  RazorpayError,
  requireRazorpay,
  type RazorpayConfig,
  type RzInvoice,
  type RzOrder,
  type RzPayment,
  type RzSubscription,
} from '../lib/razorpay.ts';
import { logLine, sha256Hex } from '../lib/scrub.ts';
import { envName, issueToken, loadVerifier, nowSeconds, requireSigner } from '../lib/signing.ts';

/** One message for every bad key — never reveal whether a key exists, belongs to another product, or was malformed. */
export const INVALID_KEY_MESSAGE = 'That licence key is not valid. Check the key on your Finealth Pro receipt (it starts with pay_ or sub_).';
export const TOO_MANY_ACTIVATIONS_MESSAGE = 'This licence key has been activated on too many browsers. Contact support to reset it.';
export const REFUNDED_MESSAGE = 'This purchase was refunded, so Pro is no longer active.';
export const KEY_PATTERN = /^(pay|sub)_[A-Za-z0-9]{8,40}$/;
export const DEFAULT_MAX_ACTIVATIONS = 5;
/** A refresh token older than this (by iat) no longer proves an earlier activation. */
export const REFRESH_PROOF_MAX_AGE_SECONDS = 30 * 24 * 3600;
const PAY_ID = /^pay_[A-Za-z0-9]{8,40}$/;
const ORDER_ID = /^order_[A-Za-z0-9]{6,40}$/;
const SUB_ID = /^sub_[A-Za-z0-9]{8,40}$/;
const INVOICE_ID = /^inv_[A-Za-z0-9]{6,40}$/;
const invalidKey = () => new HttpError(400, 'invalid_key', INVALID_KEY_MESSAGE);
const pending = () => new HttpError(409, 'pending', 'Your payment is still being processed. Please try again in a minute.');
const refunded = () => new HttpError(403, 'refunded', REFUNDED_MESSAGE);
const maxActivations = (env: Env) => {
  const n = Number.parseInt(env.MAX_ACTIVATIONS ?? '', 10);
  return Number.isInteger(n) && n > 0 ? n : DEFAULT_MAX_ACTIVATIONS;
};
const list = (v: string | undefined) =>
  (v ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(configured);

/** Configured yearly plan ids (placeholders ignored): the current INR/USD plans plus RAZORPAY_PLAN_IDS_YEARLY_LEGACY. */
export const yearlyPlanIds = (env: Env) =>
  [env.RAZORPAY_PLAN_ID_YEARLY_INR, env.RAZORPAY_PLAN_ID_YEARLY_USD].filter(configured).concat(list(env.RAZORPAY_PLAN_IDS_YEARLY_LEGACY));

export interface ResolveOptions {
  /**
   * activate: Restore Pro (counts). confirm: first activation after checkout (counts once per payment: fh_confirmed).
   * refresh: free only with a valid refresh proof (`refreshToken`), otherwise counts like activate.
   */
  mode: 'activate' | 'confirm' | 'refresh';
  refreshToken?: unknown;
  /** Confirm path: the signature-checked ids that must belong to this key (lifetime order id / first sub payment). */
  orderId?: string;
  firstPaymentId?: string;
}
type Log = (result: string, extra?: Record<string, unknown>) => void;
export interface Resolved {
  plan: WebPlan;
  storeExpiry?: number;
  /** The key the buyer should keep (sub_… when a subscription charge's pay_… id was sent). */
  key: string;
}

/** True when `token` proves this browser already activated one of `keys` (see the header comment). */
export async function refreshProven(env: Env, token: unknown, keys: string[], now = nowSeconds()): Promise<boolean> {
  if (typeof token !== 'string' || !token || token.length > 2000) return false;
  const verifier = await loadVerifier(env);
  if (!verifier) return false;
  const c = await verifyLicenceSignature(token, verifier);
  if (!c || c.src !== 'razorpay' || !c.kh || c.env !== envName(env)) return false;
  if (c.iat > now + 300 || now - c.iat > REFRESH_PROOF_MAX_AGE_SECONDS) return false;
  for (const k of new Set(keys)) if (c.kh === (await licenceKeyHash(k))) return true;
  return false;
}

/** Any refund (full or partial) ends Pro. */
const isRefunded = (p: RzPayment) => p.status === 'refunded' || (p.amount_refunded ?? 0) !== 0 || (p.refund_status ?? null) !== null;

/** Checks a pay_/sub_ key with Razorpay. Returns the plan, store expiry and canonical key, or throws the right HttpError. */
export async function resolveRazorpayKey(env: Env, cfg: RazorpayConfig, key: string, opts: ResolveOptions, log: Log): Promise<Resolved> {
  const upstream = (e: unknown) => (e instanceof RazorpayError ? e.status : 'error');
  const fetchOr = async <T,>(path: string): Promise<T> => {
    try {
      return await razorpay<T>(cfg, 'GET', path);
    } catch (e) {
      if (isNotFound(e)) {
        log('invalid', { upstream: 404 });
        throw invalidKey();
      }
      // 401 (our keys), 429, other 4xx, 5xx, network: not the buyer's fault — never "invalid key".
      log('upstream_error', { upstream: upstream(e) });
      throw unavailable();
    }
  };
  /** Any failure → 503 (for ids Razorpay itself gave us, where "not found" is not the buyer's fault). */
  const fetchOrUnavailable = async <T,>(path: string, what: string): Promise<T> => {
    try {
      return await razorpay<T>(cfg, 'GET', path);
    } catch (e) {
      log('upstream_error', { what, upstream: upstream(e) });
      throw unavailable();
    }
  };
  const notOurs = (reason: string) => {
    log('invalid', { reason });
    return invalidKey();
  };
  const shouldCount = async (canonical: string) => opts.mode !== 'refresh' || !(await refreshProven(env, opts.refreshToken, [key, canonical]));
  const confirm = opts.mode === 'confirm';

  /** Paid invoice payment ids, oldest first. An unreadable list is a 503 (never a silent pass on refunds). */
  const paidPaymentIds = async (subId: string): Promise<string[]> => {
    const l = await fetchOrUnavailable<{ items?: RzInvoice[] }>(`/invoices?subscription_id=${subId}`, 'invoices');
    return (l.items ?? [])
      .filter((i) => i.status === 'paid' && typeof i.payment_id === 'string' && PAY_ID.test(i.payment_id))
      .sort((a, b) => (a.paid_at ?? a.created_at ?? 0) - (b.paid_at ?? b.created_at ?? 0))
      .map((i) => i.payment_id as string);
  };

  const resolveSubscription = async (subId: string): Promise<Resolved> => {
    const s = await fetchOr<RzSubscription>(`/subscriptions/${subId}`);
    if (s.id !== undefined && s.id !== subId) throw invalidKey();
    // Subscription notes are set by our server at creation (and cannot be changed later through the API).
    if (notesOf(s.notes).product !== PRODUCT_NOTE || !s.plan_id || !yearlyPlanIds(env).includes(s.plan_id)) throw notOurs('not_ours');
    const now = nowSeconds();
    const end = typeof s.current_end === 'number' && s.current_end > 0 ? s.current_end : undefined;
    const endedAt = typeof s.ended_at === 'number' && s.ended_at > 0 ? s.ended_at : undefined;
    const expired = (status: string) => {
      log('expired', { status: status.slice(0, 30) });
      return new HttpError(403, 'expired', 'This subscription has ended. Buy Pro again to keep using it.');
    };
    let storeExpiry: number | undefined;
    switch (s.status) {
      case 'active':
      case 'pending': // a renewal charge failed and Razorpay is retrying: keep Pro through a short grace period
        storeExpiry = end === undefined ? undefined : end + RENEWAL_GRACE_SECONDS;
        break;
      case 'created':
      case 'authenticated':
        log('pending', { status: s.status });
        throw pending();
      case 'cancelled':
        // Cancelled immediately: ended_at is the cancel time → Pro ends then, even though current_end is later.
        if (endedAt !== undefined && endedAt <= now) throw expired('cancelled_ended');
        if (end !== undefined && end > now) {
          storeExpiry = endedAt !== undefined ? Math.min(end, endedAt) : end; // paid until the end of the cycle, no grace
          break;
        }
        throw expired('cancelled');
      default: // halted, completed, expired, paused, anything new
        throw expired(String(s.status));
    }

    // Refunds: Razorpay can refund a subscription charge without ending the subscription. Check the latest paid charge.
    const paidIds = await paidPaymentIds(subId);
    const latestId = paidIds.at(-1) ?? opts.firstPaymentId;
    const counterId = opts.firstPaymentId ?? paidIds[0];
    let latest: RzPayment | null = null;
    if (latestId) {
      latest = await fetchOrUnavailable<RzPayment>(`/payments/${latestId}`, 'payment');
      if (isRefunded(latest)) {
        log('refunded', { flow: 'subscription' });
        throw refunded();
      }
    } else {
      log('refund_check_skipped', { reason: 'no_paid_invoice' });
    }

    if (await shouldCount(subId)) {
      if (!counterId) {
        log('activation_skipped', { reason: 'no_paid_invoice' });
      } else {
        let p: RzPayment | null = counterId === latestId ? latest : null;
        if (!p) {
          try {
            p = await razorpay<RzPayment>(cfg, 'GET', `/payments/${counterId}`);
          } catch (e) {
            log('activation_skipped', { reason: 'payment_unreadable', upstream: upstream(e) });
          }
        }
        if (p) await countActivation(env, cfg, counterId, p, log, confirm);
      }
    }
    return { plan: 'pro_yearly', storeExpiry, key: subId };
  };

  if (!key.startsWith('pay_')) return resolveSubscription(key);

  const p = await fetchOr<RzPayment>(`/payments/${key}`);
  if (p.id !== undefined && p.id !== key) throw invalidKey();

  // A subscription charge (e.g. the pay_… id on a renewal receipt): answer for its subscription.
  if (typeof p.invoice_id === 'string' && INVOICE_ID.test(p.invoice_id)) {
    if (opts.orderId) throw notOurs('order_mismatch');
    const inv = await fetchOr<RzInvoice>(`/invoices/${p.invoice_id}`);
    if (typeof inv.subscription_id !== 'string' || !SUB_ID.test(inv.subscription_id)) throw notOurs('not_ours');
    return resolveSubscription(inv.subscription_id);
  }

  // Lifetime: the payment must belong to an order WE created (notes set by /checkout, amount = our price that day).
  // Payment notes are never trusted for product/plan: whoever pays can put anything there.
  if (typeof p.order_id !== 'string' || !ORDER_ID.test(p.order_id)) throw notOurs('no_order');
  if (opts.orderId && p.order_id !== opts.orderId) throw notOurs('order_mismatch');
  const o = await fetchOr<RzOrder>(`/orders/${p.order_id}`);
  const on = notesOf(o.notes);
  if (
    (o.id !== undefined && o.id !== p.order_id) ||
    on.product !== PRODUCT_NOTE ||
    on.plan !== 'pro_lifetime' ||
    typeof o.amount !== 'number' ||
    o.amount !== p.amount ||
    typeof o.currency !== 'string' ||
    o.currency !== p.currency ||
    (o.status !== 'paid' && o.status !== 'attempted')
  ) {
    throw notOurs('not_ours');
  }
  if (isRefunded(p)) {
    log('refunded');
    throw refunded();
  }
  let paid = p;
  if (p.status === 'authorized') {
    if (!confirm) {
      log('pending');
      throw pending();
    }
    // Safety net if the account is not on automatic capture (docs/MIGRATION-cloudflare.md): capture our own order's
    // payment at its order amount — only from the signature-checked confirm, sent once.
    try {
      paid = { ...p, ...(await razorpay<RzPayment>(cfg, 'POST', `/payments/${key}/capture`, { amount: o.amount, currency: o.currency })) };
      log('captured');
    } catch (e) {
      log('capture_failed', { upstream: upstream(e) });
      throw pending();
    }
  }
  if (paid.status !== 'captured') throw notOurs(`status_${String(paid.status).slice(0, 20)}`);
  if (await shouldCount(key)) await countActivation(env, cfg, key, paid, log, confirm);
  return { plan: 'pro_lifetime', key };
}

/**
 * Reads notes.fh_activations; refuses at the limit, else writes +1 (keeping the other notes). A failed write still grants.
 * `confirm`: a repeat /checkout/confirm for the same payment (fh_confirmed = '1') does not count again.
 * Read-modify-write without a lock: two activations at the same instant can both read N (best effort, RSK-104).
 */
async function countActivation(env: Env, cfg: RazorpayConfig, paymentId: string, p: RzPayment, log: Log, confirm: boolean): Promise<void> {
  const notes = notesOf(p.notes);
  if (confirm && notes.fh_confirmed === '1') {
    log('confirm_repeat');
    return;
  }
  const raw = Number.parseInt(String(notes.fh_activations ?? '0'), 10);
  const used = Number.isInteger(raw) && raw > 0 ? raw : 0;
  if (used >= maxActivations(env)) {
    log('too_many_activations', { activations: used });
    throw new HttpError(403, 'too_many_activations', TOO_MANY_ACTIVATIONS_MESSAGE);
  }
  try {
    await razorpay(cfg, 'PATCH', `/payments/${paymentId}`, { notes: { ...notes, fh_activations: String(used + 1), ...(confirm ? { fh_confirmed: '1' } : {}) } });
    log('activation_counted', { activations: used + 1 });
  } catch (e) {
    log('activation_not_saved', { upstream: e instanceof RazorpayError ? e.status : 'error' });
  }
}

export const licence = new Hono<AppEnv>();

licence.post('/verify', async (c) => {
  const body = await readJsonObject(c);
  if (body.activate !== undefined && typeof body.activate !== 'boolean') {
    throw new HttpError(400, 'invalid_request', 'activate must be true or false.');
  }
  if (body.token !== undefined && body.token !== null && typeof body.token !== 'string') {
    throw new HttpError(400, 'invalid_request', 'token must be a string.');
  }
  const key = typeof body.key === 'string' ? body.key.trim() : '';
  if (!KEY_PATTERN.test(key)) throw invalidKey();
  // `plan` from older clients is ignored: the plan always comes from Razorpay's data.
  const cfg = requireRazorpay(c.env, c.get('rid'));
  const signer = await requireSigner(c.env);
  const keyRef = await sha256Hex(key, 4); // 8 hex chars: enough to correlate support tickets, useless to attackers
  const mode = body.activate === true ? 'activate' : 'refresh';
  const log: Log = (result, extra = {}) => logLine({ rid: c.get('rid'), evt: 'licence_verify', src: 'razorpay', mode, keyRef, result, ...extra });

  const r = await resolveRazorpayKey(c.env, cfg, key, { mode, refreshToken: body.token }, log);
  const token = await issueToken(c.env, signer, r.plan, 'razorpay', { storeExpiry: r.storeExpiry, kh: await licenceKeyHash(r.key) });
  log('ok', { plan: r.plan });
  // `key` only when it changed (a subscription charge's pay_… id → its sub_…): the client keeps that one.
  return c.json(r.key === key ? { token } : { token, key: r.key });
});
