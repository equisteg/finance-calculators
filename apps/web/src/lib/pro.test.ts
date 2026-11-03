// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { LicenceClaims } from '@finealth/shared-types';
import { b64urlEncode, signLicence, TOKEN_TTL_SECONDS } from '@finealth/finance-core';
import { activatePro, isPlausibleKey, PRO_KEY, readStoredPro, requestToken, resolvePro, type KV } from './pro';

const NOW = 1_800_000_000;

function memory(init: Record<string, string> = {}): KV & { data: Record<string, string> } {
  const data = { ...init };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => void (data[k] = v),
    removeItem: (k) => void delete data[k],
  };
}

async function keys() {
  const pair = (await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify'])) as CryptoKeyPair;
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey));
  return { sign: pair.privateKey, verify: pair.publicKey, publicB64: b64urlEncode(raw) };
}

const claims = (over: Partial<LicenceClaims> = {}): LicenceClaims => ({ v: 1, plan: 'pro_yearly', src: 'razorpay', iat: NOW - 10, exp: NOW + TOKEN_TTL_SECONDS, ...over });

const json = (status: number, body: unknown) => async () => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const offline = async () => {
  throw new TypeError('Failed to fetch');
};
const stored = (token: string) => JSON.stringify({ key: 'pay_ABCD1234EF567890', plan: 'pro_yearly', token });

describe('pro state', () => {
  it('is free with nothing stored', async () => {
    const k = await keys();
    expect(await resolvePro({ kv: memory(), publicKey: k.publicB64, apiBase: '', now: NOW })).toEqual({ state: 'free' });
  });

  it('never grants Pro from a flag or an unsigned/forged token', async () => {
    const k = await keys();
    const other = await keys();
    const forged = await signLicence(claims(), other.sign);
    const unsigned = `${b64urlEncode(new TextEncoder().encode(JSON.stringify(claims())))}.AAAA`;
    for (const value of [JSON.stringify({ pro: true }), 'true', stored(forged), stored(unsigned), stored('')]) {
      const kv = memory({ [PRO_KEY]: value, 'finealth.isPro': 'true' });
      const st = await resolvePro({ kv, publicKey: k.publicB64, apiBase: '', now: NOW, fetchImpl: offline });
      expect(st.state).toBe('free');
    }
  });

  it('corrupted storage → free, no crash', async () => {
    const k = await keys();
    for (const v of ['{not json', 'null', '[]', '{"key":1}', 'x'.repeat(5000)]) {
      expect(readStoredPro(memory({ [PRO_KEY]: v }))).toBeNull();
      expect((await resolvePro({ kv: memory({ [PRO_KEY]: v }), publicKey: k.publicB64, apiBase: '', now: NOW })).state).toBe('free');
    }
    const throwing: KV = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); }, removeItem: () => undefined };
    expect((await resolvePro({ kv: throwing, publicKey: k.publicB64, apiBase: '', now: NOW })).state).toBe('free');
  });

  it('is free when no public key is configured, even with a stored token', async () => {
    const k = await keys();
    const token = await signLicence(claims(), k.sign);
    const st = await resolvePro({ kv: memory({ [PRO_KEY]: stored(token) }), publicKey: '', apiBase: '', now: NOW, fetchImpl: offline });
    expect(st.state).toBe('free');
  });

  it('valid fresh token → Pro without calling the API', async () => {
    const k = await keys();
    const token = await signLicence(claims(), k.sign);
    let called = false;
    const st = await resolvePro({
      kv: memory({ [PRO_KEY]: stored(token) }), publicKey: k.publicB64, apiBase: '', now: NOW,
      fetchImpl: async () => { called = true; return new Response('{}'); },
    });
    expect(st.state).toBe('pro');
    expect(called).toBe(false);
  });

  it('refreshes a token that is about to expire', async () => {
    const k = await keys();
    const old = await signLicence(claims({ exp: NOW + 3600 }), k.sign);
    const fresh = await signLicence(claims(), k.sign);
    const kv = memory({ [PRO_KEY]: stored(old) });
    const st = await resolvePro({ kv, publicKey: k.publicB64, apiBase: '', now: NOW, fetchImpl: json(200, { token: fresh }) });
    expect(st.state).toBe('pro');
    expect(readStoredPro(kv)?.token).toBe(fresh);
  });

  it('keeps Pro while the old token is valid and the network is down; free once it has expired', async () => {
    const k = await keys();
    const soon = await signLicence(claims({ exp: NOW + 3600 }), k.sign);
    expect((await resolvePro({ kv: memory({ [PRO_KEY]: stored(soon) }), publicKey: k.publicB64, apiBase: '', now: NOW, fetchImpl: offline })).state).toBe('pro');
    const expired = await signLicence(claims({ iat: NOW - 100, exp: NOW - 1 }), k.sign);
    const kv = memory({ [PRO_KEY]: stored(expired) });
    expect((await resolvePro({ kv, publicKey: k.publicB64, apiBase: '', now: NOW, fetchImpl: offline })).state).toBe('free');
    expect(readStoredPro(kv)).not.toBeNull(); // kept: a later refresh may succeed
  });

  it('removes the licence and shows a notice when the API says refunded', async () => {
    const k = await keys();
    const expired = await signLicence(claims({ iat: NOW - 100, exp: NOW - 1 }), k.sign);
    const kv = memory({ [PRO_KEY]: stored(expired) });
    const st = await resolvePro({ kv, publicKey: k.publicB64, apiBase: '', now: NOW, fetchImpl: json(403, { error: { code: 'refunded', message: 'x' } }) });
    expect(st).toMatchObject({ state: 'free', notice: expect.stringMatching(/refunded/) });
    expect(kv.data[PRO_KEY]).toBeUndefined();
  });

  it('does not trust a refreshed token that fails verification', async () => {
    const k = await keys();
    const other = await keys();
    const expired = await signLicence(claims({ iat: NOW - 100, exp: NOW - 1 }), k.sign);
    const bad = await signLicence(claims(), other.sign);
    const st = await resolvePro({ kv: memory({ [PRO_KEY]: stored(expired) }), publicKey: k.publicB64, apiBase: '', now: NOW, fetchImpl: json(200, { token: bad }) });
    expect(st.state).toBe('free');
  });
});

