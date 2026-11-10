// Razorpay REST client (fetch only, no SDK). Checked against razorpay.com/docs, Oct 2026:
//   Auth: HTTP Basic key_id:key_secret.                       https://razorpay.com/docs/api/orders/create
//   POST  /v1/orders        { amount, currency, receipt (≤40, unique), notes (≤15 pairs) } → { id: order_… }
//   POST  /v1/subscriptions { plan_id, total_count, customer_notify (boolean), notes } → { id: sub_…, status: created }
//   GET   /v1/subscriptions/:id → { status, plan_id, current_start, current_end, ended_at, notes, … }
//         status: created | authenticated | active | pending | halted | cancelled | completed | expired | paused
//         A wrong or unknown id answers 400 BAD_REQUEST_ERROR ("The ID provided is invalid or could not be found").
//         PATCH /v1/subscriptions/:id cannot change notes (only plan_id, quantity, remaining_count, schedule_change_at…).
//         Immediate cancel: status cancelled, ended_at = cancel time (current_end stays the cycle end) → Pro ends now.
//   GET   /v1/invoices?subscription_id=sub_… → { items: [{ status: paid|…, payment_id, paid_at, created_at }] }
//   GET   /v1/invoices/:id → { id, subscription_id (null for one-off invoices), payment_id, status }
//   GET   /v1/orders/:id → { id, amount, currency, status: created|attempted|paid, notes }
//   GET   /v1/payments/:id → { status: created|authorized|captured|refunded|failed, amount, currency, order_id,
//         invoice_id (subscription charges), amount_refunded, refund_status: null|partial|full, captured, notes }
//   PATCH /v1/payments/:id  { notes } — notes is the only field that can be changed.
//   POST  /v1/payments/:id/capture { amount, currency } → the payment (status captured); only when status is authorized.
//   Disputes: only GET /v1/disputes (list, filters from/to/count/skip) and GET /v1/disputes/:id — there is NO lookup by
//         payment id, so verify does not check disputes (support process: docs/risk-register.md RSK-119).
//   Checkout signature: order flow HMAC_SHA256(order_id + "|" + payment_id, key_secret) (hex);
//                       subscription flow HMAC_SHA256(payment_id + "|" + subscription_id, key_secret).
import type { Env } from '../env.ts';
import { configured, fetchWithRetry, HttpError, unavailable } from './http.ts';
import { logLine } from './scrub.ts';

export const RAZORPAY_API = 'https://api.razorpay.com/v1';

export interface RazorpayConfig {
  keyId: string;
  keySecret: string;
}

/** Key mode must match the environment: production only rzp_live_, dev/staging only rzp_test_. */
export function keyModeOk(env: Env, keyId: string): boolean {
  const live = keyId.startsWith('rzp_live_');
  const test = keyId.startsWith('rzp_test_');
  return env.ENVIRONMENT === 'production' ? live : test;
}

/** True when both keys are set (config presence and mode only — no network call). */
export const razorpayConfigured = (env: Env) =>
  configured(env.RAZORPAY_KEY_ID) && configured(env.RAZORPAY_KEY_SECRET) && keyModeOk(env, env.RAZORPAY_KEY_ID.trim());

/** Keys or 503. A test key in production (or a live key outside production) is refused and logged. */
export function requireRazorpay(env: Env, rid?: string): RazorpayConfig {
  const keyId = env.RAZORPAY_KEY_ID?.trim();
  const keySecret = env.RAZORPAY_KEY_SECRET?.trim();
  if (!configured(keyId) || !configured(keySecret)) {
    logLine({ rid, evt: 'razorpay_config', result: 'missing' });
    throw unavailable();
  }
  if (!keyModeOk(env, keyId)) {
    logLine({ rid, evt: 'razorpay_config', result: 'key_mode_mismatch', env: env.ENVIRONMENT ?? 'dev' });
    throw unavailable();
  }
  return { keyId, keySecret };
}

/** Upstream answered with an error, or could not be reached (status 0). */
export class RazorpayError extends Error {
  constructor(readonly status: number) {
    super(`razorpay ${status}`);
    this.name = 'RazorpayError';
  }
}

/** 400/404 from a fetch-by-id means "no such id on our account" — the caller turns it into invalid_key. */
export const isNotFound = (e: unknown) => e instanceof RazorpayError && (e.status === 400 || e.status === 404);

/**
 * One Razorpay call. GETs retry once on a network error / 5xx; POST and PATCH are sent once (no duplicate orders).
 * Throws RazorpayError on any non-2xx or unreachable upstream. Never logs the key or the response body.
 */
export async function razorpay<T>(cfg: RazorpayConfig, method: 'GET' | 'POST' | 'PATCH', path: string, body?: unknown): Promise<T> {
  const init: RequestInit = {
    method,
    headers: {
      authorization: `Basic ${btoa(`${cfg.keyId}:${cfg.keySecret}`)}`,
      accept: 'application/json',
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  };
  let res: Response;
  try {
    res = method === 'GET' ? await fetchWithRetry(`${RAZORPAY_API}${path}`, init) : await fetch(`${RAZORPAY_API}${path}`, { ...init, signal: AbortSignal.timeout(8000) });
  } catch {
    throw new RazorpayError(0);
  }
  if (!res.ok) throw new RazorpayError(res.status);
  const data = (await res.json().catch(() => null)) as T | null;
  if (!data || typeof data !== 'object') throw new RazorpayError(res.status);
  return data;
}

/** Logs the upstream status and returns the 503 to throw. */
export function upstreamUnavailable(e: unknown, fields: Record<string, unknown>): HttpError {
  logLine({ ...fields, result: 'upstream_error', upstream: e instanceof RazorpayError ? e.status : 'error' });
  return unavailable();
}

function hexToBytes(hex: string): Uint8Array | null {
  if (!/^[0-9a-f]{64}$/i.test(hex)) return null;
  const out = new Uint8Array(32);
  for (let i = 0; i < 32; i++) out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

/**
 * Checks a Checkout signature: HMAC-SHA256(payload, key_secret), hex. crypto.subtle.verify compares in constant time.
 * payload is `${order_id}|${payment_id}` (order) or `${payment_id}|${subscription_id}` (subscription).
 */
export async function verifySignature(keySecret: string, payload: string, signatureHex: string): Promise<boolean> {
  const sig = hexToBytes(signatureHex);
  if (!sig) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(keySecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  return crypto.subtle.verify('HMAC', key, sig, new TextEncoder().encode(payload));
}

export interface RzPayment {
  id?: string;
  status?: string;
  amount?: number;
  currency?: string;
  order_id?: string | null;
  amount_refunded?: number;
  refund_status?: string | null;
  captured?: boolean;
  invoice_id?: string | null;
  notes?: Record<string, unknown> | unknown[];
}
export interface RzOrder {
  id?: string;
  status?: string;
  amount?: number;
  currency?: string;
  notes?: Record<string, unknown> | unknown[];
}
export interface RzSubscription {
  id?: string;
  status?: string;
  plan_id?: string;
  current_end?: number | null;
  ended_at?: number | null;
  notes?: Record<string, unknown> | unknown[];
}
export interface RzInvoice {
  id?: string;
  subscription_id?: string | null;
  status?: string;
  payment_id?: string | null;
  paid_at?: number | null;
  created_at?: number;
}

/** Razorpay sends `notes: []` when there are none. */
export const notesOf = (n: unknown): Record<string, unknown> => (n && typeof n === 'object' && !Array.isArray(n) ? (n as Record<string, unknown>) : {});
