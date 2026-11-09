import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LicenceClaims } from '@finealth/shared-types';
import {
  b64urlEncode,
  importSigningKey,
  importVerifyKey,
  licenceKeyHash,
  signLicence,
  TOKEN_TTL_SECONDS,
  verifyLicence,
} from '../../../packages/finance-core/src/licence.ts';
import type { Env } from '../src/env.ts';
import app from '../src/index.ts';
import { resetGoogleTokenCache } from '../src/lib/google.ts';
import { scrub } from '../src/lib/scrub.ts';
import { CHECKOUT_PAUSED_MESSAGE, INTERNATIONAL_DISABLED_MESSAGE, INVALID_PAYMENT_MESSAGE } from '../src/routes/checkout.ts';
import { INVALID_KEY_MESSAGE, REFUNDED_MESSAGE, TOO_MANY_ACTIVATIONS_MESSAGE } from '../src/routes/licence.ts';

const BASE = 'https://finealth.test';
const RZ = 'https://api.razorpay.com/v1';
// Built from parts so the secret scanner does not mistake these throwaway test values for real ones.
const KEY_ID = ['rzp', 'test', 'AbCdEf123456'].join('_');
const LIVE_KEY_ID = ['rzp', 'live', 'AbCdEf123456'].join('_');
const KEY_SECRET = ['unit', 'test', 'only', 'not', 'a', 'real', 'value'].join('-');
const PLAN_INR = 'plan_YearlyINR00001';
const PLAN_USD = 'plan_YearlyUSD00001';
const PAY = 'pay_LifeTime12345A';
const ORDER = 'order_Ord12345678AB';
const SUB = 'sub_Yearly12345ABC';
const FIRST_PAY = 'pay_SubFirst12345A';
const DAY = 24 * 3600;
let signingKeyB64 = '';
let verifier: CryptoKey;
let saJson = '';
let ipSeq = 0;

beforeAll(async () => {
  const kp = (await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify'])) as CryptoKeyPair;
  signingKeyB64 = b64urlEncode(new Uint8Array((await crypto.subtle.exportKey('pkcs8', kp.privateKey)) as ArrayBuffer));
  const raw = b64urlEncode(new Uint8Array((await crypto.subtle.exportKey('raw', kp.publicKey)) as ArrayBuffer));
  verifier = await importVerifyKey(raw);
  const rsa = (await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['sign', 'verify'],
  )) as CryptoKeyPair;
  const der = new Uint8Array((await crypto.subtle.exportKey('pkcs8', rsa.privateKey)) as ArrayBuffer);
  let bin = '';
  der.forEach((b) => (bin += String.fromCharCode(b)));
  const tag = ['PRIVATE', 'KEY'].join(' ');
  const pem = `-----BEGIN ${tag}-----\n${btoa(bin).replace(/(.{64})/g, '$1\n')}\n-----END ${tag}-----\n`;
  saJson = JSON.stringify({ type: 'service_account', client_email: 'sa@test.iam.gserviceaccount.com', private_key: pem, token_uri: 'https://oauth2.googleapis.com/token' });
});

const env = (over: Partial<Env> = {}): Env => ({
  ENVIRONMENT: 'dev',
  RAZORPAY_KEY_ID: KEY_ID,
  RAZORPAY_KEY_SECRET: KEY_SECRET,
  RAZORPAY_PLAN_ID_YEARLY_INR: PLAN_INR,
  RAZORPAY_PLAN_ID_YEARLY_USD: PLAN_USD,
  PLAY_PACKAGE_NAME: 'com.tezech.finealth',
  PLAY_SUBSCRIPTION_ID: 'pro',
  PLAY_LIFETIME_PRODUCT_ID: 'pro_lifetime',
  LICENCE_SIGNING_KEY: signingKeyB64,
  GOOGLE_PLAY_SA_KEY: saJson,
  ...over,
});

