import type { LicenceClaims, ProPlan } from '@finealth/shared-types';
import { nowSeconds, TOKEN_REFRESH_SECONDS } from '@finealth/finance-core';
import { verifyToken } from './licence';

/**
 * Pro in the Android app, without accounts (CLAUDE.md "How Pro works", same protocol as the web):
 * - Bought in the app with Google Play Billing → the Play purchase token is sent to apps/api /api/v1/play/verify,
 *   which asks Google Play and returns a signed token (≤ 7 days).
 * - Bought on the website → the Razorpay id (pay_… / sub_…) is pasted here and sent to /api/v1/licence/verify.
 * - Pro is granted ONLY by a token whose Ed25519 signature verifies with EXPO_PUBLIC_LICENCE_PUBLIC_KEY, is not expired
 *   and comes from this build's environment. No stored flag, store callback or unsigned value ever grants Pro.
 * - The record is kept in the Android Keystore (expo-secure-store); nothing is stored on our server.
 * This file has no React Native imports so it is unit-tested in Node (__tests__/pro.test.ts).
 */

export type PlaySource = { src: 'play'; kind: 'subscription' | 'product'; productId: string; purchaseToken: string };
export type KeySource = { src: 'razorpay'; key: string };
export type ProSource = PlaySource | KeySource;
export type StoredPro = ProSource & { token: string; lastSeen?: number };

export type ApiErrorCode = 'invalid_key' | 'refunded' | 'expired' | 'too_many_activations' | 'rate_limited' | 'pending' | 'unavailable' | 'network';

export type ProStatus =
  | { state: 'checking' }
  /** `unconfirmed`: a licence is stored but could not be checked (offline / outage): no Pro features, no ads, retry. */
  | { state: 'free'; notice?: string; unconfirmed?: boolean }
  | { state: 'pro'; claims: LicenceClaims; plan: ProPlan; src: ProSource['src'] };

/** Async key-value store (expo-secure-store in the app, a Map in tests). */
export interface AsyncKV {
  getItem(k: string): Promise<string | null>;
  setItem(k: string, v: string): Promise<void>;
  removeItem(k: string): Promise<void>;
}

export interface ProDeps {
  kv: AsyncKV;
  publicKey: string;
  apiBase: string;
  env?: string;
  fetchImpl?: typeof fetch;
  /** Give up on the licence check after this long (React Native's fetch never times out by itself). */
  timeoutMs?: number;
  /** seconds since epoch */
  now?: number;
}

export const PRO_KEY = 'finealth.pro.v1';
const KEY_RE = /^(pay|sub)_[A-Za-z0-9]{8,40}$/;
const TOKEN_RE = /^[A-Za-z0-9._:-]{10,4096}$/;
const PRODUCT_RE = /^[a-z0-9._]{1,150}$/;
/** Clock more than an hour behind the last time seen → do not trust it; refresh online. */
const ROLLBACK_SLACK = 3600;

export const KEY_HINT = 'Paste the payment ID (pay_…) or subscription ID (sub_…) from your Razorpay receipt.';
export const normaliseKey = (k: string) => k.trim().replace(/\s+/g, '');
export const isPlausibleKey = (k: string) => KEY_RE.test(normaliseKey(k));

const MESSAGES: Record<ApiErrorCode, string> = {
  invalid_key: 'That purchase was not recognised. Check the ID, or use Restore purchases for a Google Play purchase.',
  refunded: 'This purchase was refunded, so Pro is no longer active on this phone.',
  expired: 'This subscription has ended. Renew it to keep Pro.',
  too_many_activations: 'This licence key has been activated on too many devices. Contact support to reset it.',
  pending: 'This payment is still processing. Please try again in a few minutes.',
  rate_limited: 'Too many attempts. Please wait a minute and try again.',
  unavailable: 'The licence check is unavailable right now. Please try again shortly.',
  network: 'Could not reach the licence check. Check your connection and try again.',
};
export const apiMessage = (code: ApiErrorCode) => MESSAGES[code];
/** Website-key wording does not fit a Google Play purchase. */
const playMessage = (code: ApiErrorCode) =>
  code === 'invalid_key' ? 'Google Play did not confirm this purchase. Tap Restore purchases, or contact support if you were charged.' : MESSAGES[code];
