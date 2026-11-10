#!/usr/bin/env node
// Test-only: builds the website with a throwaway Ed25519 public key so the Pro cases can run against a real build.
//   node tests/automation/tools/build-pro-site.mjs
// Writes tests/automation/.pro-site/ (the Pro test build) and tests/automation/.pro-site.token (a 6-day signed token
// for that key; run.py passes it to the suites), then rebuilds apps/web/out with the normal settings.
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
const body = b64(JSON.stringify({ v: 1, plan: 'pro_yearly', src: 'razorpay', iat: now, exp: now + 6 * 86400 }));
const sig = b64(await crypto.subtle.sign({ name: 'Ed25519' }, kp.privateKey, new TextEncoder().encode(body)));

const run = (env) => execSync('npm run build -w @finealth/web', { cwd: ROOT, stdio: 'inherit', env: { ...process.env, ...env } });
console.log('Building the Pro test site (throwaway key)…');
run({ NEXT_PUBLIC_LICENCE_PUBLIC_KEY: pub });
rmSync(SITE, { recursive: true, force: true });
cpSync(OUT, SITE, { recursive: true });
writeFileSync(join(ROOT, 'tests/automation/.pro-site.token'), `${body}.${sig}\n`);
if (!process.argv.includes('--no-rebuild')) {
  console.log('Rebuilding the normal site…');
  run({});
}
console.log(`Pro test site: ${SITE}\nToken: tests/automation/.pro-site.token (valid 6 days)`);
