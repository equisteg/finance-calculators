// POST /api/v1/errors — client error reports. Scrubbed again here, written as one Workers Logs line, never stored.
import { Hono } from 'hono';
import type { AppEnv } from '../env.ts';
import { HttpError, readJsonObject } from '../lib/http.ts';
import { logLine, scrub, sha256Hex } from '../lib/scrub.ts';

const PLATFORMS = ['web', 'android', 'ios'] as const;

const optStr = (v: unknown, max: number, field: string): string | undefined => {
  if (v === undefined || v === null) return undefined;
  if (typeof v !== 'string') throw new HttpError(400, 'invalid_request', `${field} must be a string.`);
  return v.slice(0, max);
};

/** Keep only the path of a route or URL (origin, query string and fragment dropped). */
function safeRoute(u: string | undefined): string | undefined {
  if (!u) return undefined;
  let path: string;
  try {
    path = new URL(u).pathname;
  } catch {
    path = u.split(/[?#]/)[0] ?? '';
  }
  return path ? scrub(path).slice(0, 200) : undefined;
}

export const errors = new Hono<AppEnv>();

errors.post('/', async (c) => {
  const b = await readJsonObject(c);
  if (typeof b.platform !== 'string' || !PLATFORMS.includes(b.platform as (typeof PLATFORMS)[number])) {
    throw new HttpError(400, 'invalid_request', 'platform must be web, android or ios.');
  }
  if (typeof b.message !== 'string' || !b.message.trim()) throw new HttpError(400, 'invalid_request', 'message is required.');
  const message = scrub(b.message.slice(0, 1000));
  const stack = optStr(b.stack, 3000, 'stack');
  const release = optStr(b.release, 64, 'release');
  // The web sends `route`; `url` is accepted for older clients.
  const route = optStr(b.route, 500, 'route') ?? optStr(b.url, 500, 'url');
  const scrubbedStack = stack ? scrub(stack) : undefined;
  const fp = await sha256Hex(`${b.platform}|${message.slice(0, 200)}|${(scrubbedStack ?? '').split('\n')[1]?.trim() ?? ''}`, 8);
  logLine({
    rid: c.get('rid'),
    evt: 'client_error',
    platform: b.platform,
    fp,
    release: release ? scrub(release) : undefined,
    route: safeRoute(route),
    message,
    stack: scrubbedStack,
  });
  return c.body(null, 204);
});
