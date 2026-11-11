import { useMemo } from 'react';
import { formatMoney } from '@finealth/finance-core';
import { useSettings } from './storage';

export { makeFmt } from './fmt';

/** The app currency (More → Currency) and a matching money formatter. */
export function useMoney() {
  const { currency } = useSettings();
  return useMemo(() => ({ currency, money: (n: number) => formatMoney(n, currency) }), [currency]);
}
