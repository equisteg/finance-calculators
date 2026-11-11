import { formatMoney, formatNumber } from '@finealth/finance-core';
import type { Fmt } from '@finealth/finance-core/catalog';

/** Formatter for catalogue results, pinned to the currency's locale (same output as the web). */
export function makeFmt(currency: string): Fmt {
  return {
    money: (x, digits = 0) => formatMoney(x, currency, digits),
    pct: (x) => (x === null || !Number.isFinite(x) ? '—' : `${formatNumber(x, currency, 2)}%`),
    num: (x) => formatNumber(x, currency, 2),
  };
}
