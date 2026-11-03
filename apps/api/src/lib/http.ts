import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

export type ErrorCode =
  | 'invalid_request'
  | 'invalid_key'
  | 'invalid_payment'
  | 'refunded'
  | 'expired'
  | 'pending'
  | 'too_many_activations'
  | 'rate_limited'
  | 'unavailable'
  | 'forbidden_origin'
  | 'unsupported_media_type'
  | 'payload_too_large'
  | 'not_found'
  | 'internal';

/** Thrown anywhere; turned into `{ error: { code, message } }` by the app's onError. */
export class HttpError extends Error {
  constructor(
    readonly status: ContentfulStatusCode,
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const errorJson = (c: Context, status: ContentfulStatusCode, code: ErrorCode, message: string) =>
  c.json({ error: { code, message } }, status);

/** Parses a JSON object body or throws 400. */
export async function readJsonObject(c: Context): Promise<Record<string, unknown>> {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    throw new HttpError(400, 'invalid_request', 'The request body is not valid JSON.');
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(400, 'invalid_request', 'The request body must be a JSON object.');
  }
  return body as Record<string, unknown>;
}

/** Placeholder config values like `<razorpay-key-id>` count as missing. */
export const configured = (v: string | undefined): v is string => !!v && v.trim() !== '' && !v.includes('<');

/** fetch with a timeout and one retry on network errors / 5xx. Returns the last response, or throws when unreachable. */
export async function fetchWithRetry(url: string, init: RequestInit, timeoutMs = 8000): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
      if (res.status < 500 || attempt === 1) return res;
      lastErr = new Error(`upstream ${res.status}`);
    } catch (e) {
      lastErr = e;
    }
    if (attempt === 0) await new Promise((r) => setTimeout(r, 200));
  }
  throw lastErr instanceof Error ? lastErr : new Error('upstream unreachable');
}

export const unavailable = () =>
  new HttpError(503, 'unavailable', 'Pro activation is temporarily unavailable. Please try again in a few minutes.');
