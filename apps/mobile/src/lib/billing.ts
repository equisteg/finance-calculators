import {
  endConnection,
  fetchProducts,
  finishTransaction,
  getAvailablePurchases,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
  type Purchase,
} from 'expo-iap';
import type { ProPlan } from '@finealth/shared-types';
import { PLAY } from './config';
import type { PlaySource } from './pro';
import { pickBaseOffer } from './purchases';

/**
 * Google Play Billing (expo-iap). The store result is never trusted by itself: every purchase token goes to apps/api,
 * which asks Google Play, and Pro is granted only by the signed token it returns (lib/pro.ts).
 * A purchase is acknowledged (finishTransaction) only after that check passes; Google refunds a purchase that is
 * never acknowledged within 3 days, so a buyer is never charged for Pro they did not get.
 */

export interface PlayPrice {
  plan: ProPlan;
  price: string;
}

let connected: Promise<boolean> | null = null;
export function connect(): Promise<boolean> {
  connected ??= initConnection()
    .then(() => true)
    .catch(() => {
      connected = null;
      return false;
    });
  return connected;
}
export async function disconnect() {
  connected = null;
  await endConnection().catch(() => undefined);
}

interface SubOffer {
  basePlanIdAndroid?: string | null;
  offerTokenAndroid?: string | null;
  pricingPhasesAndroid?: { pricingPhaseList: unknown[] } | null;
  displayPrice: string;
  id: string;
}
let offerTokens: Partial<Record<ProPlan, string>> = {};

/** Real store prices for this account's country; empty when Play is unreachable (then the app shows the list prices). */
export async function loadPrices(): Promise<PlayPrice[]> {
  if (!(await connect())) return [];
  const out: PlayPrice[] = [];
  try {
    const subs = ((await fetchProducts({ skus: [PLAY.subscriptionId], type: 'subs' })) ?? []) as { id: string; subscriptionOffers?: SubOffer[] }[];
    const offers = subs.find((s) => s.id === PLAY.subscriptionId)?.subscriptionOffers ?? [];
    offerTokens = {};
    for (const plan of ['pro_monthly', 'pro_yearly'] as const) {
      const base = pickBaseOffer(offers, PLAY.basePlans[plan]);
      if (base?.offerTokenAndroid) {
        offerTokens[plan] = base.offerTokenAndroid;
        out.push({ plan, price: base.displayPrice });
      }
    }
    const one = ((await fetchProducts({ skus: [PLAY.lifetimeProductId], type: 'in-app' })) ?? []) as { id: string; displayPrice: string }[];
    const life = one.find((p) => p.id === PLAY.lifetimeProductId);
    if (life) out.push({ plan: 'pro_lifetime', price: life.displayPrice });
  } catch {
    /* Play unavailable (no Play account, emulator without Play): buying shows a message */
  }
  return out;
}

/** Opens the Play purchase sheet. The result arrives through onPurchase (listen). */
export async function buy(plan: ProPlan): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!(await connect())) return { ok: false, message: 'Google Play is not available on this device.' };
  try {
    if (plan === 'pro_lifetime') {
      await requestPurchase({ type: 'in-app', request: { google: { skus: [PLAY.lifetimeProductId] } } });
    } else {
      // Tapped before the prices arrived: fetch them now rather than say the plan is missing.
      if (!offerTokens[plan]) await loadPrices();
      const offerToken = offerTokens[plan];
      if (!offerToken) return { ok: false, message: 'This plan is not available in your country yet.' };
      await requestPurchase({ type: 'subs', request: { google: { skus: [PLAY.subscriptionId], subscriptionOffers: [{ sku: PLAY.subscriptionId, offerToken }] } } });
    }
    return { ok: true };
  } catch {
    return { ok: false, message: 'The purchase could not be started. Please try again.' };
  }
}

/** Our Play products only; the token shape is checked again by lib/pro.ts and by the API. */
export function toSource(p: Purchase): PlaySource | null {
  if (p.purchaseState !== 'purchased' || !p.purchaseToken) return null;
  if (p.productId === PLAY.subscriptionId) return { src: 'play', kind: 'subscription', productId: p.productId, purchaseToken: p.purchaseToken };
  if (p.productId === PLAY.lifetimeProductId) return { src: 'play', kind: 'product', productId: p.productId, purchaseToken: p.purchaseToken };
  return null;
}

/** Acknowledge after the server check passed. Never consumed: Pro is not a consumable. */
export async function acknowledge(p: Purchase): Promise<boolean> {
  return finishTransaction({ purchase: p, isConsumable: false })
    .then(() => true)
    .catch(() => false); // retried on the next sync (start or return to the app)
}

/** Pending payments (cash, slow card): Pro unlocks when Google reports them complete. */
export const isOursPending = (p: Purchase) =>
  p.purchaseState === 'pending' && (p.productId === PLAY.subscriptionId || p.productId === PLAY.lifetimeProductId);

/** Purchases this Google account owns (for "Restore purchases" and to finish purchases interrupted earlier). */
export async function owned(): Promise<Purchase[]> {
  if (!(await connect())) return [];
  try {
    return (await getAvailablePurchases()) ?? [];
  } catch {
    return [];
  }
}

export function listen(onPurchase: (p: Purchase) => void, onError: (message: string, cancelled: boolean) => void) {
  const a = purchaseUpdatedListener(onPurchase);
  const b = purchaseErrorListener((e) => {
    const code = String((e as { code?: unknown }).code ?? '');
    const cancelled = /cancel/i.test(code);
    onError(cancelled ? '' : 'The purchase did not complete. If Google Play charged you, tap Restore purchases.', cancelled);
  });
  return () => {
    a.remove();
    b.remove();
  };
}
