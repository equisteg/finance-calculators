import { describe, expect, it, vi } from 'vitest';
import { adsAllowedFor, handlePurchase, pickBaseOffer, purchasesToSync, restoreMessage, type PurchaseDeps, type PurchaseLike } from '../src/lib/purchases';
import type { ActivateResult, PlaySource, ProStatus } from '../src/lib/pro';

const claims = { v: 1 as const, plan: 'pro_yearly' as const, src: 'play' as const, iat: 1, exp: 2, env: 'staging' as const };
const PRO: ProStatus = { state: 'pro', claims, plan: 'pro_yearly', src: 'play' };
const OK: ActivateResult = { ok: true, status: { state: 'pro', claims, plan: 'pro_yearly', src: 'play' } };
const buy = (over: Partial<PurchaseLike> = {}): PurchaseLike => ({ productId: 'pro', purchaseToken: 'tok_abcdefghijkl', purchaseState: 'purchased', isAcknowledgedAndroid: false, ...over });
const toSource = (p: PurchaseLike): PlaySource | null =>
  p.productId === 'pro' && p.purchaseState === 'purchased' ? { src: 'play', kind: 'subscription', productId: 'pro', purchaseToken: String(p.purchaseToken) } : null;
const depsWith = (result: ActivateResult, ack = true) => {
  const d = { toSource, activate: vi.fn(async () => result), acknowledge: vi.fn(async () => ack) } satisfies PurchaseDeps<PurchaseLike>;
  return d;
};

// TC-M-PRO-013: Google is told "delivered" only after the server-signed token verified on the phone.
describe('Play purchase handling', () => {
  it('acknowledges after a verified activation', async () => {
    const d = depsWith(OK);
    const r = await handlePurchase(buy(), d);
    expect(r).toMatchObject({ ours: true, acknowledged: true });
    expect(d.acknowledge).toHaveBeenCalledOnce();
  });

  it('never acknowledges when verification fails, so Google refunds it', async () => {
    const d = depsWith({ ok: false, message: 'no', code: 'invalid_key' });
    const r = await handlePurchase(buy(), d);
    expect(r).toMatchObject({ ours: true, acknowledged: false });
    expect(d.acknowledge).not.toHaveBeenCalled();
  });

  it('reports a failed acknowledgement so the next sync retries it', async () => {
    const r = await handlePurchase(buy(), depsWith(OK, false));
    expect(r).toMatchObject({ ours: true, acknowledged: false });
  });

  it('ignores other apps’ products and pending payments', async () => {
    const d = depsWith(OK);
    expect(await handlePurchase(buy({ productId: 'other' }), d)).toEqual({ ours: false });
    expect(await handlePurchase(buy({ purchaseState: 'pending' }), d)).toEqual({ ours: false });
    expect(d.activate).not.toHaveBeenCalled();
  });
});

// TC-M-PRO-014: a paid user gets Pro back without tapping Restore (subscription back from hold, reinstall).
describe('quiet purchase sync', () => {
  const list = [buy({ isAcknowledgedAndroid: true }), buy({ purchaseToken: 'tok_second_purchase', isAcknowledgedAndroid: false })];
  it('checks every owned purchase when this phone has no Pro', () => {
    expect(purchasesToSync(list, { state: 'free' })).toHaveLength(2);
    expect(purchasesToSync(list, { state: 'free', unconfirmed: true })).toHaveLength(2);
  });
  it('checks only unacknowledged ones while Pro is active', () => {
    expect(purchasesToSync(list, PRO)).toEqual([list[1]]);
  });
});

describe('restore message', () => {
  it('says restored, not found, or the real reason', () => {
    expect(restoreMessage([{ ours: true, result: OK, acknowledged: true }])).toMatch(/restored/);
    expect(restoreMessage([{ ours: false }])).toMatch(/No Finealth Pro purchase/);
    expect(restoreMessage([])).toMatch(/No Finealth Pro purchase/);
    expect(restoreMessage([{ ours: true, result: { ok: false, message: 'Could not reach the licence check.', code: 'network' }, acknowledged: false }])).toBe('Could not reach the licence check.');
  });
});

// TC-M-PRO-015: no ad SDK request while checking, while Pro, or while a stored licence is unconfirmed.
describe('ads gating', () => {
  it('allows ads only for a confirmed free user', () => {
    expect(adsAllowedFor({ state: 'checking' })).toBe(false);
    expect(adsAllowedFor(PRO)).toBe(false);
    expect(adsAllowedFor({ state: 'free', unconfirmed: true })).toBe(false);
    expect(adsAllowedFor({ state: 'free' })).toBe(true);
  });
});

describe('Play offer choice', () => {
  const phase = (n: number) => ({ pricingPhaseList: Array.from({ length: n }, () => ({})) });
  it('takes the base plan, never a trial or intro offer', () => {
    const offers = [
      { id: 'intro-50', basePlanIdAndroid: 'yearly', offerTokenAndroid: 'promo', pricingPhasesAndroid: phase(2) },
      { id: 'yearly', basePlanIdAndroid: 'yearly', offerTokenAndroid: 'base', pricingPhasesAndroid: phase(1) },
      { id: 'monthly', basePlanIdAndroid: 'monthly', offerTokenAndroid: 'm', pricingPhasesAndroid: phase(1) },
    ];
    expect(pickBaseOffer(offers, 'yearly')?.offerTokenAndroid).toBe('base');
    expect(pickBaseOffer(offers, 'monthly')?.offerTokenAndroid).toBe('m');
    expect(pickBaseOffer([offers[0]], 'yearly')).toBeUndefined();
  });
});
