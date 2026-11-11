import { describe, expect, it } from 'vitest';
import type { LicenceClaims } from '@finealth/shared-types';
import { b64urlEncode } from '@finealth/finance-core';
import { utf8Decode, verifySignature, verifyToken } from '../src/lib/licence';
import { testKeys } from './helpers';

const claims: LicenceClaims = { v: 1, plan: 'pro_monthly', src: 'play', iat: 1000, exp: 2000, env: 'staging' };

// TC-M-PRO-001: the app accepts exactly the tokens apps/api signs, and nothing else.
describe('on-device licence check (noble Ed25519 vs WebCrypto signer)', () => {
  it('accepts a token signed the way apps/api signs it', async () => {
    const k = await testKeys();
    const t = await k.sign(claims);
    expect(verifyToken(t, k.publicKey, 1500, 'staging')).toEqual(claims);
  });

  it('refuses expired, wrong-environment, forged and wrong-key tokens', async () => {
    const k = await testKeys();
    const other = await testKeys();
    const t = await k.sign(claims);
    expect(verifyToken(t, k.publicKey, 2000, 'staging')).toBeNull();
    expect(verifyToken(t, k.publicKey, 1500, 'production')).toBeNull();
    expect(verifyToken(t, other.publicKey, 1500, 'staging')).toBeNull();
    const forged = b64urlEncode(new TextEncoder().encode(JSON.stringify({ ...claims, plan: 'pro_lifetime', exp: 9e9 }))) + '.' + t.split('.')[1];
    expect(verifyToken(forged, k.publicKey, 1500, 'staging')).toBeNull();
  });

  it('never throws on junk and refuses a missing public key', async () => {
    const k = await testKeys();
    const t = await k.sign(claims);
    for (const junk of ['', 'a', 'a.b', `${t}.x`, 'true', '💥.💥', 'x'.repeat(3000)]) expect(verifySignature(junk, k.publicKey)).toBeNull();
    expect(verifySignature(t, '')).toBeNull();
    expect(verifySignature(t, 'short')).toBeNull();
  });

  it('decodes UTF-8 without TextDecoder', () => {
    const s = 'Fin€alth ✓ 𝄞';
    expect(utf8Decode(new TextEncoder().encode(s))).toBe(s);
  });
});
