import { test, expect } from "@playwright/test";
import {
  JURISDICTIONS,
  collectPageProblems,
  contrastRatio,
  measureCLS,
  numberFrom,
  toNumber,
} from "../fixtures/finealth";

/**
 * Finealth :: Web Application (apps/web)
 * Source of truth: "clearfile and finealth test cases.xlsx", rows FN-W01..FN-W06.
 *
 * These specs assert the behaviour the sheet requires. Where apps/web does not
 * implement it the assertion fails on purpose and a `known-gap` annotation names
 * the defect and its file:line, so triage does not have to rediscover it.
 */

test.describe("FN-W :: Finealth Web Application", () => {
  /* ================================================================
   * FN-W01 | Tailwind & Dark Theme
   * Steps    : Load home URL.
   * Expected : Slate/dark aesthetic renders with Tailwind styling, custom
   *            fonts, and zero unstyled text artifacts.
   * ================================================================ */
  test("FN-W01 renders the dark Tailwind theme with custom fonts and no unstyled artifacts", async ({
    page,
  }, testInfo) => {
    const { pageErrors, firstParty } = collectPageProblems(page);
    await page.goto("/");

    // --- Dark slate ground -------------------------------------------------
    // globals.css sets --background: #050508 and layout.tsx repeats it as bg-[#050508].
    const bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bodyBg, "body must paint the slate/dark ground").toBe("rgb(5, 5, 8)");

    // --- Tailwind actually compiled ---------------------------------------
    // If the stylesheet failed to build, utility classes resolve to nothing and
    // the page degrades to unstyled text. Probe a known utility.
    const brandMark = page.locator("header span.bg-emerald-400").first();
    await expect(brandMark).toBeVisible();
    const markBg = await brandMark.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(markBg, "Tailwind utilities must resolve (bg-emerald-400)").toBe("rgb(52, 211, 153)");

    // --- Foreground is readable against that ground ------------------------
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toBeVisible();
    const headingColor = await heading.evaluate((el) => getComputedStyle(el).color);
    expect(
      contrastRatio(headingColor, bodyBg),
      "h1 must clear WCAG AA (4.5:1) against the page ground"
    ).toBeGreaterThanOrEqual(4.5);

    // --- No unstyled text artifacts ---------------------------------------
    // exact:true, else the footer's "Finealth Financial Suite ..." also matches.
    await expect(page.getByText("FINEALTH", { exact: true })).toBeVisible();
    await expect(page.getByText("STATUTORY ENGINE", { exact: true })).toBeVisible();

    // First-party only: the AdSense 400s belong to FN-W06, not here.
    expect(firstParty(), "no first-party resource failed to load").toEqual([]);

    // --- Hydration ---------------------------------------------------------
    // Guards against React #418: money formatted without an explicit locale
    // renders differently on the server and in the visitor's browser.
    expect(
      pageErrors,
      "the page must hydrate without a server/client markup mismatch"
    ).toEqual([]);

    // --- Custom fonts ------------------------------------------------------
    // layout.tsx loads Inter through next/font; nothing may fall back to the
    // system stack.
    const bodyFont = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
    expect(bodyFont, "body must use the Inter web font").toMatch(/Inter/);
    expect(bodyFont.toLowerCase(), "no system-stack override").not.toContain("arial");
  });

  /* ================================================================
   * FN-W02 | Live Bullion Benchmark
   * Steps    : Load home dashboard; observe Gold (24K/22K) and Silver cards.
   * Expected : Prices, metrics, units (10g, 1kg), spreads and city tag
   *            ("Mumbai") render formatted numbers with GST tags.
   * ================================================================ */
  test("FN-W02 renders gold and silver benchmark cards with units, GST tags and city spread", async ({
    page,
  }) => {
    await page.goto("/");

    // NB exact:true throughout -- the trajectory section below repeats each
    // asset as "<name> (<unit>)", so a substring match is ambiguous.
    const card = (name: string) => page.locator("div.rounded-2xl", { hasText: name }).first();

    // --- Gold 24K ----------------------------------------------------------
    await expect(
      page.getByRole("heading", { name: "Gold (24K Pure)", exact: true })
    ).toBeVisible();
    await expect(card("Gold (24K Pure)").getByText("10 grams", { exact: true })).toBeVisible();
    await expect(
      page.getByText("+3% GST & Standard Domestic Making Charges", { exact: true })
    ).toBeVisible();

    // --- Gold 22K ----------------------------------------------------------
    await expect(
      page.getByRole("heading", { name: "Gold (22K Jewellery)", exact: true }),
      "a 22K gold benchmark card must render alongside 24K"
    ).toBeVisible();
    await expect(card("Gold (22K Jewellery)").getByText("10 grams", { exact: true })).toBeVisible();
    await expect(page.getByText("+3% GST & Hallmarking / Making Charges", { exact: true })).toBeVisible();

    // --- Silver ------------------------------------------------------------
    await expect(
      page.getByRole("heading", { name: "Silver (Fine 999)", exact: true })
    ).toBeVisible();
    await expect(page.getByText("1 Kilogram", { exact: true })).toBeVisible();
    await expect(page.getByText("+3% GST on Bullion Bars", { exact: true })).toBeVisible();

    // --- Prices are formatted, not raw floats ------------------------------
    // Labelled as reference figures: the benchmarks are static data, not a live feed.
    await expect(page.getByText("REFERENCE BENCHMARK", { exact: true })).toHaveCount(5);
    await expect(page.getByText("LIVE BENCHMARK")).toHaveCount(0);

    const goldPrice = card("Gold (24K Pure)").getByText(/^₹[\d,]+$/).first();
    await expect(goldPrice, "gold price must render as a grouped ₹ figure").toBeVisible();
    expect(await numberFrom(goldPrice)).toBeGreaterThan(0);

    // 22K tracks 24K at 916 purity.
    const gold22Price = card("Gold (22K Jewellery)").getByText(/^₹[\d,]+$/).first();
    expect(await numberFrom(gold22Price)).toBe(Math.round((await numberFrom(goldPrice)) * (22 / 24)));

    // --- City spread selector ---------------------------------------------
    const citySelect = page.locator("main select").first();
    await expect(citySelect).toBeVisible();
    await expect(citySelect).toHaveValue("Mumbai");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Mumbai");

    // Switching city must move the bullion premium (INDIAN_CITIES spread).
    const mumbaiPrice = await numberFrom(goldPrice);
    await citySelect.selectOption("Chennai");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Chennai");
    const chennaiPrice = await numberFrom(goldPrice);
    expect(chennaiPrice, "city spread must adjust the gold benchmark").not.toBe(mumbaiPrice);
  });

  /* ================================================================
   * FN-W03 | Equities Ticker
   * Steps    : Inspect NIFTY 50 and BSE SENSEX benchmark widgets.
   * Expected : Live point indices render with correct positive/negative
   *            percentage pills and capital gains tax indicators.
   * ================================================================ */
  test("FN-W03 renders NIFTY 50 and BSE SENSEX with signed change pills and CGT indicators", async ({
    page,
  }) => {
    await page.goto("/");

    for (const index of ["NIFTY 50", "BSE SENSEX"]) {
      const card = page.locator("div.rounded-2xl").filter({ hasText: index }).first();
      await expect(card, `${index} card is present`).toBeVisible();

      // Index points, not a currency figure.
      await expect(card.getByText("Equities Benchmark")).toBeVisible();
      await expect(card.getByText("Index Points", { exact: true })).toBeVisible();

      const value = card.getByText(/[\d,]+(\.\d+)? pts$/).first();
      await expect(value, `${index} renders index points`).toBeVisible();
      expect(await numberFrom(value)).toBeGreaterThan(0);

      // Signed percentage pill: ▲ green for gains, ▼ rose for losses.
      const pill = card.getByText(/^[▲▼]\s[\d.]+%$/).first();
      await expect(pill, `${index} shows a signed change pill`).toBeVisible();

      const pillText = await pill.innerText();
      const pillColor = await pill.evaluate((el) => getComputedStyle(el).color);
      if (pillText.startsWith("▲")) {
        expect(pillColor, "gains render emerald").toBe("rgb(52, 211, 153)");
      } else {
        expect(pillColor, "losses render rose").toBe("rgb(251, 113, 133)");
      }

      // Capital gains tax indicator.
      await expect(
        card.getByText("STCG 20% / LTCG 12.5%"),
        `${index} shows its capital gains indicator`
      ).toBeVisible();
    }

    // Both indices also drive the historical trajectory curves.
    await expect(
      page.getByRole("heading", { name: /Historical Trajectory/i })
    ).toBeVisible();
  });

  /* ================================================================
   * FN-W04 | Statutory Jurisdiction
   * Steps    : Switch jurisdiction/currency selector (INR -> USD etc).
   * Expected : Currency symbols update dynamically across cards;
   *            calculations recalculate based on selected currency rules.
   * ================================================================ */
  test("FN-W04 switching jurisdiction re-symbols the UI and rebases the calculators", async ({
    page,
  }) => {
    await page.goto("/");
    const currency = page.locator("header select");

    // --- Baseline: India ---------------------------------------------------
    await expect(currency).toHaveValue("INR");
    await expect(page.getByText(/JURISDICTION:.*INDIA \(INR\)/)).toBeVisible();
    await expect(page.getByRole("button", { name: JURISDICTIONS.INR.firstTool })).toBeVisible();

    const principalLabel = page
      .locator("div", { has: page.getByText("Borrowing Principal") })
      .last()
      .locator("span")
      .last();
    const inrPrincipal = await numberFrom(principalLabel);
    expect(inrPrincipal).toBe(3_500_000);

    // --- Switch to the United States --------------------------------------
    await currency.selectOption("USD");

    // Symbols and regional catalogue update.
    await expect(page.getByText(/JURISDICTION:.*UNITED STATES \(USD\)/)).toBeVisible();
    await expect(page.getByText(JURISDICTIONS.USD.exchange)).toBeVisible();
    await expect(page.getByRole("button", { name: JURISDICTIONS.USD.firstTool })).toBeVisible();
    await expect(
      page.getByRole("button", { name: JURISDICTIONS.INR.firstTool }),
      "Indian tools must not survive the switch"
    ).toHaveCount(0);
    await expect(principalLabel).toContainText("$");

    // --- Calculations must rebase to the new jurisdiction ------------------
    // Currency-dependent values reset to the new region's defaults, so the
    // label and the slider can never disagree (₹35,00,000 must not become $3,500,000).

    const principalSlider = page.locator('input[type="range"]').first();
    await expect(principalSlider).toHaveAttribute("max", String(JURISDICTIONS.USD.sliderMax));

    const usdPrincipal = await numberFrom(principalLabel);
    expect(
      usdPrincipal,
      "principal must rebase into the USD slider's range on jurisdiction switch"
    ).toBeLessThanOrEqual(JURISDICTIONS.USD.sliderMax);

    const sliderValue = toNumber(await principalSlider.inputValue());
    expect(
      sliderValue,
      "slider position and the displayed principal must agree"
    ).toBe(usdPrincipal);
  });

  /* ================================================================
   * FN-W05 | Static Route Pages
   * Steps    : Navigate to /sip-calculator, /emi-calculator, /compound-interest.
   * Expected : Routes render full mathematical input forms with visual
   *            breakdown charts (Invested vs Return).
   * ================================================================ */
  const ROUTES = [
    { path: "/sip-calculator", heading: "SIP Wealth Compounder" },
    { path: "/emi-calculator", heading: "EMI & Debt Schedule" },
    { path: "/compound-interest", heading: "Compound Interest Engine" },
  ];

  for (const route of ROUTES) {
    test(`FN-W05 ${route.path} renders its input form and breakdown chart`, async ({
      page,
    }) => {
      const { firstParty } = collectPageProblems(page);

      const response = await page.goto(route.path);
      expect(response?.status(), `${route.path} returns 200`).toBe(200);

      // --- Mathematical input form ------------------------------------------
      await expect(page.getByRole("heading", { name: route.heading })).toBeVisible();
      const sliders = page.locator('input[type="range"]');
      expect(await sliders.count(), "route exposes calculator inputs").toBeGreaterThanOrEqual(2);

      // --- Inputs drive the output ------------------------------------------
      const before = await page.locator("body").innerText();
      await sliders.first().evaluate((el) => {
        const input = el as HTMLInputElement;
        const setter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          "value"
        )!.set!;
        setter.call(input, input.max);
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      });
      await expect
        .poll(async () => page.locator("body").innerText(), {
          message: "moving an input must recompute the projection",
        })
        .not.toBe(before);

      expect(firstParty(), `${route.path} loads all of its own assets`).toEqual([]);

      // --- Text is legible against the inherited dark ground ----------------
      const heading = page.getByRole("heading", { name: route.heading });
      const fg = await heading.evaluate((el) => getComputedStyle(el).color);
      const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      expect(
        contrastRatio(fg, bg),
        `${route.path} heading must clear WCAG AA against the page ground`
      ).toBeGreaterThanOrEqual(4.5);

      // --- Visual breakdown chart (Invested vs Return) ----------------------
      await expect(
        page.locator("svg").first(),
        `${route.path} must render a visual breakdown chart`
      ).toBeVisible();
    });
  }

  /* ================================================================
   * FN-W06 | Monetization & Ads
   * Steps    : Inspect /ads.txt and the AdSense banner containers.
   * Expected : ads.txt returns raw text format; AdSense banner components
   *            mount without layout shift (CLS).
   * ================================================================ */
  test("FN-W06 serves a valid ads.txt and mounts AdSense slots without layout shift", async ({
    page,
    request,
  }, testInfo) => {
    // --- ads.txt -----------------------------------------------------------
    const adsTxt = await request.get("/ads.txt");
    expect(adsTxt.status(), "/ads.txt returns 200").toBe(200);
    expect(
      adsTxt.headers()["content-type"] ?? "",
      "/ads.txt is served as raw text, not HTML"
    ).toContain("text/plain");

    const body = (await adsTxt.text()).trim();
    // IAB ads.txt record: <domain>, <publisher id>, <DIRECT|RESELLER>, <cert authority id>
    expect(body).toMatch(/^google\.com,\s*pub-\d{16},\s*(DIRECT|RESELLER),\s*[a-f0-9]{16}$/im);

    const declaredPubId = body.match(/pub-\d{16}/)?.[0];
    expect(declaredPubId).toBeTruthy();

    // --- AdSense loader ----------------------------------------------------
    await page.goto("/");
    // Match the loader itself: once it runs with a valid publisher id it injects
    // further scripts from the same host (show_ads_impl*.js).
    const loader = page.locator('script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]');

    // strategy="afterInteractive" means the tag is absent from the SSR HTML and
    // injected only once React hydrates, so this has to wait rather than count
    // immediately. Scripts are never "visible", hence toBeAttached().
    await expect(loader.first(), "AdSense loader script is injected").toBeAttached({
      timeout: 15_000,
    });
    const loaderCount = await loader.count();
    if (loaderCount > 1) {
      testInfo.annotations.push({
        type: "note",
        description:
          `AdSense loader appears ${loaderCount}x in the DOM (next/script SSR tag + ` +
          "client re-injection). Worth confirming in production -- Google asks that " +
          "adsbygoogle.js load once per page.",
      });
    }

    const loaderSrc = (await loader.first().getAttribute("src")) ?? "";
    expect(loaderSrc).toContain("adsbygoogle.js");

    // --- Publisher id must match the one ads.txt authorises ----------------
    expect(
      loaderSrc,
      "loader must request the publisher id declared in ads.txt"
    ).toContain(`client=ca-${declaredPubId}`);

    // --- Banner slots ------------------------------------------------------
    // Units render only when real slot ids are configured
    // (NEXT_PUBLIC_ADSENSE_SLOT_*), so no placeholder unit reaches Google.
    // Whatever does render must be a well-formed unit for the same publisher.
    // Excludes the hidden `adsbygoogle-noablate` element Google's script injects
    // for itself once it runs with a valid publisher id.
    const slots = page.locator("ins.adsbygoogle:not(.adsbygoogle-noablate)");
    const slotCount = await slots.count();
    testInfo.annotations.push({
      type: "note",
      description: slotCount
        ? `${slotCount} ad unit(s) rendered from configured slot ids.`
        : "No NEXT_PUBLIC_ADSENSE_SLOT_* ids configured, so no ad units rendered.",
    });
    for (let i = 0; i < slotCount; i++) {
      const slot = slots.nth(i);
      await expect(slot).toHaveAttribute("data-ad-slot", /^\d+$/);
      await expect(slot).toHaveAttribute("data-ad-client", `ca-${declaredPubId}`);
    }

    // --- Cumulative Layout Shift ------------------------------------------
    await page.goto("/");
    const cls = await measureCLS(page);
    expect(cls, `banner mount must stay within the CWV "good" CLS budget (got ${cls})`).toBeLessThan(
      0.1
    );
  });
});
