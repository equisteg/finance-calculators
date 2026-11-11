import { ed25519 } from '@noble/curves/ed25519.js';
import type { LicenceClaims } from '@finealth/shared-types';
import { b64urlDecode, isLicenceClaims } from '@finealth/finance-core';

/**
 * On-device check of a Pro token from apps/api (format in packages/finance-core/src/licence.ts).
 * Hermes has no WebCrypto Ed25519, so the signature is checked with @noble/curves (audited, MIT, pure JS).
 * Pro is granted ONLY when this returns claims: valid signature, not expired, same environment.
 */

/** UTF-8 bytes → string without TextDecoder (not available in every Hermes build). */
export function utf8Decode(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; ) {
    const b = bytes[i++];
    if (b < 0x80) out += String.fromCharCode(b);
    else if (b < 0xe0) out += String.fromCharCode(((b & 0x1f) << 6) | (bytes[i++] & 0x3f));
    else if (b < 0xf0) out += String.fromCharCode(((b & 0x0f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f));
    else {
      const cp = ((b & 0x07) << 18) | ((bytes[i++] & 0x3f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f);
      out += String.fromCodePoint(cp);
    }
  }
  return out;
}

const ascii = (s: string) => {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff;
  return out;
};

/** Signature + shape only (expiry not checked). Never throws. */
export function verifySignature(token: string, publicKey: string): LicenceClaims | null {
  try {
    if (typeof token !== 'string' || token.length > 2000 || !publicKey) return null;
    const [body, sig, extra] = token.split('.');
    if (!body || !sig || extra !== undefined || !/^[A-Za-z0-9_-]+$/.test(body)) return null;
    const pub = b64urlDecode(publicKey.trim());
    const signature = b64urlDecode(sig);
    if (pub.length !== 32 || signature.length !== 64) return null;
    // The signed message is the base64url text of the claims (ASCII), exactly as apps/api signs it.
    if (!ed25519.verify(signature, ascii(body), pub)) return null;
    const claims: unknown = JSON.parse(utf8Decode(b64urlDecode(body)));
    return isLicenceClaims(claims) ? claims : null;
  } catch {
    return null;
  }
}

/** Claims when the token is valid now and was issued by this build's environment; otherwise null. */
export function verifyToken(token: string, publicKey: string, now: number, env?: string): LicenceClaims | null {
  const c = verifySignature(token, publicKey);
  // Stricter than the web: every token the API signs carries env, so a token without it is refused when env is set.
  return c && c.exp > now && (env ? c.env === env : true) ? c : null;
}
