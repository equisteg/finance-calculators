import type { KV, ProStatus, ResolveDeps, WebPlan } from './pro';
import { apiMessage, isPlausibleKey, storeVerifiedToken } from './pro';

/**
 * Buying Pro on the web with Razorpay Standard Checkout, without accounts or a database:
 * 1. POST /api/v1/checkout → apps/api creates a Razorpay order (Lifetime) or subscription (Yearly) and returns its id.
 * 2. checkout.js is loaded only now (never on page load, never for analytics) and opens Razorpay's own modal.
 *    Razorpay collects the buyer's email/phone and card/UPI details; we never prefill or see them.
 * 3. On success, the handler's ids + signature go to /api/v1/checkout/confirm, which verifies the signature with
 *    Razorpay and returns a signed Pro token. The token is verified here before anything is stored.
 * A paid purchase is never lost: the handler's ids are saved (PENDING_KEY) BEFORE confirm is called, and retried
 * silently on the next page loads until confirm answers for good; the buyer is also shown the id to paste on /pro.
 */
export type Currency = 'INR' | 'USD';

export interface RazorpayResponse {
  razorpay_payment_id?: string;
  razorpay_order_id?: string;
  razorpay_subscription_id?: string;
  razorpay_signature?: string;
}

export interface RazorpayOptions {
  key: string;
  order_id?: string;
  subscription_id?: string;
  amount?: number;
  currency?: string;
  name: string;
  description: string;
  theme: { color: string };
  handler: (resp: RazorpayResponse) => void;
  modal: { ondismiss: () => void };
}

export type RazorpayCtor = new (opts: RazorpayOptions) => { open(): void };

export type CheckoutResult =
  | { kind: 'success'; key: string; plan: WebPlan; status: ProStatus }
  | { kind: 'dismissed' }
  /** Nothing was charged (or we cannot tell that anything was): show the message. */
  | { kind: 'error'; message: string }
  /** Paid, but Pro could not be switched on yet: show the id to paste on /pro. */
  | { kind: 'recover'; id: string; pending: boolean; message: string };

export interface CheckoutDeps extends ResolveDeps {
  /** Loads checkout.js and returns window.Razorpay (null when it cannot be loaded). */
  loadScript: () => Promise<RazorpayCtor | null>;
}

interface StartBody {
  provider?: unknown;
  keyId?: unknown;
  amount?: unknown;
  currency?: unknown;
  orderId?: unknown;
  subscriptionId?: unknown;
  name?: unknown;
  description?: unknown;
  error?: { code?: unknown; message?: unknown };
}

const START_MESSAGES: Record<string, string> = {
  invalid_request: 'Checkout could not start. Please refresh the page and try again.',
  rate_limited: 'Too many attempts. Please wait a minute and try again.',
  unavailable: 'Checkout is unavailable right now. Please try again shortly.',
  network: 'Could not reach checkout. Check your connection and try again.',
};

const str = (v: unknown, max = 200) => (typeof v === 'string' && v.length > 0 && v.length <= max ? v : '');
const ID_RE = /^(pay|sub|order)_[A-Za-z0-9]{8,40}$/;
const id = (v: unknown) => (typeof v === 'string' && ID_RE.test(v) ? v : '');

