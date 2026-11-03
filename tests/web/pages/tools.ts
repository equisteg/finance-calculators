import type { Page } from '@playwright/test';

/** Page objects for the Finealth product pages (selectors are data-testid only). */
export const PRO_STORAGE_KEY = 'finealth.pro.v1';

export async function seedPro(page: Page, token: string) {
  await page.addInitScript(
    ([k, t]) => localStorage.setItem(k, JSON.stringify({ key: 'pay_TestKey12345678', plan: 'pro_yearly', token: t })),
    [PRO_STORAGE_KEY, token] as const,
  );
}

export class HealthCheckPage {
  constructor(readonly page: Page) {}
  goto = () => this.page.goto('/health-check/');
  score = () => this.page.getByTestId('health-score');
  fill = (field: 'income' | 'expenses' | 'debtpay' | 'fund' | 'costly' | 'invest' | 'age', v: number) => this.page.getByTestId(`in-${field}`).fill(String(v));
}

export class DebtPage {
  constructor(readonly page: Page) {}
  goto = () => this.page.goto('/debt-payoff/');
  debtFreeIn = () => this.page.getByTestId('debt-free-in');
  whatIf = (v: number) => this.page.getByTestId('in-whatif').fill(String(v));
}
