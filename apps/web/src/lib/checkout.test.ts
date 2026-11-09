// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { LicenceClaims } from '@finealth/shared-types';
import { b64urlEncode, signLicence, TOKEN_TTL_SECONDS } from '@finealth/finance-core';
import {
  confirmPayment,
  PENDING_KEY,
  readPending,
  retryPendingConfirm,
  startCheckout,
  type CheckoutDeps,
  type RazorpayCtor,
  type RazorpayOptions,
  type RazorpayResponse,
} from './checkout';
import { PRO_KEY, readStoredPro, type KV } from './pro';

const NOW = 1_800_000_000;
const PAY = 'pay_TestPay0000000001';
const SUB = 'sub_TestSub0000000001';
const ORDER = 'order_TestOrd00000001';

function memory(): KV & { data: Record<string, string> } {
  const data: Record<string, string> = {};
  return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => void (data[k] = v), removeItem: (k) => void delete data[k] };
}

async function keys() {
  const pair = (await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify'])) as CryptoKeyPair;
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey));
  return { sign: pair.privateKey, publicB64: b64urlEncode(raw) };
}

const claims = (over: Partial<LicenceClaims> = {}): LicenceClaims => ({ v: 1, plan: 'pro_lifetime', src: 'razorpay', iat: NOW - 10, exp: NOW + TOKEN_TTL_SECONDS, ...over });
const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

type Route = (body: Record<string, unknown>) => Response | Promise<Response>;
/** fetch stub: one handler per API path; records each request body. */
function api(routes: Record<string, Route>) {
  const calls: { path: string; body: Record<string, unknown> }[] = [];
  const fetchImpl = (async (url: RequestInfo | URL, init?: RequestInit) => {
    const path = String(url);
    const body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
    calls.push({ path, body });
    const r = routes[path];
    if (!r) throw new TypeError('Failed to fetch');
    return r(body);
  }) as typeof fetch;
  return { fetchImpl, calls };
}

/** A fake Razorpay that does what the test says when opened. */
function fakeRazorpay(onOpen: (o: RazorpayOptions) => void) {
  const opened: RazorpayOptions[] = [];
  const Ctor = class {
    constructor(private o: RazorpayOptions) {}
    open() {
      opened.push(this.o);
      onOpen(this.o);
    }
  } as unknown as RazorpayCtor;
  return { Ctor, opened };
}

const orderStart = reply(200, { provider: 'razorpay', keyId: 'rzp_test_abc123', plan: 'pro_lifetime', currency: 'INR', amount: 49900, orderId: ORDER, name: 'Finealth', description: 'Finealth Pro Lifetime' });
const paid: RazorpayResponse = { razorpay_payment_id: PAY, razorpay_order_id: ORDER, razorpay_signature: 'sig' };

async function deps(routes: Record<string, Route>, onOpen: (o: RazorpayOptions) => void = (o) => o.handler(paid)) {
  const k = await keys();
  const kv = memory();
  const { fetchImpl, calls } = api(routes);
  const rz = fakeRazorpay(onOpen);
  let scriptLoads = 0;
  const d: CheckoutDeps = { kv, publicKey: k.publicB64, apiBase: '', now: NOW, fetchImpl, loadScript: async () => (scriptLoads++, rz.Ctor) };
  return { d, kv, calls, k, opened: rz.opened, scriptLoads: () => scriptLoads };
}

