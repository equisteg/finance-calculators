import type { LicenceClaims, LicenceEnv, ProPlan } from '@finealth/shared-types';
import { b64urlDecode, LICENCE_ENVS, nowSeconds, signLicence, TOKEN_TTL_SECONDS } from '../../../../packages/finance-core/src/licence.ts';
import type { Env } from '../env.ts';
import { HttpError, unavailable } from './http.ts';

interface Keys {
  signer: CryptoKey;
  /** Public half, derived from the private key (JWK `x`): lets the API check tokens it issued (refresh proof). */
  verifier: CryptoKey | null;
}
let memo: { raw: string; keys: Keys } | null = null;

async function loadKeys(env: Env): Promise<Keys | null> {
  const raw = env.LICENCE_SIGNING_KEY?.trim();
  if (!raw) return null;
  if (memo && memo.raw === raw) return memo.keys;
  try {
    const extractable = await crypto.subtle.importKey('pkcs8', b64urlDecode(raw), { name: 'Ed25519' }, true, ['sign']);
    const signer = await crypto.subtle.importKey('pkcs8', b64urlDecode(raw), { name: 'Ed25519' }, false, ['sign']);
    let verifier: CryptoKey | null = null;
    try {
      const jwk = (await crypto.subtle.exportKey('jwk', extractable)) as JsonWebKey;
      if (jwk.x) verifier = await crypto.subtle.importKey('raw', b64urlDecode(jwk.x), { name: 'Ed25519' }, false, ['verify']);
    } catch {
      verifier = null; // refreshes then all count as activations (fail closed for the limit, open for the buyer)
    }
    const keys = { signer, verifier };
    memo = { raw, keys };
    return keys;
  } catch {
    return null;
  }
}

/** Imported signing key, or null when the secret is missing / malformed. Cached per isolate. */
export async function loadSigner(env: Env): Promise<CryptoKey | null> {
  return (await loadKeys(env))?.signer ?? null;
}

/** Public key matching LICENCE_SIGNING_KEY (null when unavailable). */
export async function loadVerifier(env: Env): Promise<CryptoKey | null> {
  return (await loadKeys(env))?.verifier ?? null;
}

/** Throws 503 early so we never call the store when we couldn't issue a token anyway. */
export async function requireSigner(env: Env): Promise<CryptoKey> {
  const signer = await loadSigner(env);
  if (!signer) throw unavailable();
  return signer;
}

/** The `env` claim for this Worker (anything unknown counts as dev). */
export const envName = (env: Env): LicenceEnv => (LICENCE_ENVS.includes(env.ENVIRONMENT as LicenceEnv) ? (env.ENVIRONMENT as LicenceEnv) : 'dev');

export interface IssueOptions {
  storeExpiry?: number;
  /** Razorpay only: licenceKeyHash(key). */
  kh?: string;
  now?: number;
}

/** exp = min(now + TTL, store expiry). Throws 403 expired when the store expiry has passed. */
export async function issueToken(env: Env, signer: CryptoKey, plan: ProPlan, src: LicenceClaims['src'], opts: IssueOptions = {}) {
  const now = opts.now ?? nowSeconds();
  const exp = Math.min(now + TOKEN_TTL_SECONDS, opts.storeExpiry ?? Number.POSITIVE_INFINITY);
  if (exp <= now) throw new HttpError(403, 'expired', 'This subscription has ended. Renew it to keep Pro.');
  const claims: LicenceClaims = { v: 1, plan, src, iat: now, exp, ...(opts.kh ? { kh: opts.kh } : {}), env: envName(env) };
  return signLicence(claims, signer);
}

export { nowSeconds, TOKEN_TTL_SECONDS };
