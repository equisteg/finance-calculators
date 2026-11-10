import { test, expect } from '@playwright/test';
import { DebtPage, HealthCheckPage, seedPro } from '../pages/tools';

/**
 * Pro unlock end to end (TC-040..TC-046). Needs a web build made with a test public key and the matching token:
 * see scripts/make-test-licence.mjs. Skipped when PRO_TEST_TOKEN is not set.
 */
const token = process.env.PRO_TEST_TOKEN;
test.skip(!token, 'PRO_TEST_TOKEN not set (scripts/make-test-licence.mjs)');

test.describe('FH-PRO :: Pro unlocked by a signed token', () => {
  test.beforeEach(async ({ page }) => seedPro(page, token!));

  test('TC-040 full health report, print and snapshot; no ad script', async ({ page }) => {
    const h = new HealthCheckPage(page);
    await h.goto();
    await expect(page.getByTestId('health-pillars')).toBeVisible();
    await expect(page.getByTestId('pro-badge')).toBeVisible();
    await expect(page.locator('[data-testid=health-actions] li')).toHaveCount(5);
    await expect(page.locator('#adsbygoogle-js')).toHaveCount(0);
    await page.getByTestId('save-snapshot').click();
    await page.goto('/my-plan/');
    await expect(page.getByTestId('myplan-latest')).toHaveText('75');
  });

  test('TC-041 debt what-if shows months and interest saved', async ({ page }) => {
    const d = new DebtPage(page);
    await d.goto();
    await d.whatIf(5000);
    await expect(page.getByTestId('whatif-result')).toContainText('sooner');
    await expect(page.getByTestId('export-debt-csv')).toBeEnabled();
  });

  test('TC-042 retirement odds run and are reproducible', async ({ page }) => {
    await page.goto('/retirement-planner/');
    await page.getByTestId('run-odds').click();
    const first = await page.getByTestId('odds-success').textContent();
    await page.getByTestId('run-odds').click();
    await expect(page.getByTestId('odds-success')).toHaveText(first!);
  });

  test('TC-043 a tampered token is refused and the page falls back to free', async ({ page, context }) => {
    await context.addInitScript(() => {
      const raw = JSON.parse(localStorage.getItem('finealth.pro.v1') ?? '{}');
      raw.token = raw.token.slice(0, -4) + 'AAAA';
      localStorage.setItem('finealth.pro.v1', JSON.stringify(raw));
    });
    await page.goto('/health-check/');
    await expect(page.getByTestId('health-pillars')).toHaveCount(0);
  });
});