describe('audit fixes (PAY-2, PAY-3, PAY-4)', () => {
  it('a store outage (503) during refresh keeps the licence', async () => {
    const k = await keys();
    const expired = await signLicence(claims({ iat: NOW - 100, exp: NOW - 1 }), k.sign);
    const kv = memory({ [PRO_KEY]: stored(expired) });
    const st = await resolvePro({ kv, publicKey: k.publicB64, apiBase: '', now: NOW, fetchImpl: json(503, { error: { code: 'unavailable', message: 'x' } }) });
    expect(st).toEqual({ state: 'free', unconfirmed: true });
    expect(readStoredPro(kv)).toMatchObject({ key: 'pay_ABCD1234EF567890' });
  });

  it('PAY-8: stored licence + temporary refresh failure → unconfirmed (no Pro, no ads); final or limit answers are not', async () => {
    const k = await keys();
    const expired = await signLicence(claims({ iat: NOW - 100, exp: NOW - 1 }), k.sign);
    for (const f of [offline, json(503, { error: { code: 'unavailable' } }), json(429, {}), json(409, { error: { code: 'pending' } })]) {
      const st = await resolvePro({ kv: memory({ [PRO_KEY]: stored(expired) }), publicKey: k.publicB64, apiBase: '', now: NOW, fetchImpl: f });
      expect(st).toEqual({ state: 'free', unconfirmed: true });
    }
    const limit = await resolvePro({ kv: memory({ [PRO_KEY]: stored(expired) }), publicKey: k.publicB64, apiBase: '', now: NOW, fetchImpl: json(403, { error: { code: 'too_many_activations' } }) });
    expect(limit).toMatchObject({ state: 'free', notice: expect.stringMatching(/too many browsers/) });
    expect(limit).not.toHaveProperty('unconfirmed');
    // nothing stored → plain free
    expect(await resolvePro({ kv: memory(), publicKey: k.publicB64, apiBase: '', now: NOW, fetchImpl: offline })).toEqual({ state: 'free' });
  });

  it('PAY-10: a token stamped with another environment never grants Pro; env-less tokens and unset site env are accepted', async () => {
    const k = await keys();
    const staging = await signLicence(claims({ env: 'staging' }), k.sign);
    const prod = await signLicence(claims({ env: 'production' }), k.sign);
    const legacy = await signLicence(claims(), k.sign);
    const base = { publicKey: k.publicB64, apiBase: '', now: NOW, fetchImpl: offline };
    expect((await resolvePro({ ...base, env: 'production', kv: memory({ [PRO_KEY]: stored(staging) }) })).state).toBe('free');
    expect((await resolvePro({ ...base, env: 'production', kv: memory({ [PRO_KEY]: stored(prod) }) })).state).toBe('pro');
    expect((await resolvePro({ ...base, env: 'production', kv: memory({ [PRO_KEY]: stored(legacy) }) })).state).toBe('pro');
    expect((await resolvePro({ ...base, kv: memory({ [PRO_KEY]: stored(staging) }) })).state).toBe('pro');
    const r = await activatePro('pay_ABCD1234EF567890', { ...base, env: 'production', kv: memory(), fetchImpl: json(200, { token: staging }) });
    expect(r.ok).toBe(false);
  });

  it('PAY-5: when the API answers with a canonical key (renewal pay_ → sub_), that key is stored', async () => {
    const k = await keys();
    const token = await signLicence(claims(), k.sign);
    const kv = memory();
    await activatePro('pay_Renewal1234567', { kv, publicKey: k.publicB64, apiBase: '', now: NOW, fetchImpl: json(200, { token, key: 'sub_Yearly12345ABC' }) });
    expect(readStoredPro(kv)).toMatchObject({ key: 'sub_Yearly12345ABC' });
    const old = await signLicence(claims({ exp: NOW + 60 }), k.sign);
    const kv2 = memory({ [PRO_KEY]: stored(old) });
    await resolvePro({ kv: kv2, publicKey: k.publicB64, apiBase: '', now: NOW, fetchImpl: json(200, { token, key: 'sub_Yearly12345ABC' }) });
    expect(readStoredPro(kv2)).toMatchObject({ key: 'sub_Yearly12345ABC', token });
  });

  it('a clock set back does not keep an old token alive offline', async () => {
    const k = await keys();
    const token = await signLicence(claims({ iat: NOW - 10, exp: NOW + 3 * 86400 }), k.sign);
    const kv = memory({ [PRO_KEY]: JSON.stringify({ key: 'pay_ABCD1234EF567890', plan: 'pro_yearly', token, lastSeen: NOW + 6 * 86400 }) });
    expect((await resolvePro({ kv, publicKey: k.publicB64, apiBase: '', now: NOW, fetchImpl: offline })).state).toBe('free');
    // a clock set to before the token was issued
    const kv2 = memory({ [PRO_KEY]: stored(token) });
    expect((await resolvePro({ kv: kv2, publicKey: k.publicB64, apiBase: '', now: NOW - 3600, fetchImpl: offline })).state).toBe('free');
  });

  it('records the highest time seen', async () => {
    const k = await keys();
    const token = await signLicence(claims(), k.sign);
    const kv = memory({ [PRO_KEY]: stored(token) });
    await resolvePro({ kv, publicKey: k.publicB64, apiBase: '', now: NOW });
    expect(readStoredPro(kv)).toMatchObject({ lastSeen: NOW });
  });

  it('only the Restore button sends activate:true; a refresh sends the stored token as proof (PAY-1)', async () => {
    const k = await keys();
    const token = await signLicence(claims(), k.sign);
    const bodies: unknown[] = [];
    const spy = async (_u: RequestInfo | URL, init?: RequestInit) => {
      bodies.push(JSON.parse(String(init?.body)));
      return new Response(JSON.stringify({ token }), { status: 200 });
    };
    await activatePro('pay_ABCD1234EF567890', { kv: memory(), publicKey: k.publicB64, apiBase: '', now: NOW, fetchImpl: spy as typeof fetch });
    const old = await signLicence(claims({ exp: NOW + 60 }), k.sign);
    await resolvePro({ kv: memory({ [PRO_KEY]: stored(old) }), publicKey: k.publicB64, apiBase: '', now: NOW, fetchImpl: spy as typeof fetch });
    expect(bodies).toEqual([
      { key: 'pay_ABCD1234EF567890', activate: true },
      { key: 'pay_ABCD1234EF567890', token: old },
    ]);
  });

  it('explains the activation limit', async () => {
    const k = await keys();
    const r = await activatePro('pay_ABCD1234EF567890', { kv: memory(), publicKey: k.publicB64, apiBase: '', now: NOW, fetchImpl: json(403, { error: { code: 'too_many_activations', message: 'x' } }) });
    expect(r).toMatchObject({ ok: false, message: expect.stringMatching(/too many browsers/) });
  });
});

