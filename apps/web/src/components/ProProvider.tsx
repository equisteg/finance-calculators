'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { config } from '@/lib/config';
import { loadRazorpayScript, pendingLicenceId, readPending, retryPendingConfirm, startCheckout, type CheckoutResult, type Currency } from '@/lib/checkout';
import { activatePro, clearStoredPro, readStoredPro, resolvePro, UNCONFIRMED_MESSAGE, type KV, type ProStatus, type WebPlan } from '@/lib/pro';

interface ProContext {
  status: ProStatus;
  isPro: boolean;
  /** A licence record exists in this browser (used only to avoid reserving ad space while checking — never to grant Pro). */
  hasStored: boolean;
  dismissNotice: () => void;
  activate: (key: string) => Promise<{ ok: true } | { ok: false; message: string }>;
  /** Buy a web plan with Razorpay Checkout (loads checkout.js only now). */
  buy: (plan: WebPlan, currency: Currency) => Promise<CheckoutResult>;
  remove: () => void;
  /** Id of a paid checkout still being confirmed in the background (shown on /pro), or null. */
  pendingId: string | null;
}

const Ctx = createContext<ProContext | null>(null);

const kv = (): KV | null => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const deps = () => ({ kv: kv(), publicKey: config.licencePublicKey, apiBase: config.apiBase, env: config.env });
/** Retry an unconfirmed licence (outage / offline) after this long. */
const UNCONFIRMED_RETRY_MS = 60_000;
const pendingNow = () => {
  const p = readPending(kv());
  return p ? pendingLicenceId(p) : null;
};

export function ProProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ProStatus>({ state: 'checking' });
  const [hasStored, setHasStored] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  // Check on load, again when the tab becomes visible, and when the token expires — so refunds and expiry
  // also take effect in tabs that stay open for days.
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const check = () => {
      setHasStored(!!readStoredPro(kv()));
      resolvePro(deps())
        .then((s) => {
          if (!alive) return;
          setStatus(s);
          clearTimeout(timer);
          if (s.state === 'pro') {
            // setTimeout caps at ~24.8 days; tokens last ≤ 7 days.
            const ms = Math.max(1000, s.claims.exp * 1000 - Date.now() + 1000);
            timer = setTimeout(check, Math.min(ms, 2 ** 31 - 1));
          } else if (s.state === 'free' && s.unconfirmed) {
            timer = setTimeout(check, UNCONFIRMED_RETRY_MS);
          }
        })
        .catch(() => alive && setStatus({ state: 'free' }));
    };
    const onVisible = () => document.visibilityState === 'visible' && check();
    check();
    // A checkout that was paid but never confirmed (tab closed, network dropped): finish it silently.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync with storage on mount and on tab focus
    setPendingId(pendingNow());
    retryPendingConfirm(deps(), { cancelled: () => !alive })
      .then((r) => {
        if (!alive || !r) return;
        setPendingId(pendingNow());
        if (r.kind === 'success') {
          setStatus(r.status);
          setHasStored(true);
        }
      })
      .catch(() => undefined);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const activate = useCallback(async (key: string) => {
    const r = await activatePro(key, deps());
    if (!r.ok) return r;
    setStatus(r.status);
    setHasStored(true);
    return { ok: true as const };
  }, []);

  const buy = useCallback(async (plan: WebPlan, currency: Currency) => {
    const r = await startCheckout(plan, currency, { ...deps(), loadScript: loadRazorpayScript });
    if (r.kind === 'success') {
      setStatus(r.status);
      setHasStored(true);
    }
    setPendingId(pendingNow());
    return r;
  }, []);

  const remove = useCallback(() => {
    clearStoredPro(kv());
    setHasStored(false);
    setStatus({ state: 'free' });
  }, []);

  const dismissNotice = useCallback(() => setStatus((s) => (s.state === 'free' ? { state: 'free' } : s)), []);

  const value = useMemo(
    () => ({ status, isPro: status.state === 'pro', hasStored, activate, buy, remove, dismissNotice, pendingId }),
    [status, hasStored, activate, buy, remove, dismissNotice, pendingId],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Outside the provider (unit tests of single components) everything behaves as the free plan. */
const FREE_FALLBACK: ProContext = {
  status: { state: 'free' },
  isPro: false,
  hasStored: false,
  dismissNotice: () => undefined,
  activate: async () => ({ ok: false, message: 'Pro is not available here.' }),
  buy: async () => ({ kind: 'error', message: 'Pro is not available here.' }) as CheckoutResult,
  remove: () => undefined,
  pendingId: null,
};

export function usePro(): ProContext {
  return useContext(Ctx) ?? FREE_FALLBACK;
}

/** Ads may load only for a confirmed free user: never while checking, never with a stored licence, never for Pro. */
export function useAdsAllowed(): boolean {
  const { status, hasStored } = usePro();
  return status.state === 'free' && !status.unconfirmed && !hasStored;
}

/** Calm, dismissible notice when a licence was removed (refund, invalid key, ended subscription), or a quiet one while a stored licence could not be confirmed. */
export function ProNotice() {
  const { status, dismissNotice } = usePro();
  if (status.state === 'free' && status.unconfirmed) {
    return (
      <div className="wrap no-print mt-4" role="status" data-testid="pro-unconfirmed">
        <p className="notice notice-warn m-0 text-sm">{UNCONFIRMED_MESSAGE}</p>
      </div>
    );
  }
  if (status.state !== 'free' || !status.notice) return null;
  return (
    <div className="wrap no-print mt-4" role="status">
      <div className="notice notice-warn flex flex-wrap items-center justify-between gap-3">
        <span>{status.notice} Everything else keeps working as before.</span>
        <button type="button" className="btn btn-secondary btn-sm" onClick={dismissNotice}>
          OK
        </button>
      </div>
    </div>
  );
}