async function post(deps: ResolveDeps, path: string, body: unknown): Promise<{ status: number; json: Record<string, unknown> } | null> {
  try {
    const res = await (deps.fetchImpl ?? fetch)(`${deps.apiBase}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    let json: Record<string, unknown> = {};
    try {
      json = ((await res.json()) ?? {}) as Record<string, unknown>;
    } catch {
      /* non-JSON (proxy error page) */
    }
    return { status: res.status, json };
  } catch {
    return null;
  }
}

/** Server error → user message. Our own API's message is shown for "unavailable" (e.g. "International payments are not enabled yet."). */
function startError(status: number, body: StartBody): string {
  const code = str(body.error?.code, 40) || (status === 429 ? 'rate_limited' : status === 400 ? 'invalid_request' : 'unavailable');
  if (code === 'unavailable' && str(body.error?.message)) return str(body.error?.message);
  return START_MESSAGES[code] ?? START_MESSAGES.unavailable!;
}

/** The id that restores Pro on /pro: the subscription id for Yearly, the payment id for Lifetime. */
const licenceId = (r: RazorpayResponse) => id(r.razorpay_subscription_id) || id(r.razorpay_payment_id);

/**
 * A paid-but-not-yet-confirmed checkout, kept in this browser until /checkout/confirm answers for good.
 * Holds only Razorpay ids and the Checkout signature (no personal data); the signature is useless without our secret.
 */
export interface PendingConfirm {
  pendingId: string;
  orderId?: string;
  subscriptionId?: string;
  signature: string;
  plan?: WebPlan;
}
export const PENDING_KEY = 'finealth.pending.v1';

export function readPending(kv: KV | null): PendingConfirm | null {
  try {
    const raw = kv?.getItem(PENDING_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as Record<string, unknown>;
    const pendingId = id(o.pendingId);
    const orderId = id(o.orderId);
    const subscriptionId = id(o.subscriptionId);
    const signature = str(o.signature, 200);
    if (!pendingId.startsWith('pay_') || !signature || (!orderId === !subscriptionId)) return null;
    const plan = o.plan === 'pro_yearly' || o.plan === 'pro_lifetime' ? (o.plan as WebPlan) : undefined;
    return { pendingId, ...(orderId ? { orderId } : { subscriptionId }), signature, ...(plan ? { plan } : {}) };
  } catch {
    return null;
  }
}

function writePending(kv: KV | null, p: PendingConfirm): void {
  try {
    kv?.setItem(PENDING_KEY, JSON.stringify(p));
  } catch {
    /* storage blocked: the on-screen id is the fallback */
  }
}

export function clearPending(kv: KV | null): void {
  try {
    kv?.removeItem(PENDING_KEY);
  } catch {
    /* ignore */
  }
}

const toResponse = (p: PendingConfirm): RazorpayResponse => ({
  razorpay_payment_id: p.pendingId,
  razorpay_signature: p.signature,
  ...(p.orderId ? { razorpay_order_id: p.orderId } : { razorpay_subscription_id: p.subscriptionId }),
});

/** The id the buyer keeps for a pending confirm (shown on /pro). */
export const pendingLicenceId = (p: PendingConfirm) => p.subscriptionId ?? p.pendingId;

/** 403 answers from confirm that are final and have their own message (not the "paste this ID" recovery). */
const FINAL_403 = ['refunded', 'expired', 'too_many_activations'] as const;

export async function confirmPayment(resp: RazorpayResponse, deps: ResolveDeps, plan?: WebPlan): Promise<CheckoutResult> {
  const restoreId = licenceId(resp);
  const pendingId = id(resp.razorpay_payment_id);
  const signature = str(resp.razorpay_signature, 200);
  // Saved BEFORE the network call: a closed tab or a failed request can be retried on the next visit.
  if (pendingId && signature && (id(resp.razorpay_order_id) || id(resp.razorpay_subscription_id))) {
    writePending(deps.kv, {
      pendingId,
      ...(resp.razorpay_order_id ? { orderId: id(resp.razorpay_order_id) } : { subscriptionId: id(resp.razorpay_subscription_id) }),
      signature,
      ...(plan ? { plan } : {}),
    });
  }
  const recover = (pending: boolean): CheckoutResult => ({
    kind: 'recover',
    id: restoreId,
    pending,
    message: pending
      ? 'Your payment is processing. Open the Restore Pro page later and paste this ID to switch Pro on.'
      : 'Your payment went through, but we could not switch Pro on just now. Open the Restore Pro page and paste this ID to finish. Nothing is lost.',
  });
  const body: RazorpayResponse = { razorpay_payment_id: resp.razorpay_payment_id, razorpay_signature: resp.razorpay_signature };
  if (resp.razorpay_order_id) body.razorpay_order_id = resp.razorpay_order_id;
  if (resp.razorpay_subscription_id) body.razorpay_subscription_id = resp.razorpay_subscription_id;

  const res = await post(deps, '/api/v1/checkout/confirm', body);
  if (!res) return recover(false);
  const b = res.json as { token?: unknown; key?: unknown; error?: { code?: unknown } };
  if (res.status === 200 && typeof b.token === 'string') {
    const key = typeof b.key === 'string' && isPlausibleKey(b.key) ? b.key : restoreId;
    if (!key) return recover(false);
    const stored = await storeVerifiedToken(key, b.token, deps);
    // A token we cannot verify never grants Pro; the buyer can still restore with the id.
    if (!stored.ok) return recover(false);
    clearPending(deps.kv);
    return { kind: 'success', key, plan: stored.status.plan, status: stored.status };
  }
  const code = str(b.error?.code, 40);
  if (code === 'pending' || res.status === 409) return recover(true);
  const final403 = FINAL_403.find((c) => c === code);
  if (res.status === 403 && final403) {
    clearPending(deps.kv);
    return { kind: 'error', message: `${apiMessage(final403)}${restoreId ? ` Payment reference: ${restoreId}.` : ''}` };
  }
  if (code === 'invalid_payment' || res.status === 400) {
    clearPending(deps.kv);
    return {
      kind: 'error',
      message: `We could not confirm this payment, so Pro was not switched on.${restoreId ? ` If money was taken, email us this ID: ${restoreId}.` : ''}`,
    };
  }
  return recover(false);
}

/** Starts checkout for a web plan. Resolves once the buyer pays (and we confirm), closes the modal, or something fails. */
export async function startCheckout(plan: WebPlan, currency: Currency, deps: CheckoutDeps): Promise<CheckoutResult> {
  if (!deps.publicKey && !deps.verifyKey) return { kind: 'error', message: 'Buying Pro is not available on this site yet.' };
  const res = await post(deps, '/api/v1/checkout', { plan, currency });
  if (!res) return { kind: 'error', message: START_MESSAGES.network! };
  const b = res.json as StartBody;
  const keyId = str(b.keyId, 100);
  const orderId = id(b.orderId);
  const subscriptionId = id(b.subscriptionId);
  if (res.status !== 200 || b.provider !== 'razorpay' || !keyId || (!orderId && !subscriptionId)) return { kind: 'error', message: startError(res.status, b) };

  const Razorpay = await deps.loadScript().catch(() => null);
  if (!Razorpay) return { kind: 'error', message: 'The secure Razorpay checkout could not load. Check your connection (or any blocker that stops checkout.razorpay.com) and try again.' };

  return new Promise<CheckoutResult>((resolve) => {
    let settled = false;
    const opts: RazorpayOptions = {
      key: keyId,
      name: str(b.name, 100) || 'Finealth',
      description: str(b.description) || 'Finealth Pro',
      currency: str(b.currency, 3) || currency,
      theme: { color: '#2453FF' },
      handler: (resp) => {
        if (settled) return;
        settled = true;
        confirmPayment(resp ?? {}, deps, plan).then(resolve, () => resolve({ kind: 'error', message: START_MESSAGES.unavailable! }));
      },
      modal: {
        ondismiss: () => {
          if (settled) return;
          settled = true;
          resolve({ kind: 'dismissed' });
        },
      },
    };
    if (orderId) {
      opts.order_id = orderId;
      if (typeof b.amount === 'number' && Number.isInteger(b.amount) && b.amount > 0) opts.amount = b.amount;
    } else {
      opts.subscription_id = subscriptionId;
    }
    try {
      new Razorpay(opts).open();
    } catch {
      settled = true;
      resolve({ kind: 'error', message: 'The secure Razorpay checkout could not open. Please try again.' });
    }
  });
}

export interface RetryOptions {
  /** Waits before each attempt, in ms (default: 0, 5 s, 20 s — at most three tries per page load). */
  delays?: number[];
  sleep?: (ms: number) => Promise<void>;
  /** Stop early (component unmounted). */
  cancelled?: () => boolean;
}

/**
 * Page load: if a paid checkout was never confirmed, retry /checkout/confirm silently with backoff. Clears the record on
 * success or on a final answer; keeps it after temporary failures (next page load tries again).
 * Returns the last result, or null when nothing was pending.
 */
export async function retryPendingConfirm(deps: ResolveDeps, opts: RetryOptions = {}): Promise<CheckoutResult | null> {
  const p = readPending(deps.kv);
  if (!p) return null;
  const delays = opts.delays ?? [0, 5000, 20000];
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  let last: CheckoutResult | null = null;
  for (const ms of delays) {
    if (ms > 0) await sleep(ms);
    if (opts.cancelled?.() || !readPending(deps.kv)) return last;
    last = await confirmPayment(toResponse(p), deps, p.plan);
    if (last.kind !== 'recover') return last; // success or final error: confirmPayment cleared the record
  }
  return last;
}

export const RAZORPAY_SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js';
let loading: Promise<RazorpayCtor | null> | null = null;

/** Adds checkout.js once, on demand. A failed load is retried on the next click. */
export function loadRazorpayScript(): Promise<RazorpayCtor | null> {
  const w = window as unknown as { Razorpay?: RazorpayCtor };
  if (w.Razorpay) return Promise.resolve(w.Razorpay);
  if (loading) return loading;
  loading = new Promise<RazorpayCtor | null>((resolve) => {
    const s = document.createElement('script');
    s.src = RAZORPAY_SCRIPT;
    s.async = true;
    s.onload = () => resolve(w.Razorpay ?? null);
    s.onerror = () => {
      s.remove();
      resolve(null);
    };
    document.head.appendChild(s);
  }).then((r) => {
    if (!r) loading = null;
    return r;
  });
  return loading;
}
