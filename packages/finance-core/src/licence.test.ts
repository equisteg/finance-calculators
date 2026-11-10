import { describe, expect, it } from 'vitest';
import type { LicenceClaims } from '@finealth/shared-types';
import { b64urlEncode, envMatches, importSigningKey, importVerifyKey, isLicenceClaims, licenceKeyHash, peekLicence, signLicence, verifyLicence, verifyLicenceSignature } from './licence';

async function keys() {
  const kp = (await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify'])) as CryptoKeyPair;
  const pkcs8 = b64urlEncode(new Uint8Array(await crypto.subtle.exportKey('pkcs8', kp.privateKey)));
  const raw = b64urlEncode(new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey)));
  return { sign: await importSigningKey(pkcs8), verify: await importVerifyKey(raw) };
}

const claims: LicenceClaims = { v: 1, plan: 'pro_yearly', src: 'razorpay', iat: 1000, exp: 2000 };

describe('licence token', () => {
  it('round-trips and expires', async () => {
    const k = await keys();
    const t = await signLicence(claims, k.sign);
    expect(await verifyLicence(t, k.verify, 1500)).toEqual(claims);
    expect(await verifyLicence(t, k.verify, 2000)).toBeNull();
    expect(peekLicence(t)).toEqual(claims);
  });

  it('rejects tampered claims, wrong keys and junk', async () => {
    const k = await keys();
    const other = await keys();
    const t = await signLicence(claims, k.sign);
    const forged = b64urlEncode(new TextEncoder().encode(JSON.stringify({ ...claims, plan: 'pro_lifetime', exp: 9e9 }))) + '.' + t.split('.')[1];
    expect(await verifyLicence(forged, k.verify, 1500)).toBeNull();
    expect(await verifyLicence(t, other.verify, 1500)).toBeNull();
    for (const junk of ['', 'a', 'a.b', `${t}.x`, 'true']) expect(await verifyLicence(junk, k.verify, 1500)).toBeNull();
  });

  it('rejects well-signed but malformed claims', async () => {
    const k = await keys();
    const bad = await signLicence({ ...claims, plan: 'free' as never }, k.sign);
    expect(await verifyLicence(bad, k.verify, 1500)).toBeNull();
  });
});

describe('kh / env claims', () => {
  it('licenceKeyHash is 22 base64url chars, stable, and differs per key', async () => {
    const a = await licenceKeyHash('pay_LifeTime12345A');
    expect(a).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(await licenceKeyHash('pay_LifeTime12345A')).toBe(a);
    expect(await licenceKeyHash('pay_LifeTime12345B')).not.toBe(a);
  });

  it('accepts optional kh and env; rejects malformed ones', async () => {
    const kh = await licenceKeyHash('sub_Yearly12345ABC');
    expect(isLicenceClaims({ ...claims, kh, env: 'production' })).toBe(true);
    expect(isLicenceClaims({ ...claims, src: 'play', env: 'dev' })).toBe(true);
    expect(isLicenceClaims({ ...claims, kh: 'short' })).toBe(false);
    expect(isLicenceClaims({ ...claims, kh: 5 })).toBe(false);
    expect(isLicenceClaims({ ...claims, env: 'prod' })).toBe(false);
  });

  it('verifyLicenceSignature ignores expiry but not the signature', async () => {
    const k = await keys();
    const other = await keys();
    const t = await signLicence(claims, k.sign);
    expect(await verifyLicence(t, k.verify, 5000)).toBeNull();
    expect(await verifyLicenceSignature(t, k.verify)).toEqual(claims);
    expect(await verifyLicenceSignature(t, other.verify)).toBeNull();
    expect(await verifyLicenceSignature('a.b', k.verify)).toBeNull();
  });

  it('envMatches: mismatch refused; unknown client env or env-less token accepted', () => {
    expect(envMatches({ env: 'staging' }, 'production')).toBe(false);
    expect(envMatches({ env: 'production' }, 'production')).toBe(true);
    expect(envMatches({}, 'production')).toBe(true);
    expect(envMatches({ env: 'dev' }, '')).toBe(true);
  });
});
