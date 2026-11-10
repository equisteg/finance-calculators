// Removes personal data and secrets from anything we log (docs/standards/self-healing.md §1 — log-only, nothing stored).

export function scrub(input: string): string {
  return (
    input
      .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[email]')
      .replace(/\bBearer\s+\S+/gi, 'Bearer [token]')
      .replace(/\beyJ[\w-]+\.[\w-]+(?:\.[\w-]+)?/g, '[token]')
      .replace(/\?[^\s)'"#]*/g, '?[query]')
      // Razorpay ids (pay_ / sub_ ids are licence keys; key ids, orders, plans) and dash-grouped keys
      .replace(/\b(?:pay|sub|order|plan|inv|rzp_live|rzp_test)_[A-Za-z0-9]{6,}\b/g, '[rzp-id]')
      .replace(/\b[A-Za-z0-9]{4,}(?:-[A-Za-z0-9]{4,}){2,}\b/g, '[key]')
      // India GSTIN (15 chars), then other upper-case ids mixing letters and digits (PAN, VAT, KRA PIN…)
      .replace(/\b\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]\b/g, '[taxid]')
      .replace(/\b(?=[A-Z0-9]*\d)(?=[A-Z0-9]*[A-Z])[A-Z0-9]{10,}\b/g, '[taxid]')
      // Long opaque tokens (Play purchase tokens, API keys)
      .replace(/\b(?=[\w-]*\d)(?=[\w-]*[A-Za-z])[\w-]{24,}\b/g, '[token]')
      // Card, phone, ABN, bank and other numbers with 6+ digits (separators allowed)
      .replace(/\+?\d[\d\s().-]{4,}\d/g, (m) => ((m.match(/\d/g)?.length ?? 0) >= 6 ? '[number]' : m))
      .replace(/\d{6,}/g, '[number]')
  );
}

export async function sha256Hex(s: string, bytes = 32): Promise<string> {
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
  return [...h.slice(0, bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** One JSON line to Workers Logs. Callers pass only safe fields (no keys, tokens, emails, IPs). */
export function logLine(fields: Record<string, unknown>): void {
  console.log(JSON.stringify({ t: new Date().toISOString(), ...fields }));
}
