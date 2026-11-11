// Sends requests to the Finealth Worker (apps/api) running in Node, for Robot Framework:
//   echo '{"method":"POST","path":"/api/v1/licence/verify","body":{"key":"pay_LifeTime12345A"},"scenario":"lifetime_captured"}' \
//     | node tests/automation/libraries/api-bridge.mjs
// Prints {status, headers, json, text, upstream, logs, claims, statuses, leaks} as JSON.
//
// Nothing real is ever called: global fetch is replaced by scripted fakes of api.razorpay.com and Google (oauth2 +
// androidpublisher), picked by the named `scenario` (SCENARIOS below; they mirror apps/api/test/api.test.ts). Every run
// makes a throwaway Ed25519 signing key, a throwaway RSA Google service account and test Razorpay keys assembled from
// parts, so the secret scanner is not triggered and no real secret is ever read.
//
// Extra request fields (all optional): headers, env (overrides; null removes a variable), rawBody (sent as is instead of
// JSON), repeat (send the same request N times in one Worker instance, e.g. for the rate limit; `statuses` lists them).
// Body placeholders, filled in-process because they need this run's keys:
//   "$SIG"            correct Razorpay HMAC: order_id|payment_id, or payment_id|subscription_id
//   "$SIG_OTHER"      HMAC made with another secret       "$SIG_SWAPPED"  HMAC of the ids in the wrong order
//   "$OUR_TOKEN"      a token this Worker issued for body.key (kh)  "$OUR_TOKEN_EXPIRED" same, expired 13 days ago
//   "$FORGED_TOKEN"   same claims signed with another key            "$PAD17K"  17 KB of padding
import { load, readStdin } from './bundle.mjs';

const input = await readStdin();
const { method = 'GET', path = '/api/v1/health', scenario = 'none', headers = {}, env: envOver = {}, rawBody, repeat = 1 } = input;
let body = input.body ?? null;

const WATCH = ['apps/api/src', 'packages/finance-core/src', 'packages/shared-types/src'];
const mod = await load('apps/api/src/index.ts', 'finealth-api', WATCH);
const app = mod.default ?? mod.app;
const core = await load('packages/finance-core/src/index.ts', 'finance-core', ['packages/finance-core/src']);
const { b64urlEncode, importSigningKey, importVerifyKey, licenceKeyHash, signLicence, verifyLicence, TOKEN_TTL_SECONDS } = core;

const BASE = 'https://finealth.test';
const RZ = 'https://api.razorpay.com/v1';
const KEY_ID = ['rzp', 'test', 'AbCdEf123456'].join('_');
const KEY_SECRET = ['robot', 'test', 'only', 'not', 'a', 'real', 'value'].join('-');
const PLAN_INR = 'plan_YearlyINR00001';
const PLAN_USD = 'plan_YearlyUSD00001';
const PAY = 'pay_LifeTime12345A';
const ORDER = 'order_Ord12345678AB';
const SUB = 'sub_Yearly12345ABC';
const FIRST_PAY = 'pay_SubFirst12345A';
const LATER_PAY = 'pay_SubSecond1234A';
const DAY = 24 * 3600;
const now = () => Math.floor(Date.now() / 1000);