const UNVERIFIABLE = 'The licence check returned an answer this app could not verify. Please update the app or contact support.';
const isFinal = (code: ApiErrorCode) => code === 'invalid_key' || code === 'refunded' || code === 'expired';
const isTemporary = (code: ApiErrorCode) => code === 'network' || code === 'unavailable' || code === 'rate_limited' || code === 'pending';

export function parseStored(raw: string | null): StoredPro | null {
  try {
    if (!raw) return null;
    const o = JSON.parse(raw) as Record<string, unknown>;
    if (typeof o.token !== 'string' || o.token.length > 2000) return null;
    const lastSeen = Number.isInteger(o.lastSeen) ? (o.lastSeen as number) : undefined;
    if (o.src === 'razorpay' && typeof o.key === 'string' && isPlausibleKey(o.key)) return { src: 'razorpay', key: o.key, token: o.token, lastSeen };
    if (
      o.src === 'play' &&
      (o.kind === 'subscription' || o.kind === 'product') &&
      typeof o.productId === 'string' &&
      PRODUCT_RE.test(o.productId) &&
      typeof o.purchaseToken === 'string' &&
      TOKEN_RE.test(o.purchaseToken)
    )
      return { src: 'play', kind: o.kind, productId: o.productId, purchaseToken: o.purchaseToken, token: o.token, lastSeen };
    return null;
  } catch {
    return null;
  }
}

async function readStored(kv: AsyncKV) {
  try {
    return parseStored(await kv.getItem(PRO_KEY));
  } catch {
    return null;
  }
}
async function writeStored(kv: AsyncKV, p: StoredPro) {
  try {
    await kv.setItem(PRO_KEY, JSON.stringify(p));
  } catch {
    /* keystore unavailable: Pro works until the app closes */
  }
}
/** True when the stored record is still the one with this token (another activation may have replaced it meanwhile). */
async function stillStored(kv: AsyncKV, token: string) {
  return (await readStored(kv))?.token === token;
}

export async function clearStoredPro(kv: AsyncKV) {
  try {
    await kv.removeItem(PRO_KEY);
  } catch {
    /* ignore */
  }
}

export type TokenResult = { ok: true; token: string; key?: string } | { ok: false; code: ApiErrorCode; message: string };

/**
 * Ask apps/api for a signed token. Never throws.
 * `activate` (Razorpay keys only) counts towards the activation limit; a refresh sends the last token as proof instead.
 */
export async function requestToken(deps: ProDeps, source: ProSource, opts: { activate?: boolean; token?: string } = {}): Promise<TokenResult> {
  const f = deps.fetchImpl ?? fetch;
  const url = source.src === 'play' ? `${deps.apiBase}/api/v1/play/verify` : `${deps.apiBase}/api/v1/licence/verify`;
  const body =
    source.src === 'play'
      ? { purchaseToken: source.purchaseToken, productId: source.productId, kind: source.kind }
      : opts.activate
        ? { key: normaliseKey(source.key), activate: true }
        : opts.token
          ? { key: normaliseKey(source.key), token: opts.token }
          : { key: normaliseKey(source.key) };
  let res: Response;
  const ctrl = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    // A hung request (captive portal, dead connection) must not hold up every later Pro action.
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        ctrl.abort();
        reject(new Error('timeout'));
      }, deps.timeoutMs ?? 15_000);
    });
    res = await Promise.race([f(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: ctrl.signal }), timeout]);
  } catch {
    return { ok: false, code: 'network', message: MESSAGES.network };
  } finally {
    clearTimeout(timer);
  }
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON (proxy error page) */
  }
  const b = (json ?? {}) as { token?: unknown; key?: unknown; error?: { code?: unknown } };
  if (res.ok && typeof b.token === 'string') {
    return typeof b.key === 'string' && isPlausibleKey(b.key) ? { ok: true, token: b.token, key: normaliseKey(b.key) } : { ok: true, token: b.token };
  }
  const raw = typeof b.error?.code === 'string' ? b.error.code : '';
  const code: ApiErrorCode = raw in MESSAGES ? (raw as ApiErrorCode) : res.status === 429 ? 'rate_limited' : 'unavailable';
  return { ok: false, code, message: MESSAGES[code] };
}