describe('startCheckout', () => {
  it('order (Lifetime): opens Razorpay with the order, confirms, verifies and stores Pro', async () => {
    const k = await keys();
    const token = await signLicence(claims(), k.sign);
    const t = await deps({ '/api/v1/checkout': () => orderStart.clone(), '/api/v1/checkout/confirm': () => reply(200, { token, key: PAY, plan: 'pro_lifetime' }) });
    t.d.publicKey = k.publicB64;
    const r = await startCheckout('pro_lifetime', 'INR', t.d);
    expect(r).toMatchObject({ kind: 'success', key: PAY, plan: 'pro_lifetime' });
    expect(readStoredPro(t.kv)).toEqual({ key: PAY, plan: 'pro_lifetime', token, lastSeen: NOW });
    expect(t.calls[0]).toEqual({ path: '/api/v1/checkout', body: { plan: 'pro_lifetime', currency: 'INR' } });
    expect(t.calls[1]!.body).toEqual({ razorpay_payment_id: PAY, razorpay_order_id: ORDER, razorpay_signature: 'sig' });
    const o = t.opened[0]!;
    expect(o).toMatchObject({ key: 'rzp_test_abc123', order_id: ORDER, amount: 49900, currency: 'INR', theme: { color: '#2453FF' } });
    expect(o.subscription_id).toBeUndefined();
    // We never prefill or collect contact details: Razorpay asks for them.
    expect(o).not.toHaveProperty('prefill');
  });

  it('subscription (Yearly): passes subscription_id without amount; the licence key is the sub_ id', async () => {
    const k = await keys();
    const token = await signLicence(claims({ plan: 'pro_yearly' }), k.sign);
    const t = await deps(
      {
        '/api/v1/checkout': () => reply(200, { provider: 'razorpay', keyId: 'rzp_test_abc123', plan: 'pro_yearly', currency: 'USD', amount: 799, subscriptionId: SUB, name: 'Finealth', description: 'Pro Yearly' }),
        '/api/v1/checkout/confirm': () => reply(200, { token, key: SUB, plan: 'pro_yearly' }),
      },
      (o) => o.handler({ razorpay_payment_id: PAY, razorpay_subscription_id: SUB, razorpay_signature: 'sig' }),
    );
    t.d.publicKey = k.publicB64;
    const r = await startCheckout('pro_yearly', 'USD', t.d);
    expect(r).toMatchObject({ kind: 'success', key: SUB, plan: 'pro_yearly' });
    expect(t.opened[0]).toMatchObject({ subscription_id: SUB });
    expect(t.opened[0]!.amount).toBeUndefined();
    expect(t.opened[0]!.order_id).toBeUndefined();
    expect(t.calls[1]!.body).toEqual({ razorpay_payment_id: PAY, razorpay_subscription_id: SUB, razorpay_signature: 'sig' });
  });

  it('shows server errors and never loads checkout.js for them', async () => {
    const cases: [Response, RegExp][] = [
      [reply(400, { error: { code: 'invalid_request', message: 'bad' } }), /refresh the page/],
      [reply(429, { error: { code: 'rate_limited', message: 'slow' } }), /wait a minute/],
      [reply(503, { error: { code: 'unavailable', message: 'International payments are not enabled yet.' } }), /^International payments are not enabled yet\.$/],
      [new Response('<html>bad gateway', { status: 502 }), /unavailable right now/],
    ];
    for (const [res, msg] of cases) {
      const t = await deps({ '/api/v1/checkout': () => res });
      const r = await startCheckout('pro_yearly', 'USD', t.d);
      expect(r).toMatchObject({ kind: 'error', message: expect.stringMatching(msg) });
      expect(t.scriptLoads()).toBe(0);
      expect(t.kv.data[PRO_KEY]).toBeUndefined();
    }
    const offline = await deps({});
    expect(await startCheckout('pro_yearly', 'USD', offline.d)).toMatchObject({ kind: 'error', message: expect.stringMatching(/connection/) });
  });

  it('a dismissed checkout does nothing', async () => {
    const t = await deps({ '/api/v1/checkout': () => orderStart.clone() }, (o) => o.modal.ondismiss());
    expect(await startCheckout('pro_lifetime', 'INR', t.d)).toEqual({ kind: 'dismissed' });
    expect(t.calls).toHaveLength(1);
    expect(t.kv.data).toEqual({});
  });

  it('checkout.js failing to load is an error, nothing charged', async () => {
    const t = await deps({ '/api/v1/checkout': () => orderStart.clone() });
    t.d.loadScript = async () => null;
    expect(await startCheckout('pro_lifetime', 'INR', t.d)).toMatchObject({ kind: 'error', message: expect.stringMatching(/could not load/) });
  });

  it('a bad confirmation stores nothing', async () => {
    const t = await deps({ '/api/v1/checkout': () => orderStart.clone(), '/api/v1/checkout/confirm': () => reply(400, { error: { code: 'invalid_payment', message: 'x' } }) });
    const r = await startCheckout('pro_lifetime', 'INR', t.d);
    expect(r).toMatchObject({ kind: 'error', message: expect.stringContaining(PAY) });
    expect(t.kv.data).toEqual({});
  });

  it('a token that does not verify grants nothing, but the buyer can still restore', async () => {
    const other = await keys();
    const forged = await signLicence(claims(), other.sign);
    const t = await deps({ '/api/v1/checkout': () => orderStart.clone(), '/api/v1/checkout/confirm': () => reply(200, { token: forged, key: PAY, plan: 'pro_lifetime' }) });
    expect(await startCheckout('pro_lifetime', 'INR', t.d)).toMatchObject({ kind: 'recover', id: PAY });
    expect(t.kv.data[PRO_KEY]).toBeUndefined();
  });
});

