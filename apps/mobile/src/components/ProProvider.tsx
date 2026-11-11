import * as SecureStore from 'expo-secure-store';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import type { ProPlan } from '@finealth/shared-types';
import type { Purchase } from 'expo-iap';
import { acknowledge, buy as playBuy, isOursPending, listen, owned, toSource } from '@/lib/billing';
import { config } from '@/lib/config';
import { activate, clearStoredPro, resolvePro, type AsyncKV, type ProDeps, type ProSource, type ProStatus } from '@/lib/pro';
import { adsAllowedFor, handlePurchase as handle, purchasesToSync, restoreMessage, type HandleResult, type PurchaseDeps } from '@/lib/purchases';

/** Licence record in the Android Keystore (encrypted), never in plain AsyncStorage. */
const kv: AsyncKV = {
  getItem: (k) => SecureStore.getItemAsync(k),
  setItem: (k, v) => SecureStore.setItemAsync(k, v),
  removeItem: (k) => SecureStore.deleteItemAsync(k),
};
const deps = (): ProDeps => ({ kv, publicKey: config.licencePublicKey, apiBase: config.apiBase, env: config.env });
const RETRY_MS = 60_000;
/** Quiet purchase sync on return to the app, at most this often. */
const SYNC_EVERY_MS = 5 * 60_000;
const purchaseDeps: PurchaseDeps<Purchase> = { toSource, activate: (src) => activate(deps(), src), acknowledge };
/** False in a build without the licence public key: buying would charge and never unlock, so Buy is hidden. */
export const PRO_AVAILABLE = !!config.licencePublicKey;

interface ProContext {
  status: ProStatus;
  isPro: boolean;
  /** No ads while checking, while Pro, and while a stored licence is unconfirmed (offline). */
  adsAllowed: boolean;
  busy: boolean;
  /** This build can verify Pro (has the licence public key). */
  available: boolean;
  message: string | null;
  clearMessage: () => void;
  buy: (plan: ProPlan) => Promise<void>;
  restore: () => Promise<void>;
  activateKey: (key: string) => Promise<boolean>;
  remove: () => Promise<void>;
}

const Ctx = createContext<ProContext | null>(null);