const check = (token: string, deps: ProDeps, now: number) => verifyToken(token, deps.publicKey, now, deps.env);
const sourceOf = (s: StoredPro): ProSource =>
  s.src === 'play' ? { src: 'play', kind: s.kind, productId: s.productId, purchaseToken: s.purchaseToken } : { src: 'razorpay', key: s.key };

/**
 * App start and every return to the foreground:
 * valid and fresh → Pro; close to expiry → refresh; refunded/invalid/expired → remove, free with a notice;
 * offline/outage → Pro while the old token is still valid, otherwise free + unconfirmed (no Pro, no ads) and retry.
 */
export async function resolvePro(deps: ProDeps): Promise<ProStatus> {
  const stored = await readStored(deps.kv);
  if (!stored) return { state: 'free' };
  const now = deps.now ?? nowSeconds();
  const verified = check(stored.token, deps, now);
  const rolledBack = (stored.lastSeen !== undefined && now < stored.lastSeen - ROLLBACK_SLACK) || (!!verified && now < verified.iat - 300);
  const claims = rolledBack ? null : verified;
  const lastSeen = Math.max(now, stored.lastSeen ?? 0);
  if (!rolledBack && lastSeen !== stored.lastSeen) await writeStored(deps.kv, { ...stored, lastSeen });
  if (claims && claims.exp - now > TOKEN_REFRESH_SECONDS) return { state: 'pro', claims, plan: claims.plan, src: stored.src };

  const res = await requestToken(deps, sourceOf(stored), { token: stored.token });
  if (res.ok) {
    const fresh = check(res.token, deps, now);
    if (fresh) {
      const next: StoredPro = stored.src === 'razorpay' ? { ...stored, key: res.key ?? stored.key, token: res.token, lastSeen: now } : { ...stored, token: res.token, lastSeen: now };
      if (await stillStored(deps.kv, stored.token)) await writeStored(deps.kv, next);
      return { state: 'pro', claims: fresh, plan: fresh.plan, src: stored.src };
    }
    // The server answered but this build cannot verify it (wrong key or environment): retrying will not help.
    if (!claims) return { state: 'free', notice: UNVERIFIABLE };
  } else if (isFinal(res.code)) {
    // Only remove the record that was checked: a purchase stored meanwhile (resubscribe, plan change) stays.
    if (!(await stillStored(deps.kv, stored.token))) return resolvePro(deps);
    await clearStoredPro(deps.kv);
    return { state: 'free', notice: stored.src === 'play' ? playMessage(res.code) : res.message };
  }
  if (claims) return { state: 'pro', claims, plan: claims.plan, src: stored.src };
  if (!res.ok && !isTemporary(res.code)) return { state: 'free', notice: res.message };
  return { state: 'free', unconfirmed: true };
}

export type ActivateResult = { ok: true; status: ProStatus & { state: 'pro' } } | { ok: false; message: string; code?: ApiErrorCode };

/**
 * Activate from a website licence key or a Google Play purchase: ask the API, verify the signed answer on the
 * device, and only then store it. The plan always comes from the verified token.
 */
export async function activate(deps: ProDeps, source: ProSource): Promise<ActivateResult> {
  if (!deps.publicKey) return { ok: false, message: 'Pro activation is not available in this build yet.' };
  let src = source;
  if (src.src === 'razorpay') {
    const k = normaliseKey(src.key);
    if (!isPlausibleKey(k)) return { ok: false, message: KEY_HINT };
    src = { src: 'razorpay', key: k };
  } else if (!TOKEN_RE.test(src.purchaseToken) || !PRODUCT_RE.test(src.productId)) {
    return { ok: false, message: MESSAGES.invalid_key, code: 'invalid_key' };
  }
  const res = await requestToken(deps, src, { activate: src.src === 'razorpay' });
  if (!res.ok) return { ok: false, message: src.src === 'play' ? playMessage(res.code) : res.message, code: res.code };
  const now = deps.now ?? nowSeconds();
  const claims = check(res.token, deps, now);
  if (!claims) return { ok: false, message: UNVERIFIABLE };
  const stored: StoredPro = src.src === 'razorpay' ? { ...src, key: res.key ?? src.key, token: res.token, lastSeen: now } : { ...src, token: res.token, lastSeen: now };
  await writeStored(deps.kv, stored);
  return { ok: true, status: { state: 'pro', claims, plan: claims.plan, src: src.src } };
}
