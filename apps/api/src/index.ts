// Finealth API — a stateless Cloudflare Worker. It stores NO user data and has no database: it only confirms a Pro
// purchase with the store (Razorpay / Google Play) and returns a short-lived Ed25519-signed token. Static pages are served
// from apps/web/out by Workers Static Assets before this code runs; only /api/* reaches the Worker.
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import type { AppEnv } from './env.ts';
import { errorJson, HttpError } from './lib/http.ts';
import { logLine, scrub } from './lib/scrub.ts';
import { canonicalHost, cors, mutationGuard, rateLimit, securityHeaders } from './lib/security.ts';
import { razorpayConfigured } from './lib/razorpay.ts';
import { loadSigner } from './lib/signing.ts';
import { checkout } from './routes/checkout.ts';
import { errors } from './routes/errors.ts';
import { licence } from './routes/licence.ts';
import { play } from './routes/play.ts';

export const app = new Hono<AppEnv>();

const tooLarge = (max: number) =>
  bodyLimit({
    maxSize: max,
    onError: (c) => errorJson(c, 413, 'payload_too_large', 'The request body is too large.'),
  });

// Request id: echo a sane client id (so web/mobile can correlate) or create one.
app.use('/api/*', async (c, next) => {
  const incoming = c.req.header('x-request-id');
  const rid = incoming && /^[A-Za-z0-9-]{8,64}$/.test(incoming) ? incoming : crypto.randomUUID();
  c.set('rid', rid);
  const started = Date.now();
  await next();
  c.header('x-request-id', rid);
  // One line per request: no IP, no body, no query string.
  logLine({ rid, evt: 'request', method: c.req.method, path: c.req.path, status: c.res.status, ms: Date.now() - started });
});
app.use('/api/*', canonicalHost);
app.use('/api/*', securityHeaders);
app.use('/api/*', cors);
app.use('/api/*', tooLarge(16 * 1024));
app.use('/api/v1/errors', tooLarge(4 * 1024));
app.use('/api/*', mutationGuard);

app.use('/api/v1/licence/verify', rateLimit('strict', 'licence'));
app.use('/api/v1/play/verify', rateLimit('strict', 'play'));
app.use('/api/v1/checkout', rateLimit('strict', 'checkout'));
app.use('/api/v1/checkout/confirm', rateLimit('strict', 'confirm'));
const apiLimit = rateLimit('api', 'api');
const STRICT_PATHS = /^\/api\/v1\/(licence\/verify|play\/verify|checkout|checkout\/confirm)$/;
app.use('/api/*', (c, next) => (STRICT_PATHS.test(c.req.path) ? next() : apiLimit(c, next)));

app.get('/api/v1/health', async (c) => {
  const signer = await loadSigner(c.env);
  return c.json({
    ok: true,
    release: c.env.RELEASE ?? 'dev',
    env: c.env.ENVIRONMENT ?? 'dev',
    checks: { signingKey: signer ? 'ok' : 'missing', razorpay: razorpayConfigured(c.env) ? 'ok' : 'missing' },
  });
});
app.route('/api/v1/checkout', checkout);
app.route('/api/v1/licence', licence);
app.route('/api/v1/play', play);
app.route('/api/v1/errors', errors);

app.all('/api/*', (c) => errorJson(c, 404, 'not_found', 'Not found.'));

// Outside /api the Worker only runs if Static Assets didn't match (e.g. local tests): hand back to the assets binding.
app.all('*', async (c) => (c.env.ASSETS ? c.env.ASSETS.fetch(c.req.raw) : c.text('Not found', 404)));

app.onError((err, c) => {
  if (err instanceof HttpError) {
    if (err.status === 429) c.header('retry-after', '60');
    return errorJson(c, err.status, err.code, err.message);
  }
  logLine({
    rid: c.get('rid'),
    evt: 'api_error',
    path: c.req.path,
    name: scrub(err.name ?? 'Error').slice(0, 120),
    message: scrub(err.message ?? '').slice(0, 500),
    stack: scrub(err.stack ?? '').split('\n').slice(0, 8).join('\n').slice(0, 1500),
  });
  return errorJson(c, 500, 'internal', 'Something went wrong. Please try again.');
});

export default app;