describe('activatePro', () => {
  it('stores the key only after the signed token verifies', async () => {
    const k = await keys();
    const token = await signLicence(claims(), k.sign);
    const kv = memory();
    const r = await activatePro(' pay_ABCD1234EF567890 ', { kv, publicKey: k.publicB64, apiBase: '', now: NOW, fetchImpl: json(200, { token }) });
    expect(r.ok).toBe(true);
    expect(readStoredPro(kv)).toEqual({ key: 'pay_ABCD1234EF567890', plan: 'pro_yearly', token, lastSeen: NOW });
  });

  it('reports API errors and stores nothing', async () => {
    const k = await keys();
    const kv = memory();
    const r = await activatePro('pay_ABCD1234EF567890', { kv, publicKey: k.publicB64, apiBase: '', now: NOW, fetchImpl: json(404, { error: { code: 'invalid_key', message: 'no' } }) });
    expect(r).toMatchObject({ ok: false, message: expect.stringMatching(/not recognised/) });
    expect(kv.data[PRO_KEY]).toBeUndefined();
  });

  it('rejects malformed keys before calling the API', async () => {
    const k = await keys();
    const r = await activatePro('<script>', { kv: memory(), publicKey: k.publicB64, apiBase: '', fetchImpl: offline });
    expect(r.ok).toBe(false);
  });
});

