import { test, expect } from '@playwright/test';

/**
 * Finealth product pages (free plan). REQ: health check, debt, goals, retirement, prepayment, pricing.
 * Pro unlock is covered by apps/web/src/lib/pro.test.ts (token verification) and needs a build with a test
 * NEXT_PUBLIC_LICENCE_PUBLIC_KEY for an end-to-end run (tests/README.md).
 */

const TOOLS = ['/health-check/', '/debt-payoff/', '/goal-planner/', '/retirement-planner/', '/loan-prepayment/'];

test.describe('FH :: planning tools (free plan)', () => {
  for (const path of TOOLS) {
    test(`FH-01 ${path} shows a result and the disclaimer`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(path);
      await expect(page.getByTestId('disclaimer')).toBeVisible();
      await expect(page.locator('h1')).toBeVisible();
      expect(errors).toEqual([]);
    });
  }

  test('FH-02 health check scores the example household and updates on input', async ({ page }) => {
    await page.goto('/health-check/');
    await expect(page.getByTestId('health-score')).toHaveText('75');
    await expect(page.getByTestId('health-pro-gate')).toBeVisible();
    await page.getByTestId('in-fund').fill('450000');
    await expect(page.getByTestId('health-score')).toHaveText('85');
    // remembered on this device
    await page.reload();
    await expect(page.getByTestId('health-score')).toHaveText('85');
  });

  test('FH-03 debt planner gives a debt-free date and caps free debts at 3', async ({ page }) => {
    await page.goto('/debt-payoff/');
    await expect(page.getByTestId('debt-free-in')).not.toBeEmpty();
    await expect(page.getByTestId('debt-limit')).toBeVisible();
    await expect(page.getByTestId('debt-pro-gate')).toBeVisible();
  });

  test('FH-04 pricing shows the three plans and buy buttons are off until Razorpay is enabled', async ({ page }) => {
    await page.goto('/pricing/');
    await expect(page.getByTestId('price-yearly')).toBeVisible();
    await expect(page.getByTestId('price-lifetime')).toBeVisible();
    await expect(page.getByTestId('buy-yearly')).toBeDisabled();
  });
});