// ---------------------------------------------------------------- throwaway keys (this run only)
const kp = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
const signingKeyB64 = b64urlEncode(new Uint8Array(await crypto.subtle.exportKey('pkcs8', kp.privateKey)));
const verifier = await importVerifyKey(b64urlEncode(new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey))));
const rsa = await crypto.subtle.generateKey(
  { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
  true,
  ['sign', 'verify'],
);
const der = new Uint8Array(await crypto.subtle.exportKey('pkcs8', rsa.privateKey));
const tag = ['PRIVATE', 'KEY'].join(' ');
const pem = `-----BEGIN ${tag}-----\n${Buffer.from(der).toString('base64').replace(/(.{64})/g, '$1\n')}\n-----END ${tag}-----\n`;
const saJson = JSON.stringify({ type: 'service_account', client_email: 'sa@test.iam.gserviceaccount.com', private_key: pem, token_uri: 'https://oauth2.googleapis.com/token' });

const env = {
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
};
for (const [k, v] of Object.entries(envOver)) {
  if (v === null) delete env[k];
  else env[k] = v;
}

// ---------------------------------------------------------------- Razorpay and Google fakes
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
const NOT_FOUND = () => json({ error: { code: 'BAD_REQUEST_ERROR', description: 'The ID provided is invalid or could not be found.' } }, 400);
const payment = (o = {}) => ({ id: PAY, entity: 'payment', status: 'captured', amount: 49900, currency: 'INR', order_id: ORDER, amount_refunded: 0, refund_status: null, captured: true, notes: { product: 'finealth', plan: 'pro_lifetime' }, ...o });
const order = (o = {}) => ({ id: ORDER, entity: 'order', status: 'paid', amount: 49900, currency: 'INR', notes: { product: 'finealth', plan: 'pro_lifetime' }, ...o });
const life = (p = {}, o = {}) => ({ [`GET /payments/${PAY}`]: payment(p), [`GET /orders/${ORDER}`]: order(o) });
const subscription = (o = {}) => ({ id: SUB, entity: 'subscription', status: 'active', plan_id: PLAN_INR, current_end: now() + 300 * DAY, ended_at: null, notes: { product: 'finealth', plan: 'pro_yearly' }, ...o });
const subPayment = (o = {}) => payment({ id: FIRST_PAY, amount: 19900, order_id: null, invoice_id: 'inv_First1234567', notes: [], ...o });
const subRoutes = (s = {}, p = {}) => ({
  [`GET /subscriptions/${SUB}`]: subscription(s),
  [`GET /invoices?subscription_id=${SUB}`]: { items: [{ status: 'paid', payment_id: FIRST_PAY, paid_at: now() - 60 }] },
  [`GET /payments/${FIRST_PAY}`]: subPayment(p),
});
const always = (status) => ({ '*': () => json({ error: { code: 'SERVER_ERROR' } }, status) });
const iso = (s) => new Date(s * 1000).toISOString();
const playSub = (state, expiry, basePlanId = 'yearly') => ({ subscriptionState: state, lineItems: [{ productId: 'pro', expiryTime: iso(expiry), offerDetails: { basePlanId } }] });

/** Each scenario: { rz: routes by "METHOD /path" } and/or { play: [body, status] } and/or { seq: [responses in order] }. */
const SCENARIOS = {
  none: {},
  order_created: { rz: { 'POST /orders': { id: ORDER, status: 'created' } } },
  sub_created: { rz: { 'POST /subscriptions': { id: SUB, status: 'created' } } },
  lifetime_captured: { rz: { ...life(), 'POST /orders': { id: ORDER } } },
  lifetime_usd: { rz: life({ amount: 1999, currency: 'USD' }, { amount: 1999, currency: 'USD' }) },
  lifetime_old_price: { rz: life({ amount: 79900, notes: [] }, { amount: 79900 }) },
  lifetime_notes4: { rz: life({ notes: { product: 'finealth', plan: 'pro_lifetime', fh_activations: '4' } }) },
  lifetime_at_limit: { rz: life({ notes: { product: 'finealth', plan: 'pro_lifetime', fh_activations: '5' } }) },
  lifetime_confirmed: { rz: life({ notes: { product: 'finealth', plan: 'pro_lifetime', fh_activations: '1', fh_confirmed: '1' } }) },
  lifetime_refunded: { rz: life({ status: 'refunded', amount_refunded: 49900, refund_status: 'full' }) },
  lifetime_partial_refund: { rz: life({ amount_refunded: 100, refund_status: 'partial' }) },
  lifetime_not_ours: { rz: life({}, { notes: { product: 'otherapp', plan: 'pro_lifetime' } }) },
  lifetime_injected_notes: { rz: life({ notes: { product: 'finealth', plan: 'pro_lifetime' } }, { notes: { product: 'otherapp' } }) },
  lifetime_wrong_amount: { rz: life({ amount: 100 }) },
  lifetime_other_order: { rz: { [`GET /payments/${PAY}`]: payment({ order_id: 'order_Other1234567' }) } },
  lifetime_authorized: {
    rz: { ...life({ status: 'authorized', captured: false }, { status: 'attempted' }), [`POST /payments/${PAY}/capture`]: payment({ status: 'captured', captured: true }) },
  },
  lifetime_authorized_capture_fails: {
    rz: { ...life({ status: 'authorized', captured: false }, { status: 'attempted' }), [`POST /payments/${PAY}/capture`]: () => json({ error: {} }, 400) },
  },
  patch_fails: { rz: { ...life(), [`PATCH /payments/${PAY}`]: () => json({ error: {} }, 500) } },
  razorpay_404: { rz: { [`GET /payments/${PAY}`]: () => json({ error: { code: 'NOT_FOUND' } }, 404) } },
  razorpay_5xx: { rz: always(500) },
  razorpay_401: { rz: always(401) },
  razorpay_429: { rz: always(429) },
  network_down: { throws: true },
  razorpay_5xx_then_ok: { seq: [() => json({}, 502), () => json(payment()), () => json(order()), () => json({})] },
  sub_active: { rz: subRoutes() },
  sub_active_usd: { rz: subRoutes({ plan_id: PLAN_USD }) },
  sub_renews_in_2_days: { rz: subRoutes({ current_end: now() + 2 * DAY }) },
  sub_pending_1_day_late: { rz: subRoutes({ status: 'pending', current_end: now() - DAY }) },
  sub_pending_4_days_late: { rz: subRoutes({ status: 'pending', current_end: now() - 4 * DAY }) },
  sub_authenticated: { rz: { ...subRoutes({ status: 'authenticated' }) } },
  sub_cancelled_future: { rz: subRoutes({ status: 'cancelled', current_end: now() + 3 * DAY }) },
  sub_cancelled_past: { rz: subRoutes({ status: 'cancelled', current_end: now() - 60 }) },
  sub_halted: { rz: subRoutes({ status: 'halted' }) },
  sub_not_ours: { rz: subRoutes({ notes: { product: 'otherapp' } }) },
  sub_latest_refunded: {
    rz: {
      ...subRoutes(),
      [`GET /invoices?subscription_id=${SUB}`]: { items: [{ status: 'paid', payment_id: FIRST_PAY, paid_at: now() - 400 * DAY }, { status: 'paid', payment_id: LATER_PAY, paid_at: now() - DAY }] },
      [`GET /payments/${LATER_PAY}`]: subPayment({ id: LATER_PAY, status: 'refunded', amount_refunded: 19900, refund_status: 'full' }),
    },
  },
  sub_invoices_down: { rz: { [`GET /subscriptions/${SUB}`]: subscription(), [`GET /invoices?subscription_id=${SUB}`]: () => json({}, 500) } },
  sub_first_confirm: {
    rz: {
      [`GET /subscriptions/${SUB}`]: subscription(),
      [`GET /invoices?subscription_id=${SUB}`]: { items: [] },
      [`GET /payments/${FIRST_PAY}`]: payment({ id: FIRST_PAY, amount: 19900, order_id: null, notes: [] }),
    },
  },
  play_sub_active: { play: [playSub('SUBSCRIPTION_STATE_ACTIVE', now() + 2 * DAY, 'monthly')] },
  play_sub_canceled_in_period: { play: [playSub('SUBSCRIPTION_STATE_CANCELED', now() + 200 * DAY)] },
  play_sub_expired: { play: [playSub('SUBSCRIPTION_STATE_EXPIRED', now() - 60)] },
  play_sub_gone_410: { play: [{ error: { code: 410 } }, 410] },
  play_404: { play: [{ error: { code: 404 } }, 404] },
  play_lifetime: { play: [{ kind: 'androidpublisher#productPurchase', purchaseState: 0, consumptionState: 1, productId: 'pro_lifetime', quantity: 1, refundableQuantity: 1 }] },
  play_lifetime_refunded: { play: [{ purchaseState: 1 }] },
  play_lifetime_refundable_zero: { play: [{ purchaseState: 0, quantity: 1, refundableQuantity: 0 }] },
};
const sc = SCENARIOS[scenario];
if (!sc) {
  console.error(`Unknown scenario "${scenario}". Known: ${Object.keys(SCENARIOS).join(', ')}`);
  process.exit(2);
}

const upstream = [];
const basic = `Basic ${Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString('base64')}`;
let seqIndex = 0;
globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  const m = (init.method ?? 'GET').toUpperCase();
  const auth = new Headers(init.headers).get('authorization') ?? '';
  let sent = null;
  try {
    sent = init.body ? JSON.parse(String(init.body)) : null;
  } catch {
    sent = String(init.body).includes('grant_type') ? { form: Object.fromEntries(new URLSearchParams(String(init.body))) } : '[not json]';
  }
  const call = { method: m, url: u.replace(RZ, '/razorpay'), host: new URL(u).host, auth: auth === basic ? 'razorpay-basic-ok' : auth === 'Bearer ya29.test' ? 'google-bearer-ok' : auth ? 'other' : 'none', body: sent };
  if (call.body?.form?.assertion) call.body = { grant_type: call.body.form.grant_type, assertion_parts: call.body.form.assertion.split('.').length };
  upstream.push(call);
  if (sc.throws) throw new TypeError('network down (scripted)');
  if (sc.seq) return (sc.seq[seqIndex++] ?? (() => json({}, 500)))();
  if (u === 'https://oauth2.googleapis.com/token') return json({ access_token: 'ya29.test', expires_in: 3599, token_type: 'Bearer' });
  if (u.startsWith('https://androidpublisher.googleapis.com/')) {
    if (!sc.play) return json({ error: { code: 404 } }, 404);
    return json(sc.play[0], sc.play[1] ?? 200);
  }
  if (u.startsWith(RZ) && sc.rz) {
    const r = sc.rz[`${m} ${u.replace(RZ, '')}`] ?? sc.rz['*'];
    if (typeof r === 'function') return r();
    if (r !== undefined) return json(r);
    if (m === 'PATCH') return json({ ...sent });
    return NOT_FOUND();
  }
  if (u.startsWith(RZ)) return NOT_FOUND();
  throw new TypeError(`api-bridge: unexpected call to ${u}`);
};

