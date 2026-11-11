// Number parsing for the input fields (pure, unit tested in __tests__/input.test.ts).

/**
 * "1,00,000" / "-12.5" / "12,5" / "7." → number; null when it is not a number.
 * Commas group thousands, except one comma followed by one or two digits at the end, which is a decimal comma
 * (phones set to a comma-decimal language type "12,5").
 */
export function parseInput(s: string): number | null {
  let t = s.trim().replace(/[\s_]/g, '');
  if (!t.includes('.') && /^[-+]?\d+,\d{1,2}$/.test(t)) t = t.replace(',', '.');
  t = t.replace(/,/g, '');
  if (t === '' || t === '-' || t === '+') return 0;
  if (!/^[-+]?(\d+\.?\d*|\.\d+)$/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** The number a field reports: never below min (default 0) or above max. */
export function clampInput(n: number, min = 0, max?: number): number {
  return Math.max(min, max !== undefined ? Math.min(max, n) : n);
}
