import type { LicenceClaims } from '@finealth/shared-types';
import { envMatches, importVerifyKey, nowSeconds, TOKEN_REFRESH_SECONDS, verifyLicence } from '@finealth/finance-core';

/**
 * Pro on the web, without accounts:
 * - Pro is bought with Razorpay Checkout (lib/checkout.ts). The licence key IS the Razorpay id of the purchase:
 *   the payment id (pay_…) for Lifetime, the subscription id (sub_…) for Yearly. apps/api checks it with Razorpay and
 *   returns a short-lived Ed25519-signed token (≤ 7 days); nothing is stored on our server.
 * - On another browser the buyer pastes that id on /pro ("Restore Pro").
 * - Pro is granted ONLY by a token whose signature verifies with NEXT_PUBLIC_LICENCE_PUBLIC_KEY, has not expired and
 *   (when both are known) was issued by the API of the same environment (claim `env` = NEXT_PUBLIC_ENV).
 *   No localStorage flag, success URL or unsigned claim ever grants Pro.
 * - Background refreshes send the stored token with the key: the API counts a refresh as a new activation unless that
 *   token proves this browser already activated the key (apps/api/src/routes/licence.ts).
 */
export type WebPlan = 'pro_yearly' | 'pro_lifetime';
export const WEB_PLANS: WebPlan[] = ['pro_yearly', 'pro_lifetime'];

export interface StoredPro {
  key: string;
  plan: WebPlan;
  token: string;
  /** Highest device time seen (seconds). Detects a clock set back to keep an old token alive. */
  lastSeen?: number;
}

export type ApiErrorCode = 'invalid_key' | 'refunded' | 'expired' | 'too_many_activations' | 'rate_limited' | 'pending' | 'unavailable' | 'network';

/** Clock more than an hour behind the last time we saw → do not trust the device clock; refresh online. */
const ROLLBACK_SLACK = 3600;

/** `key`: the API answered for a different (canonical) key — a renewal's pay_… id resolves to its sub_… — keep that one. */
export type TokenResult = { ok: true; token: string; key?: string } | { ok: false; code: ApiErrorCode; message: string };

export type ProStatus =
  | { state: 'checking' }
  /**
   * `unconfirmed`: a licence is stored but the last refresh failed for a temporary reason (offline, outage). Pro
   * features stay locked (no valid token), but ads are not shown either; a retry is scheduled.
   */
  | { state: 'free'; notice?: string; unconfirmed?: boolean }
  | { state: 'pro'; claims: LicenceClaims; plan: WebPlan };