describe('confirmPayment recovery (never lose a paid purchase)', () => {
  it('network failure after payment → recovery with the payment id; the ids are kept for a retry (PAY-5)', async () => {
    const t = await deps({});
    expect(await confirmPayment(paid, t.d, 'pro_lifetime')).toMatchObject({ kind: 'recover', id: PAY, pending: false, message: expect.stringMatching(/paste this ID/) });
    expect(t.kv.data[PRO_KEY]).toBeUndefined();
    expect(readPending(t.kv)).toEqual({ pendingId: PAY, orderId: ORDER, signature: 'sig', plan: 'pro_lifetime' });
  });

  it('the pending record is written BEFORE confirm is called, and cleared on success (PAY-5)', async () => {
    const k = await keys();
    const token = await signLicence(claims(), k.sign);
    let seenAtCall: unknown = 'unset';
    const kv = memory();
    const fetchImpl = (async () => {
      seenAtCall = readPending(kv);
      return reply(200, { token, key: PAY, plan: 'pro_lifetime' });
    }) as unknown as typeof fetch;
    const r = await confirmPayment(paid, { kv, publicKey: k.publicB64, apiBase: '', now: NOW, fetchImpl }, 'pro_lifetime');
    expect(r.kind).toBe('success');
    expect(seenAtCall).toMatchObject({ pendingId: PAY, orderId: ORDER });
    expect(kv.data[PENDING_KEY]).toBeUndefined();
  });

  it('retryPendingConfirm: retries with backoff, succeeds silently and clears; nothing pending → null (PAY-5)', async () => {
    const k = await keys();
    const token = await signLicence(claims({ plan: 'pro_yearly' }), k.sign);
    const kv = memory();
    kv.setItem(PENDING_KEY, JSON.stringify({ pendingId: PAY, subscriptionId: SUB, signature: 'sig', plan: 'pro_yearly' }));
    let n = 0;
    const bodies: unknown[] = [];
    const fetchImpl = (async (_u: RequestInfo | URL, init?: RequestInit) => {
      bodies.push(JSON.parse(String(init?.body)));
      if (++n < 3) return reply(503, { error: { code: 'unavailable' } });
      return reply(200, { token, key: SUB, plan: 'pro_yearly' });
    }) as typeof fetch;
    const waits: number[] = [];
    const d = { kv, publicKey: k.publicB64, apiBase: '', now: NOW, fetchImpl };
    const r = await retryPendingConfirm(d, { sleep: async (ms) => void waits.push(ms) });
    expect(r).toMatchObject({ kind: 'success', key: SUB });
    expect(waits).toEqual([5000, 20000]);
    expect(bodies[0]).toEqual({ razorpay_payment_id: PAY, razorpay_subscription_id: SUB, razorpay_signature: 'sig' });
    expect(kv.data[PENDING_KEY]).toBeUndefined();
    expect(readStoredPro(kv)).toMatchObject({ key: SUB, plan: 'pro_yearly' });
    expect(await retryPendingConfirm(d)).toBeNull();
  });

  it('retryPendingConfirm: at most 3 tries per load; kept after temporary failures, cleared on a final error (PAY-5)', async () => {
    const kv = memory();
    kv.setItem(PENDING_KEY, JSON.stringify({ pendingId: PAY, orderId: ORDER, signature: 'sig' }));
    let n = 0;
    const down = (async () => (n++, reply(503, {}))) as unknown as typeof fetch;
    const k = await keys();
    expect(await retryPendingConfirm({ kv, publicKey: k.publicB64, apiBase: '', fetchImpl: down }, { sleep: async () => undefined })).toMatchObject({ kind: 'recover' });
    expect(n).toBe(3);
    expect(readPending(kv)).not.toBeNull();
    const bad = (async () => reply(400, { error: { code: 'invalid_payment' } })) as unknown as typeof fetch;
    expect(await retryPendingConfirm({ kv, publicKey: k.publicB64, apiBase: '', fetchImpl: bad }, { sleep: async () => undefined })).toMatchObject({ kind: 'error' });
    expect(kv.data[PENDING_KEY]).toBeUndefined();
    // junk records are ignored
    kv.setItem(PENDING_KEY, '{"pendingId":"nope"}');
    expect(readPending(kv)).toBeNull();
  });

  it('403 refunded / expired / too_many_activations → their own message, not the recovery message (PAY-12)', async () => {
    for (const [code, re] of [
      ['refunded', /refunded/],
      ['expired', /subscription has ended/],
      ['too_many_activations', /too many browsers/],
    ] as const) {
      const t = await deps({ '/api/v1/checkout/confirm': () => reply(403, { error: { code, message: 'x' } }) });
      const r = await confirmPayment(paid, t.d);
      expect(r).toMatchObject({ kind: 'error', message: expect.stringMatching(re) });
      expect((r as { message: string }).message).not.toMatch(/paste this ID/);
      expect(t.kv.data[PENDING_KEY]).toBeUndefined();
    }
  });

  it('503 after payment → recovery; a subscription restores with its sub_ id', async () => {
    const t = await deps({ '/api/v1/checkout/confirm': () => reply(503, { error: { code: 'unavailable', message: 'x' } }) });
    expect(await confirmPayment({ razorpay_payment_id: PAY, razorpay_subscription_id: SUB, razorpay_signature: 's' }, t.d)).toMatchObject({ kind: 'recover', id: SUB });
  });

  it('pending → "processing" recovery', async () => {
    const t = await deps({ '/api/v1/checkout/confirm': () => reply(409, { error: { code: 'pending', message: 'x' } }) });
    expect(await confirmPayment(paid, t.d)).toMatchObject({ kind: 'recover', pending: true, id: PAY, message: expect.stringMatching(/processing/) });
    expect(t.kv.data[PRO_KEY]).toBeUndefined();
    expect(readPending(t.kv)).not.toBeNull();
  });
});