export function ProProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ProStatus>({ state: 'checking' });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const statusRef = useRef<ProStatus>(status);
  const lastSync = useRef(0);
  // Every read or write of the stored licence runs one after another, so a refresh, a purchase and "Remove Pro"
  // can never overwrite each other; `gen` drops the answer of anything that was overtaken.
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const gen = useRef(0);
  const serial = useCallback(<T,>(job: () => Promise<T>): Promise<T> => {
    const run = queue.current.then(job, job);
    queue.current = run.catch(() => undefined);
    return run;
  }, []);
  const show = useCallback((s: ProStatus) => {
    statusRef.current = s;
    setStatus(s);
  }, []);
  const recheck = useRef<() => void>(() => undefined);

  const check = useCallback(() => {
    const g = ++gen.current;
    serial(() => resolvePro(deps()))
      .then((s) => {
        if (g !== gen.current) return;
        show(s);
        clearTimeout(timer.current);
        if (s.state === 'pro') timer.current = setTimeout(() => recheck.current(), Math.min(Math.max(1000, s.claims.exp * 1000 - Date.now() + 1000), 2 ** 31 - 1));
        else if (s.state === 'free' && s.unconfirmed) timer.current = setTimeout(() => recheck.current(), RETRY_MS);
        if (s.state === 'free' && s.notice) setMessage(s.notice);
      })
      .catch(() => g === gen.current && show({ state: 'free' }));
  }, [serial, show]);

  /** A Play purchase: verify on the server, store the signed token, then acknowledge it with Google. */
  const handlePurchase = useCallback(
    async (p: Purchase, quiet = false): Promise<HandleResult> => {
      if (isOursPending(p)) {
        const pending = 'Your payment is pending with Google Play. Pro unlocks as soon as it completes.';
        if (!quiet) setMessage(pending);
        return { ours: true, result: { ok: false, message: pending, code: 'pending' }, acknowledged: false };
      }
      const r = await serial(() => handle(p, purchaseDeps));
      if (r.ours && r.result.ok) {
        gen.current++;
        show(r.result.status);
        recheck.current(); // sets the refresh timer for the new token (no network: the token is fresh)
        if (!quiet) setMessage('Pro is active. Thank you for supporting Finealth.');
      } else if (r.ours && !r.result.ok && !quiet) {
        // Not acknowledged: retried at the next sync, and Google refunds it after 3 days if it never verifies.
        setMessage(r.result.message);
      }
      return r;
    },
    [serial, show]
  );

  /**
   * Quiet sync with Google Play at start and on return to the app: finishes interrupted purchases, retries a failed
   * acknowledgement, and brings Pro back for a subscription that is active again after a hold or a reinstall.
   */
  const sync = useCallback(
    async (force = false) => {
      if (!PRO_AVAILABLE || (!force && Date.now() - lastSync.current < SYNC_EVERY_MS)) return;
      lastSync.current = Date.now();
      const list = purchasesToSync(await owned(), statusRef.current);
      for (const p of list) {
        const r = await handlePurchase(p, true);
        if (r.ours && r.result.ok) break;
      }
    },
    [handlePurchase]
  );

  useEffect(() => {
    recheck.current = check;
    check();
    // After the first licence check has run, so the sync knows whether Pro is already active here.
    void serial(async () => undefined).then(() => sync(true));
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') return;
      check();
      void serial(async () => undefined).then(() => sync());
    });
    const stop = listen(
      (p) => {
        setBusy(true);
        handlePurchase(p).finally(() => setBusy(false));
      },
      (msg) => {
        setBusy(false);
        if (msg) setMessage(msg);
      }
    );
    return () => {
      sub.remove();
      stop();
      clearTimeout(timer.current);
    };
  }, [check, handlePurchase, serial, sync]);

  const value = useMemo<ProContext>(
    () => ({
      status,
      isPro: status.state === 'pro',
      adsAllowed: adsAllowedFor(status),
      busy,
      available: PRO_AVAILABLE,
      message,
      clearMessage: () => setMessage(null),
      buy: async (plan) => {
        setMessage(null);
        if (!PRO_AVAILABLE) return setMessage('Pro is not available in this build.');
        setBusy(true);
        const r = await playBuy(plan);
        if (!r.ok) {
          setBusy(false);
          setMessage(r.message);
        }
        // On success the sheet is open; the listener finishes the flow.
      },
      restore: async () => {
        setMessage(null);
        if (!PRO_AVAILABLE) return setMessage('Pro is not available in this build.');
        setBusy(true);
        try {
          const results: HandleResult[] = [];
          for (const p of await owned()) {
            const r = await handlePurchase(p, true);
            results.push(r);
            if (r.ours && r.result.ok) break;
          }
          setMessage(restoreMessage(results));
        } finally {
          setBusy(false);
        }
      },
      activateKey: async (key) => {
        setMessage(null);
        setBusy(true);
        try {
          const source: ProSource = { src: 'razorpay', key };
          const r = await serial(() => activate(deps(), source));
          if (r.ok) {
            gen.current++;
            show(r.status);
            recheck.current();
            setMessage('Pro is active on this phone.');
            return true;
          }
          setMessage(r.message);
          return false;
        } finally {
          setBusy(false);
        }
      },
      remove: async () => {
        gen.current++;
        await serial(() => clearStoredPro(kv));
        show({ state: 'free' });
      },
    }),
    [status, busy, message, handlePurchase, serial, show]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePro(): ProContext {
  const c = useContext(Ctx);
  if (!c) throw new Error('usePro outside ProProvider');
  return c;
}