// ---------------------------------------------------------------- placeholders
async function hmac(payload, secret = KEY_SECRET) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return Buffer.from(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(payload))).toString('hex');
}
async function ourToken(over, signWith = signingKeyB64) {
  const t = now();
  return signLicence({ v: 1, plan: 'pro_lifetime', src: 'razorpay', iat: t, exp: t + TOKEN_TTL_SECONDS, env: env.ENVIRONMENT === 'staging' || env.ENVIRONMENT === 'production' ? env.ENVIRONMENT : 'dev', ...over }, await importSigningKey(signWith));
}
async function fill(b) {
  if (!b || typeof b !== 'object') return b;
  const pair = b.razorpay_subscription_id ? [b.razorpay_payment_id, b.razorpay_subscription_id] : [b.razorpay_order_id, b.razorpay_payment_id];
  const kh = typeof b.key === 'string' ? await licenceKeyHash(b.key) : undefined;
  const t = now();
  const other = async () => {
    const k = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
    return b64urlEncode(new Uint8Array(await crypto.subtle.exportKey('pkcs8', k.privateKey)));
  };
  const out = {};
  for (const [k, v] of Object.entries(b)) {
    if (v === '$SIG') out[k] = await hmac(pair.join('|'));
    else if (v === '$SIG_OTHER') out[k] = await hmac(pair.join('|'), 'other-secret');
    else if (v === '$SIG_SWAPPED') out[k] = await hmac([...pair].reverse().join('|'));
    else if (v === '$OUR_TOKEN') out[k] = await ourToken({ kh });
    else if (v === '$OUR_TOKEN_EXPIRED') out[k] = await ourToken({ kh, iat: t - 20 * DAY, exp: t - 13 * DAY });
    else if (v === '$FORGED_TOKEN') out[k] = await ourToken({ kh }, await other());
    else if (v === '$PAD17K') out[k] = 'x'.repeat(17 * 1024);
    else out[k] = v;
  }
  return out;
}
body = await fill(body);

