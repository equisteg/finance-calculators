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

test.describe('FH :: global tools library and disclaimers', () => {
  test('FH-10 tools index lists every category with the estimates-only notice', async ({ page }) => {
    await page.goto('/tools/');
    await expect(page.getByTestId('tools-disclaimer')).toBeVisible();
    await expect(page.getByTestId('tool-card-australia-income-tax-calculator')).toBeVisible();
    await expect(page.getByTestId('tool-card-world-vat-gst-calculator')).toBeVisible();
    await expect(page.getByText(/pakistan/i)).toHaveCount(0);
  });

  test('FH-11 Australia tax tool: A$90,000 gives the golden result, source and last-checked date', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/tools/australia-income-tax-calculator/');
    await expect(page.getByTestId('tool-result')).toContainText('$17,520');
    await expect(page.getByTestId('tool-result')).toContainText('$1,800');
    await expect(page.getByTestId('tool-source')).toContainText('Rates last checked');
    await expect(page.getByTestId('disclaimer')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('FH-12 PPF tool matches the published ₹40,68,209 for ₹1.5L over 15 years at 7.1%', async ({ page }) => {
    await page.goto('/tools/ppf-calculator/');
    await expect(page.getByTestId('tool-primary')).toHaveText('₹40,68,209');
  });

  test('FH-13 world VAT tool switches country and handles tax-inclusive prices', async ({ page }) => {
    await page.goto('/tools/world-vat-gst-calculator/');
    await page.getByTestId('in-c').selectOption('DE');
    await page.getByTestId('in-amt').fill('119');
    await page.getByTestId('in-incl').check();
    await expect(page.getByTestId('tool-result')).toContainText('19.00');
    await expect(page.getByTestId('tool-result')).toContainText('100.00');
  });

  test('FH-14 India regime tool applies separate 80D caps', async ({ page }) => {
    await page.goto('/tools/india-tax-regime-calculator/');
    await page.getByTestId('in-d80').fill('40000');
    await page.getByTestId('in-d80p').fill('60000');
    await page.getByTestId('in-psen').check();
    await expect(page.getByTestId('tool-result')).toContainText('₹75,000');
  });

  test('FH-15 pricing asks for the estimates-only acknowledgement before any purchase', async ({ page }) => {
    await page.goto('/pricing/');
    await expect(page.getByTestId('pay-ack')).toBeVisible();
    await expect(page.getByTestId('pay-ack')).toContainText('not financial, investment, tax or legal advice');
    await expect(page.getByTestId('pay-ack-box')).not.toBeChecked();
    await expect(page.getByTestId('buy-yearly')).toBeDisabled();
  });

  test('FH-17 tool heading shows the key figures beside the title', async ({ page }) => {
    await page.goto('/health-check/');
    const kpis = page.getByTestId('tool-kpis');
    await expect(kpis).toContainText('75/100');
    await expect(kpis).toContainText('Net worth');
  });

  test('FH-18 input rows have no empty cell at the end on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/health-check/');
    await page.waitForTimeout(300);
    const gaps = await page.$$eval('.fieldgrid, .fitgrid', (grids) =>
      grids.map((g) => {
        const kids = Array.from(g.children) as HTMLElement[];
        if (!kids.length) return 0;
        const right = g.getBoundingClientRect().right;
        const last = kids[kids.length - 1].getBoundingClientRect().right;
        return Math.round(right - last);
      })
    );
    for (const gap of gaps) expect(gap).toBeLessThanOrEqual(2);
  });

  test('FH-19 home hero shows the live example score card', async ({ page }) => {
    await page.goto('/');
    const hero = page.getByTestId('home-hero');
    await expect(hero.getByRole('heading', { level: 1 })).toContainText('two minutes');
    await expect(hero.getByRole('link', { name: 'Start free health check' })).toBeVisible();
    await expect(hero).toContainText('75');
    await expect(hero).toContainText('Top priority');
  });

  test('FH-20 light/dark switch changes the palette and is remembered', async ({ page }) => {
    await page.goto('/health-check/');
    const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(await bg()).toBe('rgb(245, 241, 234)');
    await page.getByTestId('theme-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect.poll(bg).toBe('rgb(20, 17, 14)');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.getByTestId('theme-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });

  test('FH-21 home bento links all six planners', async ({ page }) => {
    await page.goto('/');
    const bento = page.getByTestId('planner-bento');
    for (const name of ['Health Check', 'Debt Payoff', 'Goal Planner', 'Loan Prepayment', 'Retirement', 'My Plan']) {
      await expect(bento.getByRole('link', { name: new RegExp(name) })).toBeVisible();
    }
  });

  test('FH-16 terms carry the no-advice, accuracy and liability sections', async ({ page }) => {
    await page.goto('/terms/');
    for (const h of ['Information, not advice', 'Accuracy and estimates', 'Limitation of liability', 'Your statutory rights']) {
      await expect(page.getByRole('heading', { name: new RegExp(h) })).toBeVisible();
    }
  });
});
