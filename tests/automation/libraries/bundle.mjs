// Bundles a TypeScript entry with esbuild (already installed by npm ci) into tests/automation/.cache/, rebuilding only
// when a source file is newer than the bundle. Used by the engine and API bridges.
import { build } from 'esbuild';
import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '../../../..');
const CACHE = join(ROOT, 'tests/automation/.cache');

function newest(dir) {
  let t = 0;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const p = join(dir, e.name);
    t = Math.max(t, e.isDirectory() ? newest(p) : statSync(p).mtimeMs);
  }
  return t;
}

/** Returns the imported module of ``entry`` (repo-relative), bundled once per source change. */
export async function load(entry, name, watchDirs) {
  mkdirSync(CACHE, { recursive: true });
  const out = join(CACHE, `${name}.mjs`);
  const src = Math.max(...watchDirs.map((d) => newest(join(ROOT, d))));
  if (!existsSync(out) || statSync(out).mtimeMs < src) {
    await build({ entryPoints: [join(ROOT, entry)], bundle: true, format: 'esm', platform: 'node', target: 'node20', outfile: out, logLevel: 'silent' });
  }
  return import(pathToFileURL(out).href);
}

export async function readStdin() {
  let s = '';
  for await (const c of process.stdin) s += c;
  return JSON.parse(s || '{}');
}
