// One-time: create the Ed25519 key pair for Pro tokens.
//   node scripts/gen-licence-keys.mjs
// The PRIVATE key is written to a git-ignored file for you to pipe into `wrangler secret put` — it is never printed.
// The PUBLIC key is printed: put it in the GitHub variable LICENCE_PUBLIC_KEY (it is public by design).
import { writeFileSync } from 'node:fs';

const b64url = (buf) => Buffer.from(buf).toString('base64url');
const kp = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
const pkcs8 = b64url(await crypto.subtle.exportKey('pkcs8', kp.privateKey));
const raw = b64url(await crypto.subtle.exportKey('raw', kp.publicKey));

const out = 'apps/api/.licence-signing-key.secret';
writeFileSync(out, pkcs8, { mode: 0o600 });
console.log(`Private key written to ${out} (git-ignored). Store it, then delete the file:`);
console.log(`  npx wrangler secret put LICENCE_SIGNING_KEY --env <dev|staging|production> < ${out}`);
console.log(`Public key (safe to share):\n  ${raw}`);