describe('requestToken', () => {
  it('maps status codes and network failures', async () => {
    expect(await requestToken('', 'pay_ABCD1234', offline)).toMatchObject({ ok: false, code: 'network' });
    expect(await requestToken('', 'pay_ABCD1234', json(429, {}))).toMatchObject({ ok: false, code: 'rate_limited' });
    expect(await requestToken('', 'pay_ABCD1234', async () => new Response('<html>', { status: 502 }))).toMatchObject({ ok: false, code: 'unavailable' });
  });
});

describe('Razorpay licence ids', () => {
  it('accepts pay_/sub_ ids only', () => {
    for (const k of ['pay_ABCD1234EF5678', 'sub_Q1w2E3r4T5y6U7', ' pay_ABCD1234 ']) expect(isPlausibleKey(k), k).toBe(true);
    for (const k of ['ABCD1234-EF56-7890-ABCD', 'order_ABCD1234EF5678', 'pay_short', 'pay_ABCD-1234-EF56', 'sub_' + 'A'.repeat(41)]) expect(isPlausibleKey(k), k).toBe(false);
  });

  it('migration: an old Gumroad record is treated as no licence, without calling the API', async () => {
    const k = await keys();
    const token = await signLicence(claims(), k.sign);
    const old = JSON.stringify({ key: 'ABCD1234-EF567890-ABCD1234-EF567890', plan: 'pro_yearly', token });
    let called = false;
    const kv = memory({ [PRO_KEY]: old });
    expect(readStoredPro(kv)).toBeNull();
    const st = await resolvePro({ kv, publicKey: k.publicB64, apiBase: '', now: NOW, fetchImpl: async () => { called = true; return new Response('{}'); } });
    expect(st).toEqual({ state: 'free' });
    expect(called).toBe(false);
  });

  it('takes the plan from the verified token, not from the caller', async () => {
    const k = await keys();
    const token = await signLicence(claims({ plan: 'pro_lifetime' }), k.sign);
    const kv = memory();
    const r = await activatePro('pay_ABCD1234EF567890', { kv, publicKey: k.publicB64, apiBase: '', now: NOW, fetchImpl: json(200, { token }) });
    expect(r).toMatchObject({ ok: true, status: { state: 'pro', plan: 'pro_lifetime' } });
    expect(readStoredPro(kv)?.plan).toBe('pro_lifetime');
  });

  it('a pending payment keeps nothing and says so', async () => {
    const k = await keys();
    const kv = memory();
    const r = await activatePro('pay_ABCD1234EF567890', { kv, publicKey: k.publicB64, apiBase: '', now: NOW, fetchImpl: json(409, { error: { code: 'pending', message: 'x' } }) });
    expect(r).toMatchObject({ ok: false, message: expect.stringMatching(/processing/) });
    expect(kv.data[PRO_KEY]).toBeUndefined();
  });
});
