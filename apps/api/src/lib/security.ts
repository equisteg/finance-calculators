// Security middleware (adapted from the Equisteg template): canonical host, CORS allow-list, CSRF guard, rate limits.
import type { Context, MiddlewareHandler } from 'hono';
import type { AppEnv, Env, RateLimiter } from '../env.ts';
import { HttpError } from './http.ts';

const MOBILE_ORIGINS = ['finealth://app'];
const DEV_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:8787', 'http://127.0.0.1:8787'];

export function allowedOrigins(env: Env): string[] {
  const list = [...MOBILE_ORIGINS];
  if (env.CANONICAL_HOST && !env.CANONICAL_HOST.includes('<')) list.push(`https://${env.CANONICAL_HOST}`);
  for (const o of (env.ALLOWED_ORIGINS ?? '').split(',')) if (o.trim() && !o.includes('<')) list.push(o.trim().replace(/\/$/, ''));
  if (env.ENVIRONMENT !== 'production') list.push(...DEV_ORIGINS);
  return list;
}

const isAllowed = (c: Context<AppEnv>, origin: string) => origin === new URL(c.req.url).origin || allowedOrigins(c.env).includes(origin);

/** Production: 301 any other host (www, workers.dev) to the canonical domain. */
export const canonicalHost: MiddlewareHandler<AppEnv> = async (c, next) => {
  const host = c.env.CANONICAL_HOST;
  if (c.env.ENVIRONMENT === 'production' && host && !host.includes('<')) {
    const url = new URL(c.req.url);
    if (url.hostname !== host) {
      url.hostname = host;
      url.protocol = 'https:';
      url.port = '';
      return c.redirect(url.toString(), 301);
    }
  }
  await next();
};

/** No cookies are used, so credentials are never allowed. */
export const cors: MiddlewareHandler<AppEnv> = async (c, next) => {
  const origin = c.req.header('origin');
  const ok = !!origin && isAllowed(c, origin);
  if (c.req.method === 'OPTIONS') {
    if (!ok) return c.body(null, 403);
    return c.body(null, 204, {
      'access-control-allow-origin': origin!,
      'access-control-allow-methods': 'GET, POST, OPTIONS',
      'access-control-allow-headers': 'content-type, x-request-id',
      'access-control-max-age': '600',
      vary: 'origin',
    });
  }
  await next();
  if (ok) {
    c.header('access-control-allow-origin', origin!);
    c.header('access-control-expose-headers', 'x-request-id');
    c.header('vary', 'origin');
  }
};

/**
 * CSRF defence (OWASP ASVS 4.2.2): a foreign Origin is refused, and POST bodies must be JSON so a plain HTML form
 * (which cannot send application/json without a CORS preflight) never reaches a handler. The Android app sends no Origin.
 */
export const mutationGuard: MiddlewareHandler<AppEnv> = async (c, next) => {
  const m = c.req.method;
  if (m === 'GET' || m === 'HEAD' || m === 'OPTIONS') return next();
  const origin = c.req.header('origin');
  if (origin && !isAllowed(c, origin)) {
    throw new HttpError(403, 'forbidden_origin', 'Requests from this site are not allowed.');
  }
  if (!/^application\/json\s*(;|$)/i.test(c.req.header('content-type') ?? '')) {
    throw new HttpError(415, 'unsupported_media_type', 'Send the request body as application/json.');
  }
  await next();
};

/** Applied to every Worker response under /api. */
export const securityHeaders: MiddlewareHandler<AppEnv> = async (c, next) => {
  await next();
  c.header('cache-control', 'no-store');
  c.header('x-content-type-options', 'nosniff');
  c.header('x-frame-options', 'DENY');
  c.header('referrer-policy', 'no-referrer');
  c.header('content-security-policy', "default-src 'none'; frame-ancestors 'none'");
  c.header('strict-transport-security', 'max-age=31536000; includeSubDomains');
  c.header('permissions-policy', 'interest-cohort=()');
};

/** Used only as a rate-limit key; never logged. */
export const clientIp = (c: Context) => c.req.header('cf-connecting-ip') ?? '0.0.0.0';

// Fallback when the Rate Limiting binding is absent (local dev / tests): fixed 60 s window per isolate.
const windows = new Map<string, { n: number; reset: number }>();
function memoryLimit(key: string, limit: number, now = Date.now()) {
  const w = windows.get(key);
  if (!w || w.reset < now) {
    if (windows.size > 10_000) windows.clear();
    windows.set(key, { n: 1, reset: now + 60_000 });
    return true;
  }
  w.n++;
  return w.n <= limit;
}

export const LIMITS = { strict: 5, api: 120 } as const;

export function rateLimit(kind: 'strict' | 'api', route: string): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const binding: RateLimiter | undefined = kind === 'strict' ? c.env.RL_STRICT : c.env.RL_API;
    const key = `${route}:${clientIp(c)}`;
    let ok: boolean;
    try {
      ok = binding ? (await binding.limit({ key })).success : memoryLimit(key, LIMITS[kind]);
    } catch {
      ok = memoryLimit(key, LIMITS[kind]); // binding outage: degrade to per-isolate limits, never fail open entirely
    }
    if (!ok) {
      c.header('retry-after', '60');
      throw new HttpError(429, 'rate_limited', 'Too many requests. Please wait a minute and try again.');
    }
    await next();
  };
}
