// Google service-account OAuth (RS256 JWT bearer grant) using WebCrypto only. Access token cached in memory for its lifetime.
import { fetchWithRetry, unavailable } from './http.ts';

export const ANDROID_PUBLISHER_SCOPE = 'https://www.googleapis.com/auth/androidpublisher';
const DEFAULT_TOKEN_URI = 'https://oauth2.googleapis.com/token';

interface ServiceAccount {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

let memo: { email: string; accessToken: string; expiresAt: number } | null = null;

/** Test hook. */
export const resetGoogleTokenCache = () => {
  memo = null;
};

const b64url = (bytes: Uint8Array | string) => {
  const u8 = typeof bytes === 'string' ? new TextEncoder().encode(bytes) : bytes;
  let bin = '';
  u8.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

function pemToDer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

export function parseServiceAccount(json: string | undefined): ServiceAccount | null {
  if (!json) return null;
  try {
    const sa = JSON.parse(json) as Partial<ServiceAccount>;
    if (typeof sa.client_email !== 'string' || typeof sa.private_key !== 'string') return null;
    return { client_email: sa.client_email, private_key: sa.private_key, token_uri: sa.token_uri };
  } catch {
    return null;
  }
}

export async function googleAccessToken(sa: ServiceAccount, nowMs = Date.now()): Promise<string> {
  if (memo && memo.email === sa.client_email && memo.expiresAt - 60_000 > nowMs) return memo.accessToken;
  const tokenUri = sa.token_uri || DEFAULT_TOKEN_URI;
  const iat = Math.floor(nowMs / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(JSON.stringify({ iss: sa.client_email, scope: ANDROID_PUBLISHER_SCOPE, aud: tokenUri, iat, exp: iat + 3600 }));
  let assertion: string;
  try {
    const signer = await crypto.subtle.importKey('pkcs8', pemToDer(sa.private_key), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
    const sig = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', signer, new TextEncoder().encode(`${header}.${claims}`)));
    assertion = `${header}.${claims}.${b64url(sig)}`;
  } catch {
    throw unavailable();
  }
  let res: Response;
  try {
    res = await fetchWithRetry(tokenUri, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }).toString(),
    });
  } catch {
    throw unavailable();
  }
  if (!res.ok) throw unavailable();
  const out = (await res.json().catch(() => null)) as { access_token?: string; expires_in?: number } | null;
  if (!out?.access_token) throw unavailable();
  memo = { email: sa.client_email, accessToken: out.access_token, expiresAt: nowMs + (out.expires_in ?? 3600) * 1000 };
  return out.access_token;
}
