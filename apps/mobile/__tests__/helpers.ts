import type { LicenceClaims } from '@finealth/shared-types';
import { b64urlEncode, importSigningKey, signLicence } from '@finealth/finance-core';
import type { AsyncKV } from '../src/lib/pro';

/** A key pair like `npm run licence:keys` makes: tokens are signed with WebCrypto exactly as apps/api does. */
export async function testKeys() {
  const kp = (await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify'])) as CryptoKeyPair;
  const pkcs8 = b64urlEncode(new Uint8Array(await crypto.subtle.exportKey('pkcs8', kp.privateKey)));
  const publicKey = b64urlEncode(new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey)));
  const signer = await importSigningKey(pkcs8);
  return { publicKey, sign: (c: LicenceClaims) => signLicence(c, signer) };
}

export function memoryKV(): AsyncKV & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: async (k) => data.get(k) ?? null,
    setItem: async (k, v) => void data.set(k, v),
    removeItem: async (k) => void data.delete(k),
  };
}

/** fetch stub: records calls and answers with `reply(url, body)`. */
export function fakeFetch(reply: (url: string, body: Record<string, unknown>) => { status: number; json: unknown }) {
  const calls: { url: string; body: Record<string, unknown> }[] = [];
  const f = (async (url: string, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
    calls.push({ url, body });
    const r = reply(url, body);
    return new Response(JSON.stringify(r.json), { status: r.status, headers: { 'content-type': 'application/json' } });
  }) as unknown as typeof fetch;
  return { f, calls };
}
