import { describe, expect, it } from 'vitest';
import type { LicenceClaims } from '@finealth/shared-types';
import { activate, parseStored, PRO_KEY, resolvePro } from '../src/lib/pro';
import { fakeFetch, memoryKV, testKeys } from './helpers';

const NOW = 1_800_000_000;
const DAY = 86_400;
const base = (over: Partial<LicenceClaims> = {}): LicenceClaims => ({ v: 1, plan: 'pro_yearly', src: 'play', iat: NOW, exp: NOW + 7 * DAY, env: 'staging', ...over });
const PLAY = { src: 'play' as const, kind: 'subscription' as const, productId: 'pro', purchaseToken: 'tok_abcdefghijkl' };

async function setup(reply: Parameters<typeof fakeFetch>[0]) {
  const k = await testKeys();
  const kv = memoryKV();
  const { f, calls } = fakeFetch(reply);
  return { k, kv, calls, deps: { kv, publicKey: k.publicKey, apiBase: 'https://api.test', env: 'staging', fetchImpl: f, now: NOW } };
}

describe('Pro activation (TC-M-PRO-002..005)', () => {
  it('Play purchase: sends the token to /play/verify and stores only a verified answer', async () => {
    let token = '';
    const s = await setup(() => ({ status: 200, json: { token } }));
    token = await s.k.sign(base({ plan: 'pro_monthly', env: 'staging' }));
    const r = await activate(s.deps, PLAY);
    expect(r.ok).toBe(true);
    expect(s.calls[0].url).toBe('https://api.test/api/v1/play/verify');
    expect(s.calls[0].body).toEqual({ purchaseToken: PLAY.purchaseToken, productId: 'pro', kind: 'subscription' });
    expect(r.ok && r.status.plan).toBe('pro_monthly');
    expect(parseStored(s.kv.data.get(PRO_KEY) ?? null)?.src).toBe('play');
  });

  it('website key: activates with activate=true; the plan comes from the token, not the caller', async () => {
    let token = '';
    const s = await setup(() => ({ status: 200, json: { token } }));
    token = await s.k.sign(base({ plan: 'pro_lifetime', src: 'razorpay' }));
    const r = await activate(s.deps, { src: 'razorpay', key: ' pay_ABCdef123456 ' });
    expect(s.calls[0].url).toBe('https://api.test/api/v1/licence/verify');
    expect(s.calls[0].body).toEqual({ key: 'pay_ABCdef123456', activate: true });
    expect(r.ok && r.status.plan).toBe('pro_lifetime');
  });

  it('refuses an unsigned or forged answer and stores nothing', async () => {
    const s = await setup(() => ({ status: 200, json: { token: 'eyJ2IjoxfQ.AAAA' } }));
    const r = await activate(s.deps, PLAY);
    expect(r.ok).toBe(false);
    expect(s.kv.data.size).toBe(0);
  });

  it('shows the server reason for a refunded purchase', async () => {
    const s = await setup(() => ({ status: 403, json: { error: { code: 'refunded' } } }));
    const r = await activate(s.deps, PLAY);
    expect(r).toMatchObject({ ok: false, code: 'refunded' });
  });

  it('gives up on a licence check that never answers, so later Pro actions are not stuck', async () => {
    const s = await setup(() => ({ status: 200, json: {} }));
    const hang = (() => new Promise<Response>(() => undefined)) as unknown as typeof fetch;
    const r = await activate({ ...s.deps, fetchImpl: hang, timeoutMs: 20 }, PLAY);
    expect(r).toMatchObject({ ok: false, code: 'network' });
  });

  it('rejects a key that is not a Razorpay id without calling the API', async () => {
    const s = await setup(() => ({ status: 200, json: {} }));
    expect((await activate(s.deps, { src: 'razorpay', key: 'hello' })).ok).toBe(false);
    expect(s.calls).toHaveLength(0);
  });

  it('is unavailable when the build has no public key', async () => {
    const s = await setup(() => ({ status: 200, json: {} }));
    expect((await activate({ ...s.deps, publicKey: '' }, PLAY)).ok).toBe(false);
  });
});

