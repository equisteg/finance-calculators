import { Page, Locator, TestInfo, expect } from "@playwright/test";

/* ------------------------------------------------------------------ *
 * Shared helpers for the Finealth web + mobile-WebView specs.
 * ------------------------------------------------------------------ */

/**
 * Records a known spec/implementation gap on the test so the HTML report
 * explains *why* an assertion below it is expected to go red, instead of
 * leaving whoever triages CI to rediscover it.
 *
 * Per the agreed policy these tests assert the behaviour the test-case
 * sheet specifies. Where the shipped code does not implement it, the test
 * fails on purpose and this annotation names the defect and its location.
 */
export function knownGap(testInfo: TestInfo, description: string, location: string) {
  testInfo.annotations.push({
    type: "known-gap",
    description: `${description}  [${location}]`,
  });
}

/** Strips currency symbols, thin spaces and grouping separators: "₹1,50,000" -> 150000 */
export function toNumber(raw: string | null): number {
  if (!raw) return NaN;
  const cleaned = raw.replace(/[^\d.-]/g, "");
  return cleaned === "" ? NaN : Number(cleaned);
}

/** Reads the numeric value out of an element's text content. */
export async function numberFrom(locator: Locator): Promise<number> {
  return toNumber(await locator.first().innerText());
}

/**
 * apps/mobile renders SplashSequence as a `fixed inset-0` overlay at z-index
 * 99999 that only unmounts on a 2200ms timer (SplashSequence.tsx:37). Until
 * then every click lands on the splash instead of the app, so each mobile
 * test must wait it out first.
 */
export async function dismissSplash(page: Page) {
  // The tagline is unique to the splash; the header brand text is not.
  await page
    .getByText("Autonomous Wealth Architecture")
    .waitFor({ state: "detached", timeout: 20_000 });
}

/** Opens the mobile app and waits for it to become interactive. */
export async function openMobileApp(page: Page, path = "/") {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await dismissSplash(page);
  await expect(dockButton(page, "Wealth")).toBeVisible();
}

/**
 * Bottom dock category button (Wealth | Income | Debts | Macro).
 * Each button pairs a glyph span with the label, so its accessible name is
 * "▲ Wealth" -- matched by substring rather than exactly.
 */
export function dockButton(page: Page, label: string): Locator {
  return page.locator("footer").getByRole("button", { name: label });
}

/** Contextual tool button in the header sub-bar ("SIP Engine", "Loan & EMI", ...). */
export function toolButton(page: Page, name: string): Locator {
  return page.locator("header").getByRole("button", { name, exact: true });
}

/**
 * Reads the value rendered beside a label inside one of the mobile result
 * cards, e.g. resultValue(page, "Total Invested").
 */
export function resultValue(page: Page, label: string): Locator {
  return page
    .locator("div", { has: page.getByText(label, { exact: true }) })
    .last()
    .locator("span")
    .last();
}

/**
 * Cumulative Layout Shift over `windowMs`, measured the same way Core Web
 * Vitals does (ignoring shifts that follow recent user input). Chromium only.
 */
export async function measureCLS(page: Page, windowMs = 3000): Promise<number> {
  return page.evaluate(
    (ms) =>
      new Promise<number>((resolve) => {
        let cls = 0;
        let observer: PerformanceObserver;
        try {
          observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries() as unknown as Array<{
              value: number;
              hadRecentInput: boolean;
            }>) {
              if (!entry.hadRecentInput) cls += entry.value;
            }
          });
          observer.observe({ type: "layout-shift", buffered: true });
        } catch {
          resolve(0); // layout-shift unsupported
          return;
        }
        setTimeout(() => {
          observer.disconnect();
          resolve(Number(cls.toFixed(4)));
        }, ms);
      }),
    windowMs
  );
}

/**
 * Collects console errors, uncaught exceptions and failed requests for the
 * lifetime of a page.
 *
 * `firstParty()` narrows failed requests to the application's own origin.
 * Third-party ad/analytics failures are deliberately excluded from the general
 * health checks -- they are owned by FN-W06, and letting them bleed into every
 * other test would make the whole suite red whenever an ad network is
 * unreachable from the build agent.
 */
export function collectPageProblems(page: Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => {
    pageErrors.push(err.message.split("\n")[0]);
  });
  page.on("response", (res) => {
    if (res.status() >= 400) failedRequests.push(`${res.status()} ${res.url()}`);
  });

  const firstParty = () => {
    const origin = new URL(page.url()).origin;
    return failedRequests.filter((entry) => entry.includes(origin));
  };

  return { consoleErrors, pageErrors, failedRequests, firstParty };
}

/** Relative luminance per WCAG 2.1, from an "rgb(r, g, b)" string. */
export function luminance(rgb: string): number {
  const [r, g, b] = (rgb.match(/\d+(\.\d+)?/g) ?? ["0", "0", "0"]).slice(0, 3).map(Number);
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio between two "rgb(...)" colour strings. */
export function contrastRatio(fg: string, bg: string): number {
  const a = luminance(fg);
  const b = luminance(bg);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return Number(((hi + 0.05) / (lo + 0.05)).toFixed(2));
}

/** True when the document scrolls sideways at the current viewport. */
export async function hasHorizontalOverflow(page: Page): Promise<boolean> {
  return page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
  );
}

/** Drives a native range input and fires the events React listens for. */
export async function setSlider(slider: Locator, value: number) {
  await slider.evaluate((el, v) => {
    const input = el as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value"
    )!.set!;
    setter.call(input, String(v));
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
}

/**
 * The four jurisdictions offered by the web header's currency selector,
 * mirroring REGIONAL_PRIORITY_DATA in apps/web/src/app/context/CurrencyContext.tsx.
 */
export const JURISDICTIONS = {
  INR: {
    symbol: "₹",
    name: "India",
    exchange: "NSE, BSE & IBJA",
    firstTool: "Loan EMI & Amortization",
    sliderMax: 25_000_000,
  },
  USD: {
    symbol: "$",
    name: "United States",
    exchange: "NYSE, NASDAQ & CBOE",
    firstTool: "30-Yr Mortgage & PITI",
    sliderMax: 2_000_000,
  },
  EUR: {
    symbol: "€",
    name: "European Union",
    exchange: "Deutsche Börse & Euronext",
    firstTool: "Euribor Variable Mortgage",
    sliderMax: 2_000_000,
  },
  GBP: {
    symbol: "£",
    name: "United Kingdom",
    exchange: "London Stock Exchange (LSE) & LBMA",
    firstTool: "Repayment Mortgage",
    sliderMax: 2_000_000,
  },
} as const;
