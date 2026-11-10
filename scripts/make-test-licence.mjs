// Test-only: makes a throwaway Ed25519 key pair and a 6-day Pro token for end-to-end tests of the Pro unlock.
// Never use these keys for a real environment.
//   eval "$(node scripts/make-test-licence.mjs)"   → exports PRO_TEST_PUBLIC_KEY and PRO_TEST_TOKEN
//   NEXT_PUBLIC_LICENCE_PUBLIC_KEY=$PRO_TEST_PUBLIC_KEY npm run build -w @finealth/web
//   PRO_TEST_TOKEN=$PRO_TEST_TOKEN npm run test:web -- --project=web specs/pro.spec.ts
const b64 = (b) => Buffer.from(b).toString('base64url');
const kp = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
const pub = b64(await crypto.subtle.exportKey('raw', kp.publicKey));
const now = Math.floor(Date.now() / 1000);
const body = b64(JSON.stringify({ v: 1, plan: 'pro_yearly', src: 'razorpay', iat: now, exp: now + 6 * 86400 }));
const sig = b64(await crypto.subtle.sign({ name: 'Ed25519' }, kp.privateKey, new TextEncoder().encode(body)));
console.log(`export PRO_TEST_PUBLIC_KEY=${pub}`);
console.log(`export PRO_TEST_TOKEN=${body}.${sig}`);
