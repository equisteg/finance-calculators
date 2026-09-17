/**
 * Locale-pinned number and currency formatting.
 *
 * Never call toLocaleString() without a locale in rendered output: the server
 * formats with its own default locale and the browser with the visitor's, so
 * "35,00,000" (en-IN) and "3,500,000" (en-US) disagree and React throws away
 * the server HTML with a hydration error (#418).
 *
 * Kept byte-identical in apps/web and apps/mobile.
 */

const LOCALE_BY_CURRENCY: Record<string, string> = {
  INR: "en-IN",
  USD: "en-US",
  EUR: "en-IE",
  GBP: "en-GB",
};

export function localeFor(currency: string): string {
  return LOCALE_BY_CURRENCY[currency] ?? "en-US";
}

/** "₹1,52,890" / "$350,000" / "€4,004.20" */
export function formatMoney(value: number, currency: string, fractionDigits = 0): string {
  return new Intl.NumberFormat(localeFor(currency), {
    style: "currency",
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(Number.isFinite(value) ? value : 0);
}

/** Grouped number with no currency symbol: "23,398.1" */
export function formatNumber(value: number, currency: string, maxFractionDigits = 2): string {
  return new Intl.NumberFormat(localeFor(currency), {
    maximumFractionDigits: maxFractionDigits,
  }).format(Number.isFinite(value) ? value : 0);
}