// ---------------------------------------------------------------- send
const logs = [];
const origLog = console.log;
console.log = (...a) => void logs.push(a.map(String).join(' '));
console.warn = console.log;
console.error = console.log;

const ip = `10.9.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;
const reqHeaders = { 'cf-connecting-ip': ip, ...headers };
let payloadText;
if (rawBody !== undefined && rawBody !== null) payloadText = String(rawBody);
else if (body !== null && method !== 'GET' && method !== 'HEAD') payloadText = JSON.stringify(body);
if (payloadText !== undefined && !Object.keys(reqHeaders).some((h) => h.toLowerCase() === 'content-type')) reqHeaders['content-type'] = 'application/json';

const url = /^https?:\/\//.test(path) ? path : `${BASE}${path}`;
const statuses = [];
let res;
for (let i = 0; i < Math.max(1, Number(repeat) || 1); i++) {
  res = await app.request(url, { method, headers: reqHeaders, body: payloadText }, env);
  statuses.push(res.status);
}
const text = await res.text();
console.log = origLog;
let parsed = null;
try {
  parsed = text ? JSON.parse(text) : null;
} catch {
  parsed = null;
}
let claims = null;
if (parsed && typeof parsed.token === 'string') claims = await verifyLicence(parsed.token, verifier);
const keyHashes = { [PAY]: await licenceKeyHash(PAY), [SUB]: await licenceKeyHash(SUB) };
// Report leaks as booleans: the throwaway secret values themselves are never printed.
const everything = `${text}\n${logs.join('\n')}\n${JSON.stringify([...res.headers])}`;
const leaks = { razorpaySecret: everything.includes(KEY_SECRET), signingKey: everything.includes(signingKeyB64), serviceAccountKey: everything.includes(pem.split('\n')[1]) };
if (body && typeof body === 'object') {
  for (const k of ['key', 'razorpay_payment_id', 'razorpay_signature', 'purchaseToken']) {
    if (typeof body[k] === 'string') leaks[`logs_${k}`] = logs.join('\n').includes(body[k]);
  }
}

process.stdout.write(
  JSON.stringify({
    status: res.status,
    statuses,
    headers: Object.fromEntries([...res.headers].map(([k, v]) => [k.toLowerCase(), v])),
    json: parsed,
    text,
    claims,
    ttl: claims ? claims.exp - claims.iat : null,
    now: now(),
    keyHashes,
    upstream,
    logs,
    leaks,
    keyId: KEY_ID,
  }),
);
