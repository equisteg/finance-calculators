import type { LicenceClaims, LicenceEnv, ProPlan } from '@finealth/shared-types';

/**
 * Pro token = base64url(JSON claims) + "." + base64url(Ed25519 signature over the first part).
 * Signed by apps/api with the private key (Worker secret LICENCE_SIGNING_KEY, PKCS#8, base64);
 * checked on the device with the public key (NEXT_PUBLIC_LICENCE_PUBLIC_KEY / EXPO_PUBLIC_LICENCE_PUBLIC_KEY, raw 32 bytes, base64url).
 * The claims carry no personal data and nothing is stored on the server: the store (Razorpay / Google Play) is the only record.
 * Uses WebCrypto only, so it runs in Workers, browsers and Node ≥ 20.
 */
export const TOKEN_TTL_SECONDS = 7 * 24 * 3600;
/** Refresh in the background once less than this is left. */
export const TOKEN_REFRESH_SECONDS = 2 * 24 * 3600;
const PLANS: readonly ProPlan[] = ['pro_monthly', 'pro_yearly', 'pro_lifetime'];
export const LICENCE_ENVS: readonly LicenceEnv[] = ['dev', 'staging', 'production'];
/** `kh` claim: 16 bytes, base64url, no padding. */
const KH_RE = /^[A-Za-z0-9_-]{22}$/;

// Created lazily: some React Native engines lack TextDecoder at import time (the app never verifies tokens itself).
const enc = { encode: (s: string) => new TextEncoder().encode(s) };
const dec = { decode: (b: Uint8Array) => new TextDecoder().decode(b) };

export function b64urlEncode(bytes: Uint8Array): string {
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function b64urlDecode(s: string): Uint8Array<ArrayBuffer> {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export const nowSeconds = () => Math.floor(Date.now() / 1000);

/** Shape check for untrusted claims. */
export function isLicenceClaims(c: unknown): c is LicenceClaims {
  const o = c as Record<string, unknown>;
  return (
    !!o &&
    o.v === 1 &&
    PLANS.includes(o.plan as ProPlan) &&
    (o.src === 'razorpay' || o.src === 'play') &&
    Number.isInteger(o.iat) &&
    Number.isInteger(o.exp) &&
    (o.exp as number) > (o.iat as number) &&
    (o.kh === undefined || (typeof o.kh === 'string' && KH_RE.test(o.kh))) &&
    (o.env === undefined || LICENCE_ENVS.includes(o.env as LicenceEnv))
  );
}

/** `kh` claim for a licence key: first 16 bytes of SHA-256(key), base64url. Not reversible into the key. */
export async function licenceKeyHash(key: string): Promise<string> {
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(key)));
  return b64urlEncode(d.slice(0, 16));
}

/**
 * Environment check for clients: a token stamped with another environment is refused. When the client does not know its
 * own environment (`expected` empty) or the token carries none (issued before the claim existed), it is accepted.
 */
export const envMatches = (c: Pick<LicenceClaims, 'env'>, expected: string | undefined | null): boolean =>
  !expected || c.env === undefined || c.env === expected;

export async function importSigningKey(pkcs8Base64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('pkcs8', b64urlDecode(pkcs8Base64.trim()), { name: 'Ed25519' }, false, ['sign']);
}

export async function importVerifyKey(rawBase64url: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', b64urlDecode(rawBase64url.trim()), { name: 'Ed25519' }, false, ['verify']);
}

export async function signLicence(claims: LicenceClaims, key: CryptoKey): Promise<string> {
  const body = b64urlEncode(enc.encode(JSON.stringify(claims)));
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'Ed25519' }, key, enc.encode(body)));
  return `${body}.${b64urlEncode(sig)}`;
}

/**
 * Returns the claims when the signature is valid and the token has not expired; otherwise null. Never throws.
 * `now` is seconds since epoch.
 */
export async function verifyLicence(token: string, key: CryptoKey, now = nowSeconds()): Promise<LicenceClaims | null> {
  const claims = await verifyLicenceSignature(token, key);
  return claims && claims.exp > now ? claims : null;
}

/**
 * Signature and shape only — expiry is NOT checked. For the API's refresh proof (an expired token we signed still
 * proves this browser activated the key). Never use it to grant access.
 */
export async function verifyLicenceSignature(token: string, key: CryptoKey): Promise<LicenceClaims | null> {
  try {
    if (typeof token !== 'string') return null;
    const [body, sig, extra] = token.split('.');
    if (!body || !sig || extra !== undefined || token.length > 2000) return null;
    const ok = await crypto.subtle.verify({ name: 'Ed25519' }, key, b64urlDecode(sig), enc.encode(body));
    if (!ok) return null;
    const claims: unknown = JSON.parse(dec.decode(b64urlDecode(body)));
    return isLicenceClaims(claims) ? claims : null;
  } catch {
    return null;
  }
}

/** Read claims WITHOUT checking the signature — only for showing "expires on" in the UI. Never use it to grant access. */
export function peekLicence(token: string): LicenceClaims | null {
  try {
    const c: unknown = JSON.parse(dec.decode(b64urlDecode(token.split('.')[0] ?? '')));
    return isLicenceClaims(c) ? c : null;
  } catch {
    return null;
  }
}