function post(path: string, body: unknown, opts: { env?: Env; headers?: Record<string, string>; ip?: string } = {}) {
  return app.request(
    `${BASE}${path}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'cf-connecting-ip': opts.ip ?? `10.0.${Math.floor(++ipSeq / 250)}.${ipSeq % 250}`, ...opts.headers },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    },
    opts.env ?? env(),
  );
}

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
let fetchMock: ReturnType<typeof vi.fn>;
let logs: string[];

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  logs = [];
  vi.spyOn(console, 'log').mockImplementation((s: unknown) => void logs.push(String(s)));
  resetGoogleTokenCache();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const now = () => Math.floor(Date.now() / 1000);
const errOf = async (r: Response) => ((await r.json()) as { error: { code: string; message: string } }).error;
const NOT_FOUND = () => json({ error: { code: 'BAD_REQUEST_ERROR', description: 'The ID provided is invalid or could not be found.' } }, 400);

const payment = (over: Record<string, unknown> = {}) => ({
  id: PAY,
  entity: 'payment',
  status: 'captured',
  amount: 49900,
  currency: 'INR',
  order_id: ORDER,
  amount_refunded: 0,
  refund_status: null,
  captured: true,
  notes: { product: 'finealth', plan: 'pro_lifetime' },
  ...over,
});
const order = (over: Record<string, unknown> = {}) => ({
  id: ORDER,
  entity: 'order',
  status: 'paid',
  amount: 49900,
  currency: 'INR',
  notes: { product: 'finealth', plan: 'pro_lifetime' },
  ...over,
});
/** Razorpay routes for a lifetime payment and its own order. */
const life = (p: Record<string, unknown> = {}, o: Record<string, unknown> = {}) => ({ [`GET /payments/${PAY}`]: payment(p), [`GET /orders/${ORDER}`]: order(o) });
const subscription = (over: Record<string, unknown> = {}) => ({
  id: SUB,
  entity: 'subscription',
  status: 'active',
  plan_id: PLAN_INR,
  current_end: now() + 300 * DAY,
  ended_at: null,
  notes: { product: 'finealth', plan: 'pro_yearly' },
  ...over,
});

type Route = unknown | (() => Response);
/** Routes Razorpay calls by "METHOD /path". Unknown ids answer like Razorpay (400 not found); PATCH echoes 200. */
function rz(routes: Record<string, Route>) {
  fetchMock.mockImplementation(async (url: string, init: RequestInit = {}) => {
    const method = init.method ?? 'GET';
    const k = `${method} ${String(url).replace(RZ, '')}`;
    expect(String(url).startsWith(RZ)).toBe(true);
    expect(new Headers(init.headers).get('authorization')).toBe(`Basic ${btoa(`${KEY_ID}:${KEY_SECRET}`)}`);
    const r = routes[k];
    if (typeof r === 'function') return (r as () => Response)();
    if (r !== undefined) return json(r);
    if (method === 'PATCH') return json({ ...JSON.parse(String(init.body)) });
    return NOT_FOUND();
  });
}
const calls = (method: string, path: string) =>
  fetchMock.mock.calls.filter(([u, i]) => String(u) === `${RZ}${path}` && ((i as RequestInit | undefined)?.method ?? 'GET') === method);
const patchBody = (path: string) => JSON.parse(String((calls('PATCH', path)[0]![1] as RequestInit).body)) as { notes: Record<string, string> };

async function hmac(payload: string, secret = KEY_SECRET) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(payload)));
  return [...sig].map((b) => b.toString(16).padStart(2, '0')).join('');
}
const claimsOf = async (res: Response) => verifyLicence(((await res.clone().json()) as { token: string }).token, verifier);
const tokenOf = async (res: Response) => ((await res.clone().json()) as { token: string }).token;
/** Signs claims with the Worker's own key (or another key) — for refresh-proof tests. */
async function ourToken(over: Partial<LicenceClaims> & { kh?: string }, signWith?: string) {
  const k = await importSigningKey(signWith ?? signingKeyB64);
  const t = now();
  return signLicence({ v: 1, plan: 'pro_lifetime', src: 'razorpay', iat: t, exp: t + TOKEN_TTL_SECONDS, env: 'dev', ...over }, k);
}
async function otherSigningKey() {
  const kp = (await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify'])) as CryptoKeyPair;
  return b64urlEncode(new Uint8Array((await crypto.subtle.exportKey('pkcs8', kp.privateKey)) as ArrayBuffer));
}
const patched = (path: string) => calls('PATCH', path).length;

describe('platform', () => {
  it('health reports signing key and Razorpay config status without revealing them', async () => {
    const res = await app.request(`${BASE}/api/v1/health`, {}, env({ RELEASE: 'abc123' }));
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('x-request-id')).toBeTruthy();
    const body = await res.json();
    expect(body).toEqual({ ok: true, release: 'abc123', env: 'dev', checks: { signingKey: 'ok', razorpay: 'ok' } });
    const missing = await (await app.request(`${BASE}/api/v1/health`, {}, env({ LICENCE_SIGNING_KEY: undefined, RAZORPAY_KEY_SECRET: undefined }))).json();
    expect(missing).toMatchObject({ checks: { signingKey: 'missing', razorpay: 'missing' } });
    const testKeyInProd = await (await app.request(`${BASE}/api/v1/health`, {}, env({ ENVIRONMENT: 'production' }))).json();
    expect(testKeyInProd).toMatchObject({ checks: { razorpay: 'missing' } });
    expect(JSON.stringify(body)).not.toContain(signingKeyB64);
    expect(JSON.stringify(body)).not.toContain(KEY_SECRET);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('unknown /api path → 404 JSON', async () => {
    const res = await app.request(`${BASE}/api/v1/nope`, {}, env());
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: { code: 'not_found', message: 'Not found.' } });
  });

  it('CSRF: foreign Origin → 403', async () => {
    for (const path of ['/api/v1/licence/verify', '/api/v1/checkout', '/api/v1/checkout/confirm']) {
      const res = await post(path, { key: PAY }, { headers: { origin: 'https://evil.example' } });
      expect(res.status).toBe(403);
      expect((await errOf(res)).code).toBe('forbidden_origin');
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('CORS: allowed origins get ACAO, mobile origin allowed', async () => {
    rz(life());
    const res = await post('/api/v1/licence/verify', { key: PAY }, { headers: { origin: 'finealth://app' } });
    expect(res.status).toBe(200);
    expect(res.headers.get('access-control-allow-origin')).toBe('finealth://app');
    const pre = await app.request(`${BASE}/api/v1/licence/verify`, { method: 'OPTIONS', headers: { origin: 'https://evil.example' } }, env());
    expect(pre.status).toBe(403);
  });

  it('wrong content type → 415', async () => {
    const res = await post('/api/v1/checkout', 'plan=x', { headers: { 'content-type': 'application/x-www-form-urlencoded' } });
    expect(res.status).toBe(415);
    expect((await errOf(res)).code).toBe('unsupported_media_type');
  });

  it('body too large → 413', async () => {
    const res = await post('/api/v1/licence/verify', { key: PAY, pad: 'x'.repeat(17 * 1024) });
    expect(res.status).toBe(413);
    expect((await errOf(res)).code).toBe('payload_too_large');
  });

  it('invalid JSON / body → 400', async () => {
    expect((await post('/api/v1/licence/verify', '{nope')).status).toBe(400);
    const res = await post('/api/v1/licence/verify', { key: PAY, activate: 'yes' });
    expect(res.status).toBe(400);
    expect((await errOf(res)).code).toBe('invalid_request');
  });

  it('rate limit → 429 (memory fallback) on verify, checkout and confirm', async () => {
    rz({ ...life(), 'POST /orders': { id: ORDER } });
    for (const [path, body, ip] of [
      ['/api/v1/licence/verify', { key: PAY }, '203.0.113.9'],
      ['/api/v1/checkout', { plan: 'pro_lifetime', currency: 'INR' }, '203.0.113.10'],
    ] as const) {
      const statuses: number[] = [];
      for (let i = 0; i < 6; i++) statuses.push((await post(path, body, { ip })).status);
      expect(statuses.slice(0, 5)).toEqual([200, 200, 200, 200, 200]);
      expect(statuses[5]).toBe(429);
    }
    const res = await post('/api/v1/licence/verify', { key: PAY }, { ip: '203.0.113.9' });
    expect(await res.json()).toMatchObject({ error: { code: 'rate_limited' } });
    expect(res.headers.get('retry-after')).toBe('60');
  });

  it('uses the RL_STRICT binding when present', async () => {
    for (const path of ['/api/v1/licence/verify', '/api/v1/checkout', '/api/v1/checkout/confirm']) {
      const limit = vi.fn(async () => ({ success: false }));
      const res = await post(path, { key: PAY }, { env: env({ RL_STRICT: { limit } }) });
      expect(res.status).toBe(429);
      expect(limit).toHaveBeenCalledOnce();
    }
  });

  it('production: non-canonical host → 301', async () => {
    const res = await app.request('https://finealth.workers.dev/api/v1/health', {}, env({ ENVIRONMENT: 'production', CANONICAL_HOST: 'finealth.app' }));
    expect(res.status).toBe(301);
    expect(res.headers.get('location')).toBe('https://finealth.app/api/v1/health');
  });
});

describe('POST /api/v1/checkout (Razorpay)', () => {
  it('lifetime → order at the server price; the client cannot change the amount (TC-A-008)', async () => {
    rz({ 'POST /orders': { id: ORDER, status: 'created' } });
    const res = await post('/api/v1/checkout', { plan: 'pro_lifetime', currency: 'INR', amount: 100 });
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ provider: 'razorpay', keyId: KEY_ID, plan: 'pro_lifetime', currency: 'INR', amount: 49900, orderId: ORDER, name: 'Finealth', description: 'Finealth Pro, lifetime' });
    expect(text).not.toContain(KEY_SECRET);
    const sent = JSON.parse(String((calls('POST', '/orders')[0]![1] as RequestInit).body));
    expect(sent).toMatchObject({ amount: 49900, currency: 'INR', notes: { product: 'finealth', plan: 'pro_lifetime' } });
    expect(sent.receipt).toMatch(/^fh-[0-9a-f]{24}$/);
    expect(logs.join('\n')).not.toContain(KEY_SECRET);
  });

  it('lifetime in USD → 1999 cents', async () => {
    rz({ 'POST /orders': { id: ORDER } });
    const res = await post('/api/v1/checkout', { plan: 'pro_lifetime', currency: 'USD' });
    expect(await res.json()).toMatchObject({ amount: 1999, currency: 'USD', orderId: ORDER });
    expect(JSON.parse(String((calls('POST', '/orders')[0]![1] as RequestInit).body))).toMatchObject({ amount: 1999, currency: 'USD' });
  });

  it('yearly → subscription from the configured plan id (TC-A-008)', async () => {
    rz({ 'POST /subscriptions': { id: SUB, status: 'created' } });
    const inr = await post('/api/v1/checkout', { plan: 'pro_yearly', currency: 'INR' });
    expect(await inr.json()).toEqual({ provider: 'razorpay', keyId: KEY_ID, plan: 'pro_yearly', currency: 'INR', amount: 19900, subscriptionId: SUB, name: 'Finealth', description: 'Finealth Pro, yearly' });
    expect(JSON.parse(String((calls('POST', '/subscriptions')[0]![1] as RequestInit).body))).toEqual({
      plan_id: PLAN_INR,
      total_count: 10,
      customer_notify: true,
      notes: { product: 'finealth', plan: 'pro_yearly' },
    });
    await post('/api/v1/checkout', { plan: 'pro_yearly', currency: 'USD' });
    expect(JSON.parse(String((calls('POST', '/subscriptions')[1]![1] as RequestInit).body))).toMatchObject({ plan_id: PLAN_USD });
  });

  it('USD yearly without a USD plan → 503 "International payments are not enabled yet." (no INR fallback) (TC-A-009)', async () => {
    rz({});
    const res = await post('/api/v1/checkout', { plan: 'pro_yearly', currency: 'USD' }, { env: env({ RAZORPAY_PLAN_ID_YEARLY_USD: '<razorpay-plan-id-yearly-usd>' }) });
    expect(res.status).toBe(503);
    expect(await errOf(res)).toEqual({ code: 'unavailable', message: INTERNATIONAL_DISABLED_MESSAGE });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('missing keys or signing key → 503 without calling Razorpay', async () => {
    for (const over of [{ RAZORPAY_KEY_ID: undefined }, { RAZORPAY_KEY_SECRET: undefined }, { RAZORPAY_KEY_ID: '<razorpay-key-id>' }, { LICENCE_SIGNING_KEY: undefined }]) {
      const res = await post('/api/v1/checkout', { plan: 'pro_lifetime', currency: 'INR' }, { env: env(over) });
      expect(res.status).toBe(503);
      expect((await errOf(res)).code).toBe('unavailable');
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('test key in production / live key in dev or staging → 503 and logged (TC-A-014)', async () => {
    for (const e of [env({ ENVIRONMENT: 'production' }), env({ RAZORPAY_KEY_ID: LIVE_KEY_ID }), env({ ENVIRONMENT: 'staging', RAZORPAY_KEY_ID: LIVE_KEY_ID })]) {
      const res = await post('/api/v1/checkout', { plan: 'pro_lifetime', currency: 'INR' }, { env: e });
      expect(res.status).toBe(503);
      for (const path of ['/api/v1/licence/verify', '/api/v1/checkout/confirm']) {
        const r = await post(path, { key: PAY, razorpay_payment_id: PAY, razorpay_order_id: ORDER, razorpay_signature: 'a'.repeat(64) }, { env: e });
        expect(r.status).toBe(503);
      }
    }
    expect(logs.filter((l) => l.includes('"key_mode_mismatch"')).length).toBeGreaterThanOrEqual(3);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('live key in production is accepted', async () => {
    fetchMock.mockResolvedValue(json({ id: ORDER }));
    const res = await post('/api/v1/checkout', { plan: 'pro_lifetime', currency: 'INR' }, { env: env({ ENVIRONMENT: 'production', RAZORPAY_KEY_ID: LIVE_KEY_ID }) });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ keyId: LIVE_KEY_ID });
  });

  it('bad plan / currency → 400 invalid_request', async () => {
    for (const body of [{ plan: 'gold', currency: 'INR' }, { plan: 'pro_lifetime', currency: 'EUR' }, { plan: 'pro_monthly', currency: 'INR' }, {}]) {
      const res = await post('/api/v1/checkout', body);
      expect(res.status).toBe(400);
      expect((await errOf(res)).code).toBe('invalid_request');
    }
  });

  it('KILL_SWITCHES=checkout → POST /checkout 503 without calling Razorpay; confirm and verify are never switched off', async () => {
    rz({ ...life(), 'POST /orders': { id: ORDER } });
    const e = env({ KILL_SWITCHES: 'foo, checkout' });
    const res = await post('/api/v1/checkout', { plan: 'pro_lifetime', currency: 'INR' }, { env: e });
    expect(res.status).toBe(503);
    expect(await errOf(res)).toEqual({ code: 'unavailable', message: CHECKOUT_PAUSED_MESSAGE });
    expect(calls('POST', '/orders')).toHaveLength(0);
    expect((await post('/api/v1/licence/verify', { key: PAY }, { env: e })).status).toBe(200);
    const c2 = await post('/api/v1/checkout/confirm', { razorpay_payment_id: PAY, razorpay_order_id: ORDER, razorpay_signature: await hmac(`${ORDER}|${PAY}`) }, { env: e });
    expect(c2.status).toBe(200);
    expect((await post('/api/v1/checkout', { plan: 'pro_lifetime', currency: 'INR' }, { env: env({ KILL_SWITCHES: 'checkoutx' }) })).status).toBe(200);
  });

  it('Razorpay 500 / 401 / network on create → 503, sent once (no duplicate orders), upstream status logged', async () => {
    for (const status of [500, 401, 429]) {
      fetchMock.mockReset();
      fetchMock.mockResolvedValue(json({ error: { code: 'SERVER_ERROR' } }, status));
      const res = await post('/api/v1/checkout', { plan: 'pro_lifetime', currency: 'INR' });
      expect(res.status).toBe(503);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(logs.some((l) => l.includes('"upstream_error"') && l.includes(`"upstream":${status}`))).toBe(true);
    }
    fetchMock.mockReset();
    fetchMock.mockRejectedValue(new TypeError('network down'));
    expect((await post('/api/v1/checkout', { plan: 'pro_yearly', currency: 'INR' })).status).toBe(503);
  });
});

describe('POST /api/v1/checkout/confirm', () => {
  it('order flow: good signature → token + key (payment id) + plan; activation #1 recorded; key then works on verify (TC-A-011)', async () => {
    rz(life({ notes: { product: 'finealth', plan: 'pro_lifetime', extra: 'keep' } }));
    const sig = await hmac(`${ORDER}|${PAY}`);
    const res = await post('/api/v1/checkout/confirm', { razorpay_payment_id: PAY, razorpay_order_id: ORDER, razorpay_signature: sig });
    expect(res.status).toBe(200);
    const body = (await res.clone().json()) as { token: string; key: string; plan: string };
    expect(body.key).toBe(PAY);
    expect(body.plan).toBe('pro_lifetime');
    expect(await claimsOf(res)).toMatchObject({ v: 1, plan: 'pro_lifetime', src: 'razorpay', kh: await licenceKeyHash(PAY), env: 'dev' });
    expect(patchBody(`/payments/${PAY}`).notes).toEqual({ product: 'finealth', plan: 'pro_lifetime', extra: 'keep', fh_activations: '1', fh_confirmed: '1' });
    expect(JSON.stringify(body)).not.toContain(KEY_SECRET);
    expect(logs.join('\n')).not.toContain(sig);
    expect(logs.join('\n')).not.toContain(PAY);

    // The confirm token is the refresh proof: a refresh with it does not count.
    fetchMock.mockClear();
    const v = await post('/api/v1/licence/verify', { key: PAY, token: body.token });
    expect(v.status).toBe(200);
    expect(await claimsOf(v)).toMatchObject({ plan: 'pro_lifetime', src: 'razorpay' });
    expect(calls('PATCH', `/payments/${PAY}`)).toHaveLength(0);
  });

  it('a retried confirm for the same payment does not count again (notes.fh_confirmed) (PAY-7)', async () => {
    rz(life({ notes: { fh_activations: '1', fh_confirmed: '1' } }));
    const res = await post('/api/v1/checkout/confirm', { razorpay_payment_id: PAY, razorpay_order_id: ORDER, razorpay_signature: await hmac(`${ORDER}|${PAY}`) });
    expect(res.status).toBe(200);
    expect(calls('PATCH', `/payments/${PAY}`)).toHaveLength(0);
    // Even at the limit, a repeat confirm of an already-confirmed payment still answers (same browser retrying).
    rz(life({ notes: { fh_activations: '5', fh_confirmed: '1' } }));
    expect((await post('/api/v1/checkout/confirm', { razorpay_payment_id: PAY, razorpay_order_id: ORDER, razorpay_signature: await hmac(`${ORDER}|${PAY}`) })).status).toBe(200);
  });

  it('subscription flow: signature is HMAC(payment_id|subscription_id); key = subscription id; counter on that payment (TC-A-011)', async () => {
    rz({
      [`GET /subscriptions/${SUB}`]: subscription(),
      [`GET /invoices?subscription_id=${SUB}`]: { items: [] }, // the first invoice may not be listed yet
      [`GET /payments/${FIRST_PAY}`]: payment({ id: FIRST_PAY, amount: 19900, order_id: null, notes: [] }),
    });
    const res = await post('/api/v1/checkout/confirm', { razorpay_payment_id: FIRST_PAY, razorpay_subscription_id: SUB, razorpay_signature: await hmac(`${FIRST_PAY}|${SUB}`) });
    expect(res.status).toBe(200);
    expect(await res.clone().json()).toMatchObject({ key: SUB, plan: 'pro_yearly' });
    expect(await claimsOf(res)).toMatchObject({ plan: 'pro_yearly', src: 'razorpay', kh: await licenceKeyHash(SUB) });
    expect(patchBody(`/payments/${FIRST_PAY}`).notes).toEqual({ fh_activations: '1', fh_confirmed: '1' });
  });

  it('authorized lifetime payment of OUR order → captured at the order amount, then Pro (PAY-9)', async () => {
    rz({
      ...life({ status: 'authorized', captured: false }, { status: 'attempted' }),
      [`POST /payments/${PAY}/capture`]: payment({ status: 'captured', captured: true }),
    });
    const res = await post('/api/v1/checkout/confirm', { razorpay_payment_id: PAY, razorpay_order_id: ORDER, razorpay_signature: await hmac(`${ORDER}|${PAY}`) });
    expect(res.status).toBe(200);
    const cap = calls('POST', `/payments/${PAY}/capture`);
    expect(cap).toHaveLength(1);
    expect(JSON.parse(String((cap[0]![1] as RequestInit).body))).toEqual({ amount: 49900, currency: 'INR' });
    expect(patched(`/payments/${PAY}`)).toBe(1);
  });

  it('capture fails → 409 pending, nothing counted; authorized payment of a foreign order is never captured (PAY-9)', async () => {
    rz({ ...life({ status: 'authorized', captured: false }, { status: 'attempted' }), [`POST /payments/${PAY}/capture`]: () => json({ error: {} }, 400) });
    const a = await post('/api/v1/checkout/confirm', { razorpay_payment_id: PAY, razorpay_order_id: ORDER, razorpay_signature: await hmac(`${ORDER}|${PAY}`) });
    expect(a.status).toBe(409);
    expect(patched(`/payments/${PAY}`)).toBe(0);
    fetchMock.mockClear();
    rz({ ...life({ status: 'authorized', captured: false }, { notes: { product: 'otherapp' } }) });
    const b = await post('/api/v1/checkout/confirm', { razorpay_payment_id: PAY, razorpay_order_id: ORDER, razorpay_signature: await hmac(`${ORDER}|${PAY}`) });
    expect((await errOf(b)).code).toBe('invalid_key');
    expect(calls('POST', `/payments/${PAY}/capture`)).toHaveLength(0);
  });

  it('bad signature → 400 invalid_payment, Razorpay not called (wrong secret, wrong order, swapped format, junk) (TC-A-010)', async () => {
    rz({ [`GET /payments/${PAY}`]: payment(), [`GET /subscriptions/${SUB}`]: subscription() });
    const cases = [
      { razorpay_payment_id: PAY, razorpay_order_id: ORDER, razorpay_signature: await hmac(`${ORDER}|${PAY}`, 'other-secret') },
      { razorpay_payment_id: PAY, razorpay_order_id: 'order_Other1234567', razorpay_signature: await hmac(`${ORDER}|${PAY}`) },
      { razorpay_payment_id: PAY, razorpay_order_id: ORDER, razorpay_signature: await hmac(`${PAY}|${ORDER}`) },
      { razorpay_payment_id: FIRST_PAY, razorpay_subscription_id: SUB, razorpay_signature: await hmac(`${SUB}|${FIRST_PAY}`) },
      { razorpay_payment_id: PAY, razorpay_order_id: ORDER, razorpay_signature: 'not-hex' },
      { razorpay_payment_id: 'bad id', razorpay_order_id: ORDER, razorpay_signature: 'a'.repeat(64) },
    ];
    for (const body of cases) {
      const res = await post('/api/v1/checkout/confirm', body);
      expect(res.status).toBe(400);
      expect(await errOf(res)).toEqual({ code: 'invalid_payment', message: INVALID_PAYMENT_MESSAGE });
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('neither or both of order/subscription id → 400 invalid_request', async () => {
    for (const body of [
      { razorpay_payment_id: PAY, razorpay_signature: 'a'.repeat(64) },
      { razorpay_payment_id: PAY, razorpay_order_id: ORDER, razorpay_subscription_id: SUB, razorpay_signature: 'a'.repeat(64) },
    ]) {
      const res = await post('/api/v1/checkout/confirm', body);
      expect(res.status).toBe(400);
      expect((await errOf(res)).code).toBe('invalid_request');
    }
  });

  it('valid signature but the payment belongs to another order → invalid_key', async () => {
    rz({ [`GET /payments/${PAY}`]: payment({ order_id: 'order_Other1234567' }) });
    const res = await post('/api/v1/checkout/confirm', { razorpay_payment_id: PAY, razorpay_order_id: ORDER, razorpay_signature: await hmac(`${ORDER}|${PAY}`) });
    expect(res.status).toBe(400);
    expect((await errOf(res)).code).toBe('invalid_key');
  });

  it('subscription authenticated (first charge not captured yet) → 409 pending; authorized payment on verify → 409 pending', async () => {
    rz({ [`GET /subscriptions/${SUB}`]: subscription({ status: 'authenticated' }), ...life({ status: 'authorized', captured: false }, { status: 'attempted' }) });
    const a = await post('/api/v1/checkout/confirm', { razorpay_payment_id: FIRST_PAY, razorpay_subscription_id: SUB, razorpay_signature: await hmac(`${FIRST_PAY}|${SUB}`) });
    expect(a.status).toBe(409);
    expect((await errOf(a)).code).toBe('pending');
    const b = await post('/api/v1/licence/verify', { key: PAY, activate: true });
    expect(b.status).toBe(409);
    expect(calls('PATCH', `/payments/${PAY}`)).toHaveLength(0);
    expect(calls('POST', `/payments/${PAY}/capture`)).toHaveLength(0);
  });

  it('a subscription charge (invoice_id) cannot be confirmed as a lifetime order', async () => {
    rz({ [`GET /payments/${PAY}`]: payment({ invoice_id: 'inv_Renewal123456' }) });
    const res = await post('/api/v1/checkout/confirm', { razorpay_payment_id: PAY, razorpay_order_id: ORDER, razorpay_signature: await hmac(`${ORDER}|${PAY}`) });
    expect((await errOf(res)).code).toBe('invalid_key');
  });

  it('confirm enforces the activation limit too', async () => {
    rz(life({ notes: { product: 'finealth', plan: 'pro_lifetime', fh_activations: '5' } }));
    const res = await post('/api/v1/checkout/confirm', { razorpay_payment_id: PAY, razorpay_order_id: ORDER, razorpay_signature: await hmac(`${ORDER}|${PAY}`) });
    expect(res.status).toBe(403);
    expect((await errOf(res)).code).toBe('too_many_activations');
  });
});

describe('POST /api/v1/licence/verify — lifetime (pay_…)', () => {
  it('captured payment → pro_lifetime token with kh and env, TTL exp, src razorpay; key never echoed or logged', async () => {
    rz(life());
    const res = await post('/api/v1/licence/verify', { key: PAY, activate: true });
    expect(res.status).toBe(200);
    const text = await res.clone().text();
    expect(text).not.toContain(PAY);
    expect(text).not.toContain(KEY_SECRET);
    const claims = await claimsOf(res);
    expect(claims).toMatchObject({ v: 1, plan: 'pro_lifetime', src: 'razorpay', kh: await licenceKeyHash(PAY), env: 'dev' });
    expect(claims!.exp - claims!.iat).toBe(TOKEN_TTL_SECONDS);
    expect(logs.join('\n')).not.toContain(PAY);
  });

  it('env claim follows ENVIRONMENT (PAY-10)', async () => {
    rz(life());
    expect(await claimsOf(await post('/api/v1/licence/verify', { key: PAY }, { env: env({ ENVIRONMENT: 'staging' }) }))).toMatchObject({ env: 'staging' });
    expect(await claimsOf(await post('/api/v1/licence/verify', { key: PAY }, { env: env({ ENVIRONMENT: 'weird' }) }))).toMatchObject({ env: 'dev' });
  });

  it('the client plan is ignored: the plan comes from Razorpay data', async () => {
    rz(life());
    const res = await post('/api/v1/licence/verify', { key: PAY, plan: 'pro_yearly' });
    expect(await claimsOf(res)).toMatchObject({ plan: 'pro_lifetime' });
  });

  it('USD lifetime at 1999 cents is valid', async () => {
    rz(life({ amount: 1999, currency: 'USD' }, { amount: 1999, currency: 'USD' }));
    expect((await post('/api/v1/licence/verify', { key: PAY })).status).toBe(200);
  });

  it('a lifetime bought at an older price stays valid: its own order decides, not today\'s price (PAY-3)', async () => {
    rz(life({ amount: 79900, notes: [] }, { amount: 79900 }));
    expect((await post('/api/v1/licence/verify', { key: PAY })).status).toBe(200);
  });

  it('payment notes are never trusted: injected Finealth notes without an Finealth order → invalid_key (PAY-3)', async () => {
    const injected = { notes: { product: 'finealth', plan: 'pro_lifetime' } };
    for (const routes of [
      life(injected, { notes: { product: 'otherapp' } }),
      life(injected, { notes: [] }),
      { [`GET /payments/${PAY}`]: payment(injected) }, // order not found
      { [`GET /payments/${PAY}`]: payment({ ...injected, order_id: null }) }, // no order at all (e.g. payment link)
    ]) {
      rz(routes);
      const res = await post('/api/v1/licence/verify', { key: PAY });
      expect(res.status).toBe(400);
      expect(await errOf(res)).toEqual({ code: 'invalid_key', message: INVALID_KEY_MESSAGE });
    }
  });

  it('refunded (full, partial, status refunded) → 403 refunded (TC-A-012)', async () => {
    for (const over of [
      { status: 'refunded', amount_refunded: 49900, refund_status: 'full' },
      { amount_refunded: 100, refund_status: 'partial' },
      { amount_refunded: 1 },
      { refund_status: 'partial' },
    ]) {
      rz(life(over));
      const res = await post('/api/v1/licence/verify', { key: PAY, activate: true });
      expect(res.status).toBe(403);
      expect(await errOf(res)).toEqual({ code: 'refunded', message: REFUNDED_MESSAGE });
      expect(calls('PATCH', `/payments/${PAY}`)).toHaveLength(0);
    }
  });

  it('disputes are not read (Razorpay has no per-payment dispute lookup): a `disputed` field is ignored (PAY-6, RSK-119)', async () => {
    rz(life({ disputed: true }));
    expect((await post('/api/v1/licence/verify', { key: PAY })).status).toBe(200);
    expect(fetchMock.mock.calls.some(([u]) => String(u).includes('/disputes'))).toBe(false);
  });

  it('not ours → invalid_key: order notes/plan/amount/currency/status mismatch, failed payment, id mismatch', async () => {
    for (const [p, o] of [
      [{}, { notes: { product: 'otherapp', plan: 'pro_lifetime' } }],
      [{}, { notes: { product: 'finealth', plan: 'pro_yearly' } }],
      [{ amount: 100 }, {}],
      [{ currency: 'USD' }, {}],
      [{}, { currency: 'USD' }],
      [{}, { status: 'created' }],
      [{}, { id: 'order_Other1234567' }],
      [{ status: 'failed', captured: false }, {}],
      [{ id: 'pay_Different12345' }, {}],
    ] as const) {
      rz(life(p, o));
      const res = await post('/api/v1/licence/verify', { key: PAY });
      expect(res.status).toBe(400);
      expect(await errOf(res)).toEqual({ code: 'invalid_key', message: INVALID_KEY_MESSAGE });
    }
  });

  it('Razorpay 400/404 → 400 invalid_key with the same message as a malformed key (no enumeration)', async () => {
    rz({ [`GET /payments/${PAY}`]: () => json({ error: { code: 'NOT_FOUND' } }, 404) });
    const a = await post('/api/v1/licence/verify', { key: PAY });
    const b = await post('/api/v1/licence/verify', { key: 'ABCD1234-EF567890-12345678-90ABCDEF' });
    const c2 = await post('/api/v1/licence/verify', { key: 'pay_short' });
    const d = await post('/api/v1/licence/verify', { key: 'pay_LifeTime12345A/../x' });
    const e = await post('/api/v1/licence/verify', { key: 'pay_Unknown1234567' }); // 400 BAD_REQUEST_ERROR from the mock
    const all = await Promise.all([a, b, c2, d, e].map(async (r) => [r.status, await r.json()] as const));
    for (const [status, body] of all) {
      expect(status).toBe(400);
      expect(body).toEqual({ error: { code: 'invalid_key', message: INVALID_KEY_MESSAGE } });
    }
    expect(fetchMock).toHaveBeenCalledTimes(2); // only the two well-formed keys reach Razorpay
  });

  it('Razorpay 500/429/401/403 → 503 unavailable (never invalid_key), upstream status logged; 5xx retried once (TC-A-005)', async () => {
    for (const status of [500, 429, 401, 403]) {
      fetchMock.mockReset();
      fetchMock.mockResolvedValue(json({ error: { code: 'X' } }, status));
      const res = await post('/api/v1/licence/verify', { key: PAY });
      expect(res.status).toBe(503);
      expect((await errOf(res)).code).toBe('unavailable');
      expect(logs.some((l) => l.includes('"upstream_error"') && l.includes(`"upstream":${status}`))).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(status >= 500 ? 2 : 1);
    }
    fetchMock.mockReset();
    fetchMock.mockRejectedValue(new TypeError('network down'));
    expect((await post('/api/v1/licence/verify', { key: SUB })).status).toBe(503);
  });

  it('Razorpay 5xx then success → retry succeeds', async () => {
    fetchMock
      .mockResolvedValueOnce(json({}, 502))
      .mockResolvedValueOnce(json(payment()))
      .mockResolvedValueOnce(json(order()))
      .mockResolvedValueOnce(json({}));
    expect((await post('/api/v1/licence/verify', { key: PAY })).status).toBe(200);
  });

  it('activate:true reads notes.fh_activations, refuses at MAX_ACTIVATIONS (default 5), else patches +1 keeping notes (TC-A-013)', async () => {
    rz(life({ notes: { product: 'finealth', plan: 'pro_lifetime', fh_activations: '4' } }));
    expect((await post('/api/v1/licence/verify', { key: PAY, activate: true })).status).toBe(200);
    expect(patchBody(`/payments/${PAY}`).notes).toEqual({ product: 'finealth', plan: 'pro_lifetime', fh_activations: '5' });

    rz(life({ notes: { product: 'finealth', plan: 'pro_lifetime', fh_activations: '5' } }));
    fetchMock.mockClear();
    const res = await post('/api/v1/licence/verify', { key: PAY, activate: true });
    expect(res.status).toBe(403);
    expect(await errOf(res)).toEqual({ code: 'too_many_activations', message: TOO_MANY_ACTIVATIONS_MESSAGE });
    expect(calls('PATCH', `/payments/${PAY}`)).toHaveLength(0);

    rz(life({ notes: { product: 'finealth', plan: 'pro_lifetime', fh_activations: 2 } }));
    const custom = await post('/api/v1/licence/verify', { key: PAY, activate: true }, { env: env({ MAX_ACTIVATIONS: '2' }) });
    expect((await errOf(custom)).code).toBe('too_many_activations');
  });

  describe('refresh proof (PAY-1)', () => {
    it('refresh without a token counts as an activation', async () => {
      rz(life({ notes: { fh_activations: '2' } }));
      expect((await post('/api/v1/licence/verify', { key: PAY })).status).toBe(200);
      expect(patchBody(`/payments/${PAY}`).notes).toEqual({ fh_activations: '3' });
      fetchMock.mockClear();
      expect((await post('/api/v1/licence/verify', { key: PAY, activate: false })).status).toBe(200);
      expect(patched(`/payments/${PAY}`)).toBe(1);
    });

    it('refresh with a token we issued for this key (even expired) does not count, even at the limit', async () => {
      rz(life({ notes: { fh_activations: '5' } }));
      const t = now();
      const expiredToken = await ourToken({ kh: await licenceKeyHash(PAY), iat: t - 20 * DAY, exp: t - 13 * DAY });
      const res = await post('/api/v1/licence/verify', { key: PAY, token: expiredToken });
      expect(res.status).toBe(200);
      expect(patched(`/payments/${PAY}`)).toBe(0);
      // and the new token is itself a valid proof
      expect((await post('/api/v1/licence/verify', { key: PAY, token: await tokenOf(res) })).status).toBe(200);
      expect(patched(`/payments/${PAY}`)).toBe(0);
    });

    it('forged, other-key, other-env, Play, too-old or junk tokens count as an activation', async () => {
      const kh = await licenceKeyHash(PAY);
      const t = now();
      const bad = [
        await ourToken({ kh }, await otherSigningKey()), // forged with another signing key
        await ourToken({ kh: await licenceKeyHash('pay_SomeoneElse1234') }), // token of another licence key
        await ourToken({}), // no kh (pre-PAY-1 token)
        await ourToken({ kh, env: 'production' }), // another environment
        await ourToken({ kh, src: 'play' }),
        await ourToken({ kh, iat: t - 31 * DAY, exp: t - 24 * DAY }), // older than 30 days
        await ourToken({ kh, iat: t + 3600, exp: t + 3600 + DAY }), // issued in the future
        'junk.token',
      ];
      for (const token of bad) {
        rz(life({ notes: { fh_activations: '1' } }));
        fetchMock.mockClear();
        expect((await post('/api/v1/licence/verify', { key: PAY, token })).status).toBe(200);
        expect(patched(`/payments/${PAY}`)).toBe(1);
      }
      const nonString = await post('/api/v1/licence/verify', { key: PAY, token: 42 });
      expect(nonString.status).toBe(400);
    });

    it('6th activation is refused, including a refresh with no proof', async () => {
      rz(life({ notes: { fh_activations: '5' } }));
      for (const body of [{ key: PAY, activate: true }, { key: PAY }, { key: PAY, token: await ourToken({}) }]) {
        const res = await post('/api/v1/licence/verify', body);
        expect(res.status).toBe(403);
        expect((await errOf(res)).code).toBe('too_many_activations');
      }
      expect(patched(`/payments/${PAY}`)).toBe(0);
    });
  });

  it('a failed notes PATCH still grants Pro (logged)', async () => {
    rz({ ...life(), [`PATCH /payments/${PAY}`]: () => json({ error: {} }, 500) });
    expect((await post('/api/v1/licence/verify', { key: PAY, activate: true })).status).toBe(200);
    expect(logs.some((l) => l.includes('"activation_not_saved"'))).toBe(true);
  });

  it('missing signing key → 503 without calling Razorpay', async () => {
    const res = await post('/api/v1/licence/verify', { key: PAY }, { env: env({ LICENCE_SIGNING_KEY: undefined }) });
    expect(res.status).toBe(503);
    expect((await errOf(res)).code).toBe('unavailable');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('POST /api/v1/licence/verify — yearly (sub_…)', () => {
  const subPayment = (over: Record<string, unknown> = {}) => payment({ id: FIRST_PAY, amount: 19900, order_id: null, invoice_id: 'inv_First1234567', notes: [], ...over });
  const subRoutes = (s: Record<string, unknown> = {}, p: Record<string, unknown> = {}) => ({
    [`GET /subscriptions/${SUB}`]: subscription(s),
    [`GET /invoices?subscription_id=${SUB}`]: { items: [{ status: 'paid', payment_id: FIRST_PAY, paid_at: now() - 60 }] },
    [`GET /payments/${FIRST_PAY}`]: subPayment(p),
  });
  const verifySub = (s: Record<string, unknown>, body: Record<string, unknown> = {}, e = env()) => {
    rz(subRoutes(s));
    return post('/api/v1/licence/verify', { key: SUB, ...body }, { env: e });
  };

  it('active, far renewal → pro_yearly with the 7-day TTL', async () => {
    const res = await verifySub({});
    expect(res.status).toBe(200);
    const claims = await claimsOf(res);
    expect(claims).toMatchObject({ plan: 'pro_yearly', src: 'razorpay' });
    expect(claims!.exp - claims!.iat).toBe(TOKEN_TTL_SECONDS);
  });

  it('active, renewal in 2 days → exp = current_end + 3 days grace', async () => {
    const end = now() + 2 * DAY;
    expect(await claimsOf(await verifySub({ current_end: end }))).toMatchObject({ exp: end + 3 * DAY });
  });

  it('pending (renewal retrying) → Pro until current_end + 3 days', async () => {
    const end = now() - DAY;
    const res = await verifySub({ status: 'pending', current_end: end });
    expect(res.status).toBe(200);
    expect(await claimsOf(res)).toMatchObject({ exp: end + 3 * DAY });
    expect((await verifySub({ status: 'pending', current_end: now() - 4 * DAY })).status).toBe(403);
  });

  it('created / authenticated → 409 pending', async () => {
    for (const status of ['created', 'authenticated']) {
      const res = await verifySub({ status });
      expect(res.status).toBe(409);
      expect((await errOf(res)).code).toBe('pending');
    }
  });

  it('cancelled with current_end in the future → Pro until current_end (no grace); in the past → 403 expired (TC-A-012)', async () => {
    const end = now() + 3 * DAY;
    expect(await claimsOf(await verifySub({ status: 'cancelled', current_end: end }))).toMatchObject({ exp: end });
    const past = await verifySub({ status: 'cancelled', current_end: now() - 60 });
    expect(past.status).toBe(403);
    expect((await errOf(past)).code).toBe('expired');
  });

  it('cancelled immediately (ended_at ≤ now, current_end still ahead) → 403 expired; ended_at in the future caps exp (PAY-2)', async () => {
    const res = await verifySub({ status: 'cancelled', current_end: now() + 200 * DAY, ended_at: now() - 10 });
    expect(res.status).toBe(403);
    expect((await errOf(res)).code).toBe('expired');
    const later = now() + 2 * DAY;
    expect(await claimsOf(await verifySub({ status: 'cancelled', current_end: now() + 200 * DAY, ended_at: later }))).toMatchObject({ exp: later });
  });

  it('latest paid charge refunded (full / partial / status) → 403 refunded even while the subscription is active (PAY-2)', async () => {
    const LATER = 'pay_SubSecond1234A';
    for (const over of [{ status: 'refunded', amount_refunded: 19900, refund_status: 'full' }, { amount_refunded: 100 }, { refund_status: 'partial' }]) {
      rz({
        ...subRoutes(),
        [`GET /invoices?subscription_id=${SUB}`]: { items: [{ status: 'paid', payment_id: FIRST_PAY, paid_at: now() - 400 * DAY }, { status: 'paid', payment_id: LATER, paid_at: now() - DAY }] },
        [`GET /payments/${LATER}`]: subPayment({ id: LATER, ...over }),
      });
      const res = await post('/api/v1/licence/verify', { key: SUB });
      expect(res.status).toBe(403);
      expect(await errOf(res)).toEqual({ code: 'refunded', message: REFUNDED_MESSAGE });
      expect(fetchMock.mock.calls.some(([, i]) => (i as RequestInit).method === 'PATCH')).toBe(false);
    }
  });

  it('subscription charge receipt id (pay_ with invoice_id) → answered as its subscription, key returned (PAY-5)', async () => {
    const RENEWAL = 'pay_Renewal1234567';
    rz({
      ...subRoutes(),
      [`GET /payments/${RENEWAL}`]: subPayment({ id: RENEWAL, invoice_id: 'inv_Renewal123456' }),
      'GET /invoices/inv_Renewal123456': { id: 'inv_Renewal123456', subscription_id: SUB, payment_id: RENEWAL, status: 'paid' },
    });
    const res = await post('/api/v1/licence/verify', { key: RENEWAL, activate: true });
    expect(res.status).toBe(200);
    expect(((await res.clone().json()) as { key: string }).key).toBe(SUB);
    expect(await claimsOf(res)).toMatchObject({ plan: 'pro_yearly', kh: await licenceKeyHash(SUB) });
    expect(patchBody(`/payments/${FIRST_PAY}`).notes).toEqual({ fh_activations: '1' });
    // The token proves the refresh whether the browser sends the sub_ id it was given or the pay_ id it typed.
    fetchMock.mockClear();
    for (const key of [SUB, RENEWAL]) expect((await post('/api/v1/licence/verify', { key, token: await tokenOf(res) })).status).toBe(200);
    expect(fetchMock.mock.calls.some(([, i]) => (i as RequestInit).method === 'PATCH')).toBe(false);
    // An invoice that is not a subscription's → invalid_key.
    rz({ [`GET /payments/${RENEWAL}`]: subPayment({ id: RENEWAL, invoice_id: 'inv_Renewal123456' }), 'GET /invoices/inv_Renewal123456': { id: 'inv_Renewal123456', subscription_id: null } });
    expect((await errOf(await post('/api/v1/licence/verify', { key: RENEWAL }))).code).toBe('invalid_key');
  });

  it('legacy plan ids (RAZORPAY_PLAN_IDS_YEARLY_LEGACY) stay valid; unknown plans do not (PAY-4)', async () => {
    const e = env({ RAZORPAY_PLAN_IDS_YEARLY_LEGACY: ' plan_OldYearly0001 , plan_OldYearly0002' });
    expect((await verifySub({ plan_id: 'plan_OldYearly0002' }, {}, e)).status).toBe(200);
    expect((await verifySub({ plan_id: 'plan_OldYearly0002' })).status).toBe(400);
    expect((await verifySub({ plan_id: 'plan_OldYearly0003' }, {}, e)).status).toBe(400);
  });

  it('halted / completed / expired / paused → 403 expired', async () => {
    for (const status of ['halted', 'completed', 'expired', 'paused', 'something_new']) {
      const res = await verifySub({ status });
      expect(res.status).toBe(403);
      expect((await errOf(res)).code).toBe('expired');
    }
  });

  it('wrong notes.product, unknown plan id, or USD plan not configured → invalid_key', async () => {
    for (const s of [{ notes: { product: 'otherapp' } }, { notes: [] }, { plan_id: 'plan_SomeoneElse001' }]) {
      const res = await verifySub(s);
      expect(res.status).toBe(400);
      expect(await errOf(res)).toEqual({ code: 'invalid_key', message: INVALID_KEY_MESSAGE });
    }
    expect((await verifySub({ plan_id: PLAN_USD }, {}, env({ RAZORPAY_PLAN_ID_YEARLY_USD: '<razorpay-plan-id-yearly-usd>' }))).status).toBe(400);
    expect((await verifySub({ plan_id: PLAN_USD })).status).toBe(200);
  });

  it('activate:true → counter on the first paid invoice payment (subscription notes cannot be updated)', async () => {
    const LATER = 'pay_SubSecond1234A';
    rz({
      [`GET /subscriptions/${SUB}`]: subscription(),
      [`GET /invoices?subscription_id=${SUB}`]: {
        items: [
          { status: 'paid', payment_id: LATER, paid_at: now() - 10 },
          { status: 'issued', payment_id: null },
          { status: 'paid', payment_id: FIRST_PAY, paid_at: now() - 400 * DAY },
        ],
      },
      [`GET /payments/${FIRST_PAY}`]: payment({ id: FIRST_PAY, notes: { fh_activations: '2' } }),
      [`GET /payments/${LATER}`]: subPayment({ id: LATER }),
    });
    expect((await post('/api/v1/licence/verify', { key: SUB, activate: true })).status).toBe(200);
    expect(patchBody(`/payments/${FIRST_PAY}`).notes).toEqual({ fh_activations: '3' });
    expect(calls('PATCH', `/payments/${LATER}`)).toHaveLength(0);
    expect(calls('PATCH', `/subscriptions/${SUB}`)).toHaveLength(0);

    rz({
      [`GET /subscriptions/${SUB}`]: subscription(),
      [`GET /invoices?subscription_id=${SUB}`]: { items: [{ status: 'paid', payment_id: FIRST_PAY, paid_at: 1 }] },
      [`GET /payments/${FIRST_PAY}`]: payment({ id: FIRST_PAY, notes: { fh_activations: '5' } }),
    });
    expect((await errOf(await post('/api/v1/licence/verify', { key: SUB, activate: true }))).code).toBe('too_many_activations');
  });

  it('invoices unreadable → 503 unavailable (the refund check never silently passes), nothing patched', async () => {
    rz({ [`GET /subscriptions/${SUB}`]: subscription(), [`GET /invoices?subscription_id=${SUB}`]: () => json({}, 500) });
    const res = await post('/api/v1/licence/verify', { key: SUB, activate: true });
    expect(res.status).toBe(503);
    expect(logs.some((l) => l.includes('"upstream_error"'))).toBe(true);
    expect(fetchMock.mock.calls.some(([, i]) => (i as RequestInit).method === 'PATCH')).toBe(false);
  });

  it('no paid invoice yet → Pro, refund check and limit skipped (logged)', async () => {
    rz({ [`GET /subscriptions/${SUB}`]: subscription(), [`GET /invoices?subscription_id=${SUB}`]: { items: [] } });
    expect((await post('/api/v1/licence/verify', { key: SUB, activate: true })).status).toBe(200);
    expect(logs.some((l) => l.includes('"activation_skipped"'))).toBe(true);
  });

  it('refresh with a valid proof never patches; without one it counts on the first paid payment (PAY-1)', async () => {
    rz(subRoutes({}, { notes: { fh_activations: '1' } }));
    const first = await post('/api/v1/licence/verify', { key: SUB });
    expect(first.status).toBe(200);
    expect(patchBody(`/payments/${FIRST_PAY}`).notes).toEqual({ fh_activations: '2' });
    fetchMock.mockClear();
    expect((await post('/api/v1/licence/verify', { key: SUB, token: await tokenOf(first) })).status).toBe(200);
    expect(fetchMock.mock.calls.some(([, i]) => (i as RequestInit).method === 'PATCH')).toBe(false);
  });
});

describe('POST /api/v1/play/verify (Google Play)', () => {
  const TOKEN = 'abcdefghijkl.AO-J1Oxyz_purchase-token-1234567890';
  const playFetch = (purchase: unknown, status = 200) =>
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      if (url === 'https://oauth2.googleapis.com/token') {
        const form = new URLSearchParams(String(init?.body));
        expect(form.get('grant_type')).toBe('urn:ietf:params:oauth:grant-type:jwt-bearer');
        expect(form.get('assertion')!.split('.')).toHaveLength(3);
        return json({ access_token: 'ya29.test', expires_in: 3599, token_type: 'Bearer' });
      }
      expect(new Headers(init?.headers).get('authorization')).toBe('Bearer ya29.test');
      return json(purchase, status);
    });
  const iso = (s: number) => new Date(s * 1000).toISOString();
  const sub = (state: string, expiry: number, basePlanId = 'yearly') => ({
    subscriptionState: state,
    lineItems: [{ productId: 'pro', expiryTime: iso(expiry), offerDetails: { basePlanId } }],
  });

  it('active subscription → token with plan from base plan, exp capped at expiryTime', async () => {
    const expiry = now() + 2 * 24 * 3600;
    playFetch(sub('SUBSCRIPTION_STATE_ACTIVE', expiry, 'monthly'));
    const res = await post('/api/v1/play/verify', { purchaseToken: TOKEN, productId: 'pro', kind: 'subscription' });
    expect(res.status).toBe(200);
    const claims = await verifyLicence(((await res.json()) as { token: string }).token, verifier);
    expect(claims).toMatchObject({ plan: 'pro_monthly', src: 'play', exp: expiry });
    const subUrl = fetchMock.mock.calls.find(([u]) => String(u).includes('subscriptionsv2'))![0];
    expect(subUrl).toBe(`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.tezech.finealth/purchases/subscriptionsv2/tokens/${TOKEN}`);
  });

  it('canceled but still within the paid period → active; yearly → pro_yearly with TTL cap', async () => {
    playFetch(sub('SUBSCRIPTION_STATE_CANCELED', now() + 200 * 24 * 3600));
    const res = await post('/api/v1/play/verify', { purchaseToken: TOKEN, productId: 'pro', kind: 'subscription' });
    const claims = await verifyLicence(((await res.json()) as { token: string }).token, verifier);
    expect(claims).toMatchObject({ plan: 'pro_yearly' });
    expect(claims!.exp - claims!.iat).toBe(TOKEN_TTL_SECONDS);
  });

  it('expired subscription → 403 expired', async () => {
    playFetch(sub('SUBSCRIPTION_STATE_EXPIRED', now() - 60));
    const res = await post('/api/v1/play/verify', { purchaseToken: TOKEN, productId: 'pro', kind: 'subscription' });
    expect(res.status).toBe(403);
    expect((await errOf(res)).code).toBe('expired');
  });

  it('refunded/revoked subscription (EXPIRED after revoke, or token gone 410) → 403', async () => {
    playFetch(sub('SUBSCRIPTION_STATE_EXPIRED', now() - 5));
    expect((await post('/api/v1/play/verify', { purchaseToken: TOKEN, productId: 'pro', kind: 'subscription' })).status).toBe(403);
    playFetch({ error: { code: 410 } }, 410);
    const res = await post('/api/v1/play/verify', { purchaseToken: TOKEN, productId: 'pro', kind: 'subscription' });
    expect(res.status).toBe(403);
  });

  it('lifetime product purchased → pro_lifetime', async () => {
    playFetch({ kind: 'androidpublisher#productPurchase', purchaseState: 0, consumptionState: 1, productId: 'pro_lifetime', quantity: 1, refundableQuantity: 1 });
    const res = await post('/api/v1/play/verify', { purchaseToken: TOKEN, productId: 'pro_lifetime', kind: 'product' });
    expect(res.status).toBe(200);
    const claims = await verifyLicence(((await res.json()) as { token: string }).token, verifier);
    expect(claims).toMatchObject({ plan: 'pro_lifetime', src: 'play' });
    expect(fetchMock.mock.calls.some(([u]) => String(u).endsWith(`/purchases/products/pro_lifetime/tokens/${TOKEN}`))).toBe(true);
  });

  it('lifetime product refunded → 403 refunded', async () => {
    for (const p of [{ purchaseState: 1 }, { purchaseState: 0, quantity: 1, refundableQuantity: 0 }]) {
      playFetch(p);
      const res = await post('/api/v1/play/verify', { purchaseToken: TOKEN, productId: 'pro_lifetime', kind: 'product' });
      expect(res.status).toBe(403);
      expect((await errOf(res)).code).toBe('refunded');
    }
  });

  it('unknown productId → 400; missing service account → 503; Google 404 → 400 invalid_key', async () => {
    playFetch({});
    expect((await post('/api/v1/play/verify', { purchaseToken: TOKEN, productId: 'other', kind: 'product' })).status).toBe(400);
    expect((await post('/api/v1/play/verify', { purchaseToken: TOKEN, productId: 'pro', kind: 'product' })).status).toBe(400);
    const noSa = await post('/api/v1/play/verify', { purchaseToken: TOKEN, productId: 'pro', kind: 'subscription' }, { env: env({ GOOGLE_PLAY_SA_KEY: undefined }) });
    expect(noSa.status).toBe(503);
    playFetch({ error: { code: 404 } }, 404);
    const nf = await post('/api/v1/play/verify', { purchaseToken: TOKEN, productId: 'pro', kind: 'subscription' });
    expect(nf.status).toBe(400);
    expect((await errOf(nf)).code).toBe('invalid_key');
    expect(logs.join('\n')).not.toContain(TOKEN);
  });
});

describe('POST /api/v1/errors', () => {
  it('scrubs PII from the logged line and returns 204', async () => {
    const res = await post('/api/v1/errors', {
      platform: 'web',
      message: 'Failed for priya@example.com with GSTIN 27AAPFU0939F1ZV and phone 9876543210',
      stack: 'Error: x\n    at save (https://finealth.app/_next/app.js?token=secret123:1:2)',
      release: 'web@1.2.3',
      route: '/invoice?client=priya@example.com#x',
    });
    expect(res.status).toBe(204);
    const line = logs.find((l) => l.includes('"client_error"'))!;
    expect(line).toBeTruthy();
    expect(line).not.toContain('priya@example.com');
    expect(line).not.toContain('27AAPFU0939F1ZV');
    expect(line).not.toContain('9876543210');
    expect(line).not.toContain('secret123');
    expect(line).toContain('[email]');
    expect(line).toContain('[taxid]');
    expect(JSON.parse(line)).toMatchObject({ evt: 'client_error', platform: 'web', route: '/invoice' });
  });

  it('accepts the legacy `url` field and keeps only its path', async () => {
    expect((await post('/api/v1/errors', { platform: 'web', message: 'boom', url: 'https://finealth.app/pro?k=1' })).status).toBe(204);
    const line = logs.find((l) => l.includes('"client_error"'))!;
    expect(JSON.parse(line)).toMatchObject({ route: '/pro' });
    expect(line).not.toContain('k=1');
  });

  it('rejects reports over 4 KB and invalid shapes', async () => {
    expect((await post('/api/v1/errors', { platform: 'web', message: 'x'.repeat(5000) })).status).toBe(413);
    expect((await post('/api/v1/errors', { platform: 'desktop', message: 'x' })).status).toBe(400);
  });

  it('scrub() handles licence keys, Razorpay ids, tokens and long numbers', () => {
    const dashKey = 'ABCD1234-EF567890-12345678-90ABCDEF';
    const s = scrub(`key ${dashKey} lic ${PAY} sub ${SUB} id ${KEY_ID} acct 12345678 abn 51 824 753 556 ok 2024`);
    for (const v of [dashKey, PAY, SUB, KEY_ID]) expect(s).not.toContain(v);
    expect(s).not.toContain('12345678');
    expect(s).not.toContain('51 824 753 556');
    expect(s).toContain('2024');
  });
});