describe('Pro on app start (TC-M-PRO-006..009)', () => {
  it('fresh token → Pro without a network call', async () => {
    const s = await setup(() => ({ status: 500, json: {} }));
    s.kv.data.set(PRO_KEY, JSON.stringify({ ...PLAY, token: await s.k.sign(base()) }));
    expect((await resolvePro(s.deps)).state).toBe('pro');
    expect(s.calls).toHaveLength(0);
  });

  it('close to expiry → refreshes with the old token as proof', async () => {
    let fresh = '';
    const s = await setup(() => ({ status: 200, json: { token: fresh } }));
    s.kv.data.set(PRO_KEY, JSON.stringify({ src: 'razorpay', key: 'sub_ABCdef123456', token: await s.k.sign(base({ src: 'razorpay', exp: NOW + DAY })) }));
    fresh = await s.k.sign(base({ src: 'razorpay' }));
    const st = await resolvePro(s.deps);
    expect(st.state).toBe('pro');
    expect(s.calls[0].body.token).toBeTruthy();
    expect(s.calls[0].body.activate).toBeUndefined();
  });

  it('refund found at refresh → Pro removed with a notice', async () => {
    const s = await setup(() => ({ status: 403, json: { error: { code: 'refunded' } } }));
    s.kv.data.set(PRO_KEY, JSON.stringify({ ...PLAY, token: await s.k.sign(base({ exp: NOW + DAY })) }));
    const st = await resolvePro(s.deps);
    expect(st).toMatchObject({ state: 'free' });
    expect(st.state === 'free' && st.notice).toMatch(/refunded/);
    expect(s.kv.data.has(PRO_KEY)).toBe(false);
  });

  it('an expired answer for an old record never deletes a purchase stored meanwhile', async () => {
    const s = await setup(() => ({ status: 403, json: { error: { code: 'expired' } } }));
    const oldToken = await s.k.sign(base({ exp: NOW + DAY }));
    const newRecord = JSON.stringify({ ...PLAY, purchaseToken: 'tok_new_purchase_1', token: await s.k.sign(base({ exp: NOW + 7 * DAY })) });
    s.kv.data.set(PRO_KEY, JSON.stringify({ ...PLAY, token: oldToken }));
    // The new purchase lands while the refresh of the old one is on the network.
    const realFetch = s.deps.fetchImpl;
    s.deps.fetchImpl = (async (...a: Parameters<typeof fetch>) => {
      s.kv.data.set(PRO_KEY, newRecord);
      return realFetch(...a);
    }) as typeof fetch;
    const st = await resolvePro(s.deps);
    expect(st.state).toBe('pro');
    expect(parseStored(s.kv.data.get(PRO_KEY) ?? null)).toMatchObject({ purchaseToken: 'tok_new_purchase_1' });
  });

  it('an answer this build cannot verify stops retrying and says why', async () => {
    const s = await setup(() => ({ status: 200, json: { token: 'eyJ2IjoxfQ.AAAA' } }));
    s.kv.data.set(PRO_KEY, JSON.stringify({ ...PLAY, token: await s.k.sign(base({ exp: NOW - 1 })) }));
    const st = await resolvePro(s.deps);
    expect(st).toMatchObject({ state: 'free' });
    expect(st.state === 'free' && st.unconfirmed).toBeFalsy();
    expect(st.state === 'free' && st.notice).toMatch(/could not verify/);
  });

  it('offline: keeps Pro while the token is valid; once expired → free, unconfirmed (no ads)', async () => {
    const s = await setup(() => {
      throw new Error('offline');
    });
    s.kv.data.set(PRO_KEY, JSON.stringify({ ...PLAY, token: await s.k.sign(base({ exp: NOW + DAY })) }));
    expect((await resolvePro(s.deps)).state).toBe('pro');
    s.kv.data.set(PRO_KEY, JSON.stringify({ ...PLAY, token: await s.k.sign(base({ iat: NOW - 8 * DAY, exp: NOW - DAY })) }));
    expect(await resolvePro(s.deps)).toEqual({ state: 'free', unconfirmed: true });
  });

  it('a clock set back cannot keep an old token alive', async () => {
    const s = await setup(() => {
      throw new Error('offline');
    });
    s.kv.data.set(PRO_KEY, JSON.stringify({ ...PLAY, token: await s.k.sign(base()), lastSeen: NOW + 30 * DAY }));
    expect((await resolvePro(s.deps)).state).toBe('free');
  });

  it('ignores a tampered stored record', async () => {
    const s = await setup(() => ({ status: 200, json: {} }));
    s.kv.data.set(PRO_KEY, JSON.stringify({ src: 'play', kind: 'x', productId: 'pro', purchaseToken: 't', token: 'x' }));
    expect(await resolvePro(s.deps)).toEqual({ state: 'free' });
  });
});
