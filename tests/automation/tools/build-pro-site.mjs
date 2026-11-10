#!/usr/bin/env node
// Test-only: builds the website with a throwaway Ed25519 public key so the Pro cases can run against a real build.
//   node tests/automation/tools/build-pro-site.mjs
// Writes tests/automation/.pro-site/ (the Pro test build) and three tokens signed by that key (run.py passes them to
// the suites): .pro-site.token (valid 6 days), .pro-site.token-refresh (1 day left: inside the 2-day refresh window,
// TOKEN_REFRESH_SECONDS in packages/finance-core/src/licence.ts) and .pro-site.token-expired (expired a day ago).
// It always rebuilds apps/web/out with the normal settings at the end, so the normal build never trusts this key.
// The private key lives only in memory for this run. Never use these keys for a real environment.
import { execSync } from 'node:child_process';
import { cpSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '../../../..');
const OUT = join(ROOT, 'apps/web/out');
const SITE = join(ROOT, 'tests/automation/.pro-site');
const b64 = (b) => Buffer.from(b).toString('base64url');
const kp = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
const pub = b64(await crypto.subtle.exportKey('raw', kp.publicKey));
const now = Math.floor(Date.now() / 1000);
const DAY = 86400;
const sign = async (iat, exp) => {
  const body = b64(JSON.stringify({ v: 1, plan: 'pro_yearly', src: 'razorpay', iat, exp }));
  const sig = b64(await crypto.subtle.sign({ name: 'Ed25519' }, kp.privateKey, new TextEncoder().encode(body)));
  return `${body}.${sig}\n`;
};
const TOKENS = {
  '.pro-site.token': await sign(now, now + 6 * DAY),
  '.pro-site.token-refresh': await sign(now - 5 * DAY, now + DAY),
  '.pro-site.token-expired': await sign(now - 8 * DAY, now - DAY),
};

const run = (env) => execSync('npm run build -w @finealth/web', { cwd: ROOT, stdio: 'inherit', env: { ...process.env, ...env } });
try {
  console.log('Building the Pro test site (throwaway key)…');
  run({ NEXT_PUBLIC_LICENCE_PUBLIC_KEY: pub });
  rmSync(SITE, { recursive: true, force: true });
  cpSync(OUT, SITE, { recursive: true });
  for (const [name, token] of Object.entries(TOKENS)) writeFileSync(join(ROOT, 'tests/automation', name), token);
} finally {
  // Always, even when a step above failed: apps/web/out must never be left trusting the throwaway key.
  console.log('Rebuilding the normal site…');
  run({});
}
console.log(`Pro test site: ${SITE}\nTokens: tests/automation/.pro-site.token (valid 6 days), .pro-site.token-refresh (1 day left), .pro-site.token-expired`);