export interface KV {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

export const PRO_KEY = 'finealth.pro.v1';
/** Razorpay payment id (Lifetime) or subscription id (Yearly). Older Gumroad keys no longer match → treated as free. */
const KEY_RE = /^(pay|sub)_[A-Za-z0-9]{8,40}$/;
export const KEY_HINT = 'Paste the payment ID (pay_…) or subscription ID (sub_…) from your Razorpay receipt.';

export const normaliseKey = (k: string) => k.trim().replace(/\s+/g, '');
export const isPlausibleKey = (k: string) => KEY_RE.test(normaliseKey(k));

export function readStoredPro(kv: KV | null): StoredPro | null {
  try {
    const raw = kv?.getItem(PRO_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as Record<string, unknown>;
    if (typeof o.key !== 'string' || !isPlausibleKey(o.key)) return null;
    if (!WEB_PLANS.includes(o.plan as WebPlan)) return null;
    if (typeof o.token !== 'string' || o.token.length > 2000) return null;
    const lastSeen = Number.isInteger(o.lastSeen) ? (o.lastSeen as number) : undefined;
    return { key: o.key, plan: o.plan as WebPlan, token: o.token, lastSeen };
  } catch {
    return null;
  }
}

export function writeStoredPro(kv: KV | null, p: StoredPro): void {
  try {
    kv?.setItem(PRO_KEY, JSON.stringify(p));
  } catch {
    /* private mode: Pro works for this visit only */
  }
}

export function clearStoredPro(kv: KV | null): void {
  try {
    kv?.removeItem(PRO_KEY);
  } catch {
    /* ignore */
  }
}

const MESSAGES: Record<ApiErrorCode, string> = {
  invalid_key: `That ID was not recognised. ${KEY_HINT}`,
  refunded: 'This purchase was refunded, so Pro is no longer active on this browser.',
  expired: 'This subscription has ended. Buy Pro again on the pricing page to keep Pro.',
  too_many_activations: 'This licence key has been activated on too many browsers. Contact support to reset it.',
  pending: 'This payment is still processing. Please try again in a few minutes.',
  rate_limited: 'Too many attempts. Please wait a minute and try again.',
  unavailable: 'The licence check is unavailable right now. Please try again shortly.',
  network: 'Could not reach the licence check. Check your connection and try again.',
};

/** User-facing message for an API error code. */
export const apiMessage = (code: ApiErrorCode) => MESSAGES[code];
export const UNCONFIRMED_MESSAGE = 'Couldn’t confirm Pro — retrying.';

/**
 * POST the key to apps/api. Never throws.
 * activate=true only from the Restore button (counts towards the activation limit). A refresh sends `token` (the last
 * one this browser stored): it proves an earlier activation, so the refresh does not count.
 */
export async function requestToken(apiBase: string, key: string, fetchImpl: typeof fetch = fetch, activate = false, token?: string): Promise<TokenResult> {
  let res: Response;
  try {
    res = await fetchImpl(`${apiBase}/api/v1/licence/verify`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      // No plan: the server derives it from Razorpay, and we take it from the verified token.
      body: JSON.stringify(activate ? { key: normaliseKey(key), activate: true } : token ? { key: normaliseKey(key), token } : { key: normaliseKey(key) }),
    });
  } catch {
    return { ok: false, code: 'network', message: MESSAGES.network };
  }
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* non-JSON (proxy error page) */
  }
  const b = (body ?? {}) as { token?: unknown; key?: unknown; error?: { code?: unknown; message?: unknown } };
  if (res.ok && typeof b.token === 'string') {
    return typeof b.key === 'string' && isPlausibleKey(b.key) ? { ok: true, token: b.token, key: normaliseKey(b.key) } : { ok: true, token: b.token };
  }
  const raw = typeof b.error?.code === 'string' ? b.error.code : '';
  const code: ApiErrorCode = raw in MESSAGES ? (raw as ApiErrorCode) : res.status === 429 ? 'rate_limited' : 'unavailable';
  return { ok: false, code, message: MESSAGES[code] };
}

/** True for answers that mean "this key will never work again here" (vs. a temporary outage). */
export const isFinal = (code: ApiErrorCode) => code === 'invalid_key' || code === 'refunded' || code === 'expired';

export interface ResolveDeps {
  kv: KV | null;
  publicKey: string;
  apiBase: string;
  fetchImpl?: typeof fetch;
  /** seconds since epoch */
  now?: number;
  /** test hook */
  verifyKey?: CryptoKey;
  /** This site's environment (NEXT_PUBLIC_ENV): tokens stamped with another `env` are refused. Empty = not checked. */
  env?: string;
}

async function loadKey(deps: ResolveDeps): Promise<CryptoKey | null> {
  if (deps.verifyKey) return deps.verifyKey;
  if (!deps.publicKey) return null;
  try {
    return await importVerifyKey(deps.publicKey);
  } catch {
    return null;
  }
}

/** Verify a token; null unless the signature is valid, it has not expired and its env (if any) is this site's. */
export async function checkToken(token: string, deps: ResolveDeps): Promise<LicenceClaims | null> {
  const key = await loadKey(deps);
  if (!key || !token) return null;
  const c = await verifyLicence(token, key, deps.now ?? nowSeconds());
  return c && envMatches(c, deps.env) ? c : null;
}

/** Temporary failures: Pro stays unconfirmed (no ads, no Pro features) and the check is retried. */
const isTemporary = (code: ApiErrorCode) => code === 'network' || code === 'unavailable' || code === 'rate_limited' || code === 'pending';

