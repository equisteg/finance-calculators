import * as SecureStore from 'expo-secure-store';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import type { ProPlan } from '@finealth/shared-types';
import type { Purchase } from 'expo-iap';
import { acknowledge, buy as playBuy, listen, owned, toSource } from '@/lib/billing';
import { config } from '@/lib/config';
import { activate, clearStoredPro, resolvePro, type AsyncKV, type ProDeps, type ProSource, type ProStatus } from '@/lib/pro';

/** Licence record in the Android Keystore (encrypted), never in plain AsyncStorage. */
const kv: AsyncKV = {
  getItem: (k) => SecureStore.getItemAsync(k),
  setItem: (k, v) => SecureStore.setItemAsync(k, v),
  removeItem: (k) => SecureStore.deleteItemAsync(k),
};
const deps = (): ProDeps => ({ kv, publicKey: config.licencePublicKey, apiBase: config.apiBase, env: config.env });
const RETRY_MS = 60_000;

interface ProContext {
  status: ProStatus;
  isPro: boolean;
  /** No ads while checking, while Pro, and while a stored licence is unconfirmed (offline). */
  adsAllowed: boolean;
  busy: boolean;
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
  const recheck = useRef<() => void>(() => undefined);

  const check = useCallback(() => {
    resolvePro(deps())
      .then((s) => {
        setStatus(s);
        clearTimeout(timer.current);
        if (s.state === 'pro') timer.current = setTimeout(() => recheck.current(), Math.min(Math.max(1000, s.claims.exp * 1000 - Date.now() + 1000), 2 ** 31 - 1));
        else if (s.state === 'free' && s.unconfirmed) timer.current = setTimeout(() => recheck.current(), RETRY_MS);
        if (s.state === 'free' && s.notice) setMessage(s.notice);
      })
      .catch(() => setStatus({ state: 'free' }));
  }, []);

  /** A Play purchase: verify on the server, store the signed token, then acknowledge it with Google. */
  const handlePurchase = useCallback(async (p: Purchase, quiet = false) => {
    const source = toSource(p);
    if (!source) return false;
    const r = await activate(deps(), source);
    if (r.ok) {
      setStatus(r.status);
      await acknowledge(p);
      if (!quiet) setMessage('Pro is active. Thank you for supporting Finealth.');
      return true;
    }
    // Not acknowledged: the app retries on the next start and Google refunds it after 3 days if it never verifies.
    if (!quiet) setMessage(r.message);
    return false;
  }, []);

  useEffect(() => {
    recheck.current = check;
    check();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && check());
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
    // Finish a purchase interrupted earlier (app closed, network dropped before the server check).
    owned().then(async (list) => {
      for (const p of list) if (!(p as { isAcknowledgedAndroid?: boolean | null }).isAcknowledgedAndroid) await handlePurchase(p, true);
    });
    return () => {
      sub.remove();
      stop();
      clearTimeout(timer.current);
    };
  }, [check, handlePurchase]);

  const value = useMemo<ProContext>(
    () => ({
      status,
      isPro: status.state === 'pro',
      adsAllowed: status.state === 'free' && !status.unconfirmed,
      busy,
      message,
      clearMessage: () => setMessage(null),
      buy: async (plan) => {
        setMessage(null);
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
        setBusy(true);
        try {
          const list = await owned();
          let ok = false;
          for (const p of list) if (!ok) ok = await handlePurchase(p, true);
          setMessage(ok ? 'Pro restored from your Google Play purchase.' : 'No Finealth Pro purchase was found for this Google account.');
        } finally {
          setBusy(false);
        }
      },
      activateKey: async (key) => {
        setMessage(null);
        setBusy(true);
        try {
          const source: ProSource = { src: 'razorpay', key };
          const r = await activate(deps(), source);
          if (r.ok) {
            setStatus(r.status);
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
        await clearStoredPro(kv);
        setStatus({ state: 'free' });
      },
    }),
    [status, busy, message, handlePurchase]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePro(): ProContext {
  const c = useContext(Ctx);
  if (!c) throw new Error('usePro outside ProProvider');
  return c;
}
