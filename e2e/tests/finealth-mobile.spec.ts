import { test, expect } from "@playwright/test";
import {
  collectPageProblems,
  dismissSplash,
  dockButton,
  hasHorizontalOverflow,
  numberFrom,
  openMobileApp,
  setSlider,
  toolButton,
} from "../fixtures/finealth";

/**
 * Finealth :: Mobile Application (apps/mobile, Capacitor / Android WebView)
 * Source of truth: "clearfile and finealth test cases.xlsx", rows FN-M01..FN-M07.
 *
 * apps/mobile is `output: "export"` (next.config.ts) loaded from webDir "out" by
 * Capacitor, so the DOM exercised here is exactly the DOM the APK renders. The
 * two assertions that need real hardware -- the native status bar inset and an
 * OS-level airplane mode -- are carried by tests/native/ under Appium instead.
 */

test.describe("FN-M :: Finealth Mobile Application (WebView layer)", () => {
  /* ================================================================
   * FN-M01 | App Shell & Native Header
   * Steps    : Open Android app; check status bar padding and top brand header.
   * Expected : Top bar renders branding; status bar integrates cleanly with
   *            Android system UI without overlapping notches.
   * ================================================================ */
  test("FN-M01 app shell renders the brand header and reserves the status-bar inset", async ({
    page,
  }) => {
    const { failedRequests } = collectPageProblems(page);
    await openMobileApp(page);

    // --- Brand header ------------------------------------------------------
    const header = page.locator("header");
    await expect(header).toBeVisible();
    await expect(header.getByText("finealth", { exact: true })).toBeVisible();
    const logo = header.getByRole("img", { name: "Finealth Logo" });
    await expect(logo).toBeVisible();
    expect(
      await logo.evaluate((img) => (img as HTMLImageElement).naturalWidth),
      "brand logo must decode, not render as a broken image"
    ).toBeGreaterThan(0);
    await expect(header.getByText("/ wealth")).toBeVisible();

    // --- viewport-fit=cover is required for env(safe-area-inset-*) to resolve
    const viewportMeta = await page
      .locator('meta[name="viewport"]')
      .getAttribute("content");
    expect(viewportMeta, "viewport must opt into the display cutout").toContain(
      "viewport-fit=cover"
    );

    // --- Safe-area padding is actually applied to the shell ----------------
    await expect(header).toHaveClass(/safe-top/);
    await expect(page.locator("footer")).toHaveClass(/safe-bottom/);

    // .safe-top resolves env(safe-area-inset-top, 0px); the fallback is what a
    // notchless emulation reports, so we assert the declaration resolves rather
    // than a specific pixel value. The physical-device inset is FN-M01/native.
    const paddingTop = await header.evaluate((el) => getComputedStyle(el).paddingTop);
    expect(paddingTop, "safe-top must resolve to a concrete inset").toMatch(/^\d+(\.\d+)?px$/);

    // --- Shell chrome does not overflow the viewport -----------------------
    expect(await hasHorizontalOverflow(page), "no horizontal overflow at phone width").toBe(
      false
    );

    // --- Brand logo asset --------------------------------------------------
    // Splash and header both load /logo.png; it must ship with the export.
    expect(
      failedRequests.filter((r) => r.includes("logo")),
      "brand logo must resolve"
    ).toEqual([]);
  });

  /* ================================================================
   * FN-M02 | SIP Wealth Accumulator
   * Steps    : Navigate to Wealth -> SIP; adjust Monthly Investment,
   *            Expected Return and Tenure sliders.
   * Expected : Maturity Balance, Total Invested and Estimated Profit
   *            recalculate in real-time with localized currency formatting.
   * ================================================================ */
  test("FN-M02 SIP accumulator recalculates all three outputs in real time", async ({
    page,
  }) => {
    await openMobileApp(page);

    await dockButton(page, "Wealth").click();
    await toolButton(page, "SIP Engine").click();
    await expect(page.getByRole("heading", { name: "SIP Wealth Accumulator" })).toBeVisible();

    const maturity = page.locator("div.text-3xl").first();
    const invested = page
      .getByText("Total Invested", { exact: true })
      .locator("xpath=following-sibling::span[1]");
    const profit = page
      .getByText("Estimated Profit", { exact: true })
      .locator("xpath=following-sibling::span[1]");

    // --- Localized INR formatting (Intl en-IN => lakh/crore grouping) -------
    for (const field of [maturity, invested, profit]) {
      await expect(field).toHaveText(/^\+?₹[\d,]+$/);
    }
    await expect(invested, "en-IN grouping, not en-US thousands").toHaveText(
      /₹\d{1,2},\d{2},\d{3}/
    );

    const baseline = {
      maturity: await numberFrom(maturity),
      invested: await numberFrom(invested),
      profit: await numberFrom(profit),
    };

    // Defaults: ₹15,000/mo at 12% for 15 years.
    expect(baseline.invested).toBe(15_000 * 12 * 15);
    expect(baseline.maturity).toBeGreaterThan(baseline.invested);
    expect(baseline.profit).toBe(baseline.maturity - baseline.invested);

    // --- Monthly Investment ------------------------------------------------
    const sliders = page.locator('main input[type="range"]');
    await setSlider(sliders.nth(0), 30_000);
    await expect
      .poll(async () => numberFrom(invested), { message: "doubling the SIP doubles capital" })
      .toBe(30_000 * 12 * 15);

    // --- Expected Return ---------------------------------------------------
    const afterDeposit = await numberFrom(maturity);
    await setSlider(sliders.nth(1), 18);
    await expect
      .poll(async () => numberFrom(maturity), { message: "a higher CAGR lifts maturity" })
      .toBeGreaterThan(afterDeposit);
    expect(
      await numberFrom(invested),
      "return rate must not change invested capital"
    ).toBe(30_000 * 12 * 15);

    // --- Tenure ------------------------------------------------------------
    const afterRate = await numberFrom(maturity);
    await setSlider(sliders.nth(2), 25);
    await expect
      .poll(async () => numberFrom(maturity), { message: "a longer horizon lifts maturity" })
      .toBeGreaterThan(afterRate);

    // Invariant across every permutation.
    expect(await numberFrom(profit)).toBe(
      (await numberFrom(maturity)) - (await numberFrom(invested))
    );
  });

  /* ================================================================
   * FN-M03 | Annual Step-Up Feature
   * Steps    : Toggle Step-Up checkbox; adjust yearly increment percentage.
   * Expected : Projections adjust compound curve upward to account for
   *            tiered annual investment increments.
   * ================================================================ */
  test("FN-M03 annual step-up lifts the compound curve as the increment rises", async ({
    page,
  }) => {
    await openMobileApp(page);
    await toolButton(page, "SIP Engine").click();

    const maturity = page.locator("div.text-3xl").first();
    const invested = page
      .getByText("Total Invested", { exact: true })
      .locator("xpath=following-sibling::span[1]");
    const stepUpToggle = page.getByRole("checkbox");

    const flat = {
      maturity: await numberFrom(maturity),
      invested: await numberFrom(invested),
    };
    await expect(stepUpToggle).not.toBeChecked();

    // --- Enable step-up ----------------------------------------------------
    await stepUpToggle.check();
    await expect(stepUpToggle).toBeChecked();

    await expect
      .poll(async () => numberFrom(invested), {
        message: "tiered increments raise total capital deployed",
      })
      .toBeGreaterThan(flat.invested);
    expect(
      await numberFrom(maturity),
      "the compound curve must shift upward"
    ).toBeGreaterThan(flat.maturity);

    // --- Raise the yearly increment ---------------------------------------
    // With step-up on, page.tsx renders a fourth slider for the increment %.
    const sliders = page.locator('main input[type="range"]');
    await expect(sliders).toHaveCount(4);

    const atTenPct = await numberFrom(maturity);
    await setSlider(sliders.nth(3), 20);
    await expect
      .poll(async () => numberFrom(maturity), {
        message: "a steeper increment compounds higher still",
      })
      .toBeGreaterThan(atTenPct);

    // --- Disabling restores the flat projection ---------------------------
    await stepUpToggle.uncheck();
    await expect.poll(async () => numberFrom(invested)).toBe(flat.invested);
    expect(await numberFrom(maturity)).toBe(flat.maturity);
  });

  /* ================================================================
   * FN-M04 | Loan / EMI Engine
   * Steps    : Navigate to Debts tab; input Principal, Interest Rate and Tenure.
   * Expected : EMI displays exact monthly liability; breakdown chart updates
   *            Principal vs Interest ratio dynamically.
   * ================================================================ */
  test("FN-M04 EMI engine computes the exact monthly liability and updates the split", async ({
    page,
  }) => {
    await openMobileApp(page);

    await dockButton(page, "Debts").click();
    await expect(page.locator("header").getByText("/ debts")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Loan Repayment & EMI" })).toBeVisible();

    const emi = page.locator("div.text-3xl").first();
    const interest = page
      .getByText("Total Interest", { exact: true })
      .locator("xpath=following-sibling::span[1]");

    await expect(emi).toHaveText(/^₹[\d,]+$/);

    // --- Exact amortization parity ----------------------------------------
    // EMI = P*r*(1+r)^n / ((1+r)^n - 1), diminishing balance.
    const sliders = page.locator('main input[type="range"]');
    const [principal, rate, years] = [2_500_000, 9, 20];

    await setSlider(sliders.nth(0), principal);
    await setSlider(sliders.nth(1), rate);
    await setSlider(sliders.nth(2), years);

    const r = rate / 12 / 100;
    const n = years * 12;
    const expectedEmi = Math.round((principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));

    await expect
      .poll(async () => numberFrom(emi), { message: "EMI matches the closed-form result" })
      // inr() rounds for display, so allow a single rupee of presentation drift.
      .toBeGreaterThanOrEqual(expectedEmi - 1);
    expect(await numberFrom(emi)).toBeLessThanOrEqual(expectedEmi + 1);

    // --- Total interest is consistent with the schedule --------------------
    const totalInterest = await numberFrom(interest);
    expect(totalInterest).toBeGreaterThan(0);
    expect(Math.abs(totalInterest - (expectedEmi * n - principal))).toBeLessThanOrEqual(n);

    // --- Principal vs Interest breakdown chart ----------------------------
    const principalPct = page.getByText(/^Principal \d+%$/);
    await expect(principalPct, "EMI panel shows the principal share").toBeVisible();
    await expect(page.locator('main div[style*="width"]').first()).toBeVisible();
    const principalShareAt9 = await numberFrom(principalPct);

    // --- Raising the rate raises the interest owed ------------------------
    await setSlider(sliders.nth(1), 16);
    await expect
      .poll(async () => numberFrom(interest), { message: "a costlier loan owes more interest" })
      .toBeGreaterThan(totalInterest);
    await expect(page.getByText("Total Principal + Interest", { exact: true })).toBeVisible();

    await expect
      .poll(async () => numberFrom(principalPct), {
        message: "the principal/interest split redraws with a costlier loan",
      })
      .toBeLessThan(principalShareAt9);
  });

  /* ================================================================
   * FN-M05 | SWP & Fixed Deposit
   * Steps    : Test Lump Sum and SWP Cashflow calculator tabs.
   * Expected : Monthly cash flow or FD maturity proceeds render accurately
   *            according to compounding frequencies.
   * ================================================================ */
  test("FN-M05 SWP cashflow and FD maturity respect withdrawals and compounding frequency", async ({
    page,
  }) => {
    await openMobileApp(page);
    await dockButton(page, "Wealth").click();

    // --- Lump Sum ----------------------------------------------------------
    await toolButton(page, "Lump Sum").click();
    await expect(page.getByRole("heading", { name: "Lump Sum Deposit Growth" })).toBeVisible();
    const lumpMaturity = page.locator("div.text-3xl").first();
    await expect(lumpMaturity).toHaveText(/^₹[\d,]+$/);
    expect(await numberFrom(lumpMaturity)).toBeGreaterThan(0);

    // --- SWP Cashflow ------------------------------------------------------
    await toolButton(page, "SWP Cashflow").click();
    await expect(page.getByRole("heading", { name: "Systematic Withdrawal (SWP)" })).toBeVisible();

    const remaining = page.locator("div.text-3xl").first();
    const received = page
      .getByText("Total Money Received", { exact: true })
      .locator("xpath=following-sibling::span[1]");
    const corpus = page
      .getByText("Initial Corpus", { exact: true })
      .locator("xpath=following-sibling::span[1]");

    const initialCorpus = await numberFrom(corpus);
    const baselineRemaining = await numberFrom(remaining);
    expect(await numberFrom(received)).toBeGreaterThan(0);

    // A larger monthly withdrawal must drain the corpus faster.
    const swpSliders = page.locator('main input[type="range"]');
    await setSlider(swpSliders.nth(1), 60_000);
    await expect
      .poll(async () => numberFrom(remaining), {
        message: "heavier withdrawals leave a smaller balance",
      })
      .toBeLessThan(baselineRemaining);
    expect(
      await numberFrom(corpus),
      "withdrawal rate must not alter the initial corpus"
    ).toBe(initialCorpus);

    // --- Fixed Deposit: compounding frequency -----------------------------
    await toolButton(page, "Fixed Deposit").click();
    await expect(page.getByRole("heading", { name: "Fixed Deposit (Compounded)" })).toBeVisible();
    await expect(page.getByText("Compounding Schedule", { exact: true })).toBeVisible();

    const proceeds = page.locator("div.text-3xl").first();
    await expect(proceeds).toHaveText(/^₹[\d,]+$/);

    // On identical principal/rate/tenure, maturity must rise strictly with
    // compounding frequency: Annually (n=1) < Quarterly (n=4) < Monthly (n=12).
    // NB the buttons are laid out Quarterly / Monthly / Annually, so address
    // them by name rather than by index.
    const frequency = (label: string) =>
      page.locator("main").getByRole("button", { name: label, exact: true });

    await frequency("Annually").click();
    const annually = await numberFrom(proceeds);

    await frequency("Quarterly").click();
    await expect
      .poll(async () => numberFrom(proceeds), { message: "quarterly beats annual" })
      .toBeGreaterThan(annually);
    const quarterly = await numberFrom(proceeds);

    await frequency("Monthly").click();
    await expect
      .poll(async () => numberFrom(proceeds), { message: "monthly beats quarterly" })
      .toBeGreaterThan(quarterly);
  });

  /* ================================================================
   * FN-M06 | Native Tab Bar
   * Steps    : Tap between "Wealth", "Income", "Debts" and "Macro".
   * Expected : Selected view updates smoothly without full page reloads;
   *            input states persist across tab switches.
   * ================================================================ */
  test("FN-M06 bottom dock switches categories without reload and preserves input state", async ({
    page,
  }) => {
    await openMobileApp(page);

    // Tag the document so any full reload is detectable.
    await page.evaluate(() => {
      (window as unknown as { __noReload: boolean }).__noReload = true;
    });

    // --- Seed a value we can look for after a round trip -------------------
    await toolButton(page, "SIP Engine").click();
    const sipSliders = page.locator('main input[type="range"]');
    await setSlider(sipSliders.nth(0), 42_500);
    const invested = page
      .getByText("Total Invested", { exact: true })
      .locator("xpath=following-sibling::span[1]");
    await expect.poll(async () => numberFrom(invested)).toBe(42_500 * 12 * 15);

    // --- Walk every category ----------------------------------------------
    // Selecting a category auto-selects its first tool (handleCategorySwitch),
    // so each entry pairs the dock label with that tool's *panel heading* --
    // which is not the same string as the tool button ("In-Hand Salary" is the
    // button; "Annual CTC to Take-Home" is the heading it opens).
    const CATEGORIES = [
      { label: "Income", slug: "/ income", panelHeading: "Annual CTC to Take-Home" },
      { label: "Debts", slug: "/ debts", panelHeading: "Loan Repayment & EMI" },
      { label: "Macro", slug: "/ macro", panelHeading: "Purchasing Power Reality" },
      { label: "Wealth", slug: "/ wealth", panelHeading: "SIP Wealth Accumulator" },
    ];

    for (const category of CATEGORIES) {
      await dockButton(page, category.label).click();
      await expect(page.locator("header").getByText(category.slug)).toBeVisible();
      await expect(
        page.getByRole("heading", { name: category.panelHeading })
      ).toBeVisible();

      // Active pill styling follows the selection.
      const activeLabel = page.locator("footer").getByText(category.label, { exact: true });
      await expect(activeLabel).toHaveClass(/text-zinc-100/);
    }

    // --- No full page reload ----------------------------------------------
    expect(
      await page.evaluate(() => (window as unknown as { __noReload?: boolean }).__noReload),
      "category switching must not reload the document"
    ).toBe(true);

    // --- Input state survived the round trip -------------------------------
    await expect(page.getByRole("heading", { name: "SIP Wealth Accumulator" })).toBeVisible();
    expect(
      await numberFrom(invested),
      "SIP input must persist across category switches"
    ).toBe(42_500 * 12 * 15);

  });

  /* ================================================================
   * FN-M07 | Offline Operation
   * Steps    : Put device into Airplane Mode; modify sliders and recalculate.
   * Expected : All computations execute locally on device via JavaScript
   *            without network dependency errors.
   * ================================================================ */
  test("FN-M07 every engine keeps computing with the network cut", async ({ page, context }) => {
    const { consoleErrors } = collectPageProblems(page);
    await openMobileApp(page);

    // --- Cut the network ---------------------------------------------------
    await context.setOffline(true);
    expect(await page.evaluate(() => navigator.onLine)).toBe(false);

    // Only errors raised from here on belong to this test. Anything logged
    // during load (notably the missing /logo.png) is FN-M01's finding, and
    // re-reporting it here would blame the wrong defect.
    const errorsBeforeOffline = consoleErrors.length;

    // --- SIP still computes ------------------------------------------------
    await dockButton(page, "Wealth").click();
    await toolButton(page, "SIP Engine").click();
    const maturity = page.locator("div.text-3xl").first();
    const offlineBaseline = await numberFrom(maturity);

    await setSlider(page.locator('main input[type="range"]').nth(0), 55_000);
    await expect
      .poll(async () => numberFrom(maturity), { message: "SIP recomputes offline" })
      .toBeGreaterThan(offlineBaseline);

    // --- Every category still renders and computes offline -----------------
    const OFFLINE_CHECKS = [
      { category: "Income", heading: "Annual CTC to Take-Home" },
      { category: "Debts", heading: "Loan Repayment & EMI" },
      { category: "Macro", heading: "Purchasing Power Reality" },
    ];

    for (const check of OFFLINE_CHECKS) {
      await dockButton(page, check.category).click();
      await expect(page.getByRole("heading", { name: check.heading })).toBeVisible();

      const output = page.locator("div.text-3xl").first();
      await expect(output).toHaveText(/₹[\d,]+/);

      const before = await numberFrom(output);
      const slider = page.locator('main input[type="range"]').first();
      const max = Number(await slider.getAttribute("max"));
      const min = Number(await slider.getAttribute("min"));
      expect(Number.isFinite(max) && Number.isFinite(min), "slider declares its range").toBe(true);
      await setSlider(slider, Math.round(min + (max - min) * 0.8));
      await expect
        .poll(async () => numberFrom(output), {
          message: `${check.category} recomputes offline`,
        })
        .not.toBe(before);
    }

    // --- No network-dependency errors surfaced ----------------------------
    // The engines are pure JavaScript, so cutting the radio must not surface a
    // single fetch/XHR failure. (apps/web's CurrencyProvider polls a forex API
    // every 10s; apps/mobile deliberately has no such dependency, and this
    // assertion is what keeps it that way.)
    const networkErrors = consoleErrors
      .slice(errorsBeforeOffline)
      .filter((e) => /fetch|xhr|err_internet|err_network|networkerror/i.test(e));
    expect(networkErrors, "offline computation must not raise network errors").toEqual([]);

    await context.setOffline(false);
  });
});