/**
 * App start: verify the stored token; refresh it silently when it is close to expiry or expired.
 * - valid and fresh → Pro
 * - refresh succeeds → store the new token → Pro
 * - API says refunded / invalid / expired → remove it, free with a calm notice
 * - network/outage → Pro while the old token is still valid, otherwise free + `unconfirmed` (no Pro features, no ads)
 *   until a later refresh works
 * - too many activations → free with that notice (the record is kept so support can reset it and a retry can work)
 */
export async function resolvePro(deps: ResolveDeps): Promise<ProStatus> {
  const stored = readStoredPro(deps.kv);
  if (!stored) return { state: 'free' };
  const now = deps.now ?? nowSeconds();
  const verified = await checkToken(stored.token, { ...deps, now });
  // A clock set back (vs. the last time seen, or before the token was issued) cannot keep an old token alive offline.
  const rolledBack = (stored.lastSeen !== undefined && now < stored.lastSeen - ROLLBACK_SLACK) || (!!verified && now < verified.iat - 300);
  const claims = rolledBack ? null : verified;
  const lastSeen = Math.max(now, stored.lastSeen ?? 0);
  if (!rolledBack && lastSeen !== stored.lastSeen) writeStoredPro(deps.kv, { ...stored, lastSeen });
  if (claims && claims.exp - now > TOKEN_REFRESH_SECONDS) return { state: 'pro', claims, plan: stored.plan };

  const res = await requestToken(deps.apiBase, stored.key, deps.fetchImpl, false, stored.token);
  if (res.ok) {
    const fresh = await checkToken(res.token, { ...deps, now });
    if (fresh) {
      const plan = webPlan(fresh) ?? stored.plan;
      writeStoredPro(deps.kv, { ...stored, key: res.key ?? stored.key, plan, token: res.token, lastSeen: rolledBack ? now : lastSeen });
      return { state: 'pro', claims: fresh, plan };
    }
  } else if (isFinal(res.code)) {
    clearStoredPro(deps.kv);
    return { state: 'free', notice: res.message };
  }
  if (claims) return { state: 'pro', claims, plan: stored.plan };
  if (!res.ok && !isTemporary(res.code)) return { state: 'free', notice: res.message };
  return { state: 'free', unconfirmed: true };
}

/** The web plan a verified token grants (null for an Android-only plan). */
export const webPlan = (c: LicenceClaims): WebPlan | null => (WEB_PLANS.includes(c.plan as WebPlan) ? (c.plan as WebPlan) : null);

export type StoreResult = { ok: true; status: ProStatus & { state: 'pro' } } | { ok: false; message: string };

/**
 * Verify a token from apps/api and, only if it verifies, store it with its key. Used by Restore (/pro) and by checkout.
 * The plan comes from the verified claims, never from the caller.
 */
export async function storeVerifiedToken(key: string, token: string, deps: ResolveDeps): Promise<StoreResult> {
  const claims = await checkToken(token, deps);
  const plan = claims && webPlan(claims);
  if (!claims || !plan) return { ok: false, message: 'The licence check returned an answer we could not verify. Please try again later.' };
  writeStoredPro(deps.kv, { key: normaliseKey(key), plan, token, lastSeen: deps.now ?? nowSeconds() });
  return { ok: true, status: { state: 'pro', claims, plan } };
}

/** /pro "Restore Pro": ask the API, verify the signed answer locally, then store it. */
export async function activatePro(key: string, deps: ResolveDeps): Promise<{ ok: true; status: ProStatus } | { ok: false; message: string }> {
  const k = normaliseKey(key);
  if (!isPlausibleKey(k)) return { ok: false, message: KEY_HINT };
  if (!deps.publicKey && !deps.verifyKey) return { ok: false, message: 'Pro activation is not available on this site yet.' };
  const res = await requestToken(deps.apiBase, k, deps.fetchImpl, true);
  if (!res.ok) return { ok: false, message: res.message };
  return storeVerifiedToken(res.key ?? k, res.token, deps);
}
