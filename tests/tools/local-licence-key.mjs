// Throwaway Ed25519 key pair for LOCAL Pro tests only (never dev/staging/production).
//   node tests/tools/local-licence-key.mjs setup   → creates a new pair, writes the private key into apps/api/.dev.vars
//                                                    as LICENCE_SIGNING_KEY (git-ignored; other lines are kept) and
//                                                    prints the PUBLIC key (public by design)
//   node tests/tools/local-licence-key.mjs public  → prints the public key that matches apps/api/.dev.vars
// The private key is never printed. tests/web/fixtures.ts reads it from the same file to sign Pro test tokens.
// Build the web app with the public key so the browser accepts those tokens (see tests/README.md, "Local run").
import { createPrivateKey, createPublicKey } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const varsFile = resolve(root, 'apps/api/.dev.vars');
const NAME = 'LICENCE_SIGNING_KEY';

const publicFromPkcs8 = (pkcs8) =>
  createPublicKey(createPrivateKey({ key: Buffer.from(pkcs8, 'base64url'), format: 'der', type: 'pkcs8' })).export({ format: 'jwk' }).x;

function readKey() {
  if (!existsSync(varsFile)) return '';
  const line = readFileSync(varsFile, 'utf8').split(/\r?\n/).find((l) => l.startsWith(`${NAME}=`));
  return line ? line.slice(NAME.length + 1).trim().replace(/^"|"$/g, '') : '';
}

const cmd = process.argv[2];
if (cmd === 'setup') {
  const kp = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const pkcs8 = Buffer.from(await crypto.subtle.exportKey('pkcs8', kp.privateKey)).toString('base64url');
  const raw = Buffer.from(await crypto.subtle.exportKey('raw', kp.publicKey)).toString('base64url');
  const kept = existsSync(varsFile) ? readFileSync(varsFile, 'utf8').split(/\r?\n/).filter((l) => l && !l.startsWith(`${NAME}=`)) : [];
  writeFileSync(varsFile, [...kept, `${NAME}=${pkcs8}`, ''].join('\n'), { mode: 0o600 });
  console.log(`Wrote ${NAME} to apps/api/.dev.vars (git-ignored). Public key:\n${raw}`);
} else if (cmd === 'public') {
  const k = readKey();
  if (!k) {
    console.error(`No ${NAME} in apps/api/.dev.vars. Run: node tests/tools/local-licence-key.mjs setup`);
    process.exit(1);
  }
  console.log(publicFromPkcs8(k));
} else {
  console.error('Usage: node tests/tools/local-licence-key.mjs <setup|public>');
  process.exit(2);
}
