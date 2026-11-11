/**
 * Decisions about Google Play purchases, kept free of React Native so they can be unit tested.
 * The rule they protect: a purchase is acknowledged only after the server-signed token verifies (lib/pro.ts),
 * so Google refunds anything that never verifies.
 */
import type { ActivateResult, PlaySource, ProSource, ProStatus } from './pro';

/** The bits of an expo-iap Purchase we use. */
export interface PurchaseLike {
  productId: string;
  purchaseToken?: string | null;
  purchaseState: string;
  isAcknowledgedAndroid?: boolean | null;
}

export interface PurchaseDeps<P extends PurchaseLike> {
  toSource: (p: P) => PlaySource | null;
  activate: (source: ProSource) => Promise<ActivateResult>;
  /** Returns false when Google did not take the acknowledgement (retried on the next sync). */
  acknowledge: (p: P) => Promise<boolean>;
}

export type HandleResult = { ours: false } | { ours: true; result: ActivateResult; acknowledged: boolean };

/** Verifies one purchase on the server, then acknowledges it. Never acknowledges a purchase that did not verify. */
export async function handlePurchase<P extends PurchaseLike>(p: P, deps: PurchaseDeps<P>): Promise<HandleResult> {
  const source = deps.toSource(p);
  if (!source) return { ours: false };
  const result = await deps.activate(source);
  if (!result.ok) return { ours: true, result, acknowledged: false };
  const acknowledged = p.isAcknowledgedAndroid ? true : await deps.acknowledge(p);
  return { ours: true, result, acknowledged };
}

/**
 * Which owned purchases to check quietly at start and on every return to the app:
 * - every unacknowledged one (an interrupted purchase, or an acknowledgement that failed);
 * - every one, when this phone has no Pro now (a subscription that came back from hold, a reinstall).
 * Play lists only active subscriptions and owned products, so a lapsed one is not checked again and again.
 */
export function purchasesToSync<P extends PurchaseLike>(owned: P[], status: ProStatus): P[] {
  return status.state === 'pro' ? owned.filter((p) => !p.isAcknowledgedAndroid) : owned;
}

/** What "Restore purchases" tells the buyer: the real reason, not "nothing found", when we found one of ours. */
export function restoreMessage(results: HandleResult[]): string {
  const ours = results.filter((r): r is Extract<HandleResult, { ours: true }> => r.ours);
  if (ours.some((r) => r.result.ok)) return 'Pro restored from your Google Play purchase.';
  if (ours.length === 0) return 'No Finealth Pro purchase was found for this Google account.';
  const last = ours[ours.length - 1].result;
  return last.ok ? 'Pro restored from your Google Play purchase.' : last.message;
}

/** Ads only for a confirmed free user: never while checking, while Pro, or while a stored licence is unconfirmed. */
export const adsAllowedFor = (s: ProStatus) => s.state === 'free' && !s.unconfirmed;

interface SubOfferLike {
  id: string;
  basePlanIdAndroid?: string | null;
  offerTokenAndroid?: string | null;
  pricingPhasesAndroid?: { pricingPhaseList: unknown[] } | null;
}

/**
 * The plain base-plan offer (regular price), never a trial or intro offer added later in Play Console:
 * the displayed price must match plan.ts and apps/api skus.ts. A base plan has no offer id of its own (the library
 * reports the base plan id) and a single pricing phase; a promotional offer has its own id and extra phases.
 */
export function pickBaseOffer<O extends SubOfferLike>(offers: O[], basePlanId: string): O | undefined {
  const forPlan = offers.filter((o) => o.basePlanIdAndroid === basePlanId && o.offerTokenAndroid);
  const phases = (o: O) => o.pricingPhasesAndroid?.pricingPhaseList.length ?? 1;
  return forPlan.find((o) => o.id === basePlanId) ?? forPlan.find((o) => !o.id && phases(o) === 1) ?? forPlan.find((o) => phases(o) === 1);
}
