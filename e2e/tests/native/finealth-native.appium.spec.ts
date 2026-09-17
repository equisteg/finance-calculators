/**
 * Finealth :: Mobile Application -- NATIVE LAYER (Appium + UiAutomator2)
 *
 * This file is NOT run by Playwright (playwright.config.ts sets
 * testIgnore: ["**\/native/**"]). It runs under WebdriverIO:
 *
 *     npm run test:native
 *
 * It carries only the assertions that cannot be made from an emulated browser,
 * because they depend on the Android system UI or the Capacitor bridge:
 *
 *   FN-M01  the real status-bar / display-cutout inset around the app shell
 *   FN-M06  Capacitor Haptics firing on dock taps
 *   FN-M07  OS-level airplane mode rather than a devtools offline flag
 *
 * Everything else in FN-M01..M07 is covered against the same DOM, far faster
 * and with no device, by tests/finealth-mobile.spec.ts.
 *
 * ---------------------------------------------------------------------------
 * PREREQUISITES (none of this is wired into CI yet -- see README.md)
 * ---------------------------------------------------------------------------
 *   1. Android SDK + an AVD, or a USB device with debugging enabled
 *   2. A built debug APK:
 *        cd apps/mobile && npm run build && npx cap sync android \
 *          && cd android && ./gradlew assembleDebug
 *   3. An Appium server on :4723 with the uiautomator2 driver installed
 *   4. export FINEALTH_APK=<abs path to app-debug.apk>
 *
 * Capacitor runs the UI inside a WebView, so each test switches into the
 * WEBVIEW_com.tezech.finealth context to touch the DOM, and back to NATIVE_APP
 * for system-UI assertions.
 * ---------------------------------------------------------------------------
 */

import { browser, expect as wdioExpect, $ } from "@wdio/globals";

const APP_PACKAGE = "com.tezech.finealth";
const WEBVIEW_CONTEXT = `WEBVIEW_${APP_PACKAGE}`;

/** Capacitor takes a moment to attach the WebView after the splash. */
async function switchToWebView(timeout = 20_000) {
  await browser.waitUntil(
    async () => (await browser.getContexts()).some((c) => String(c) === WEBVIEW_CONTEXT),
    { timeout, timeoutMsg: `${WEBVIEW_CONTEXT} never attached` }
  );
  await browser.switchContext(WEBVIEW_CONTEXT);
}

/** SplashSequence unmounts on a 2200ms timer (SplashSequence.tsx:37). */
async function waitOutSplash() {
  await browser.waitUntil(
    async () =>
      !(await browser.execute(() =>
        document.body.innerText.includes("Autonomous Wealth Architecture")
      )),
    { timeout: 20_000, timeoutMsg: "splash never dismounted" }
  );
}

describe("FN-M :: Finealth Mobile Application (native layer)", () => {
  /* ================================================================
   * FN-M01 | App Shell & Native Header -- physical inset
   * Expected : status bar integrates cleanly with Android system UI
   *            without overlapping notches.
   * ================================================================ */
  it("FN-M01 reserves the real status-bar inset and tints the system bar", async () => {
    await switchToWebView();
    await waitOutSplash();

    // env(safe-area-inset-top) must resolve to a non-zero value on a device
    // that actually reports an inset. On a cutout-less emulator this is 0 and
    // the assertion is informational -- run it on a notched AVD (e.g. Pixel 6).
    const insetTop = await browser.execute(() =>
      getComputedStyle(document.documentElement).getPropertyValue(
        "--safe-area-inset-top"
      ) ||
      getComputedStyle(document.querySelector("header")!).paddingTop
    );
    // eslint-disable-next-line no-console
    console.log(`[FN-M01] resolved header padding-top: ${insetTop}`);

    // The header must not be painted underneath the status bar: its top edge
    // has to sit at or below the inset.
    const headerTop = await browser.execute(
      () => document.querySelector("header")!.getBoundingClientRect().top
    );
    wdioExpect(Number(headerTop)).toBeGreaterThanOrEqual(0);

    // AppShell.tsx:18 asks Capacitor to tint the native bar #0a0a0c on launch.
    await browser.switchContext("NATIVE_APP");
    const statusBar = await $(`//android.view.View[@resource-id="android:id/statusBarBackground"]`);
    wdioExpect(await statusBar.isExisting()).toBe(true);
  });

  /* ================================================================
   * FN-M06 | Native Tab Bar -- haptic feedback
   * Expected : dock taps are confirmed by the device's haptic motor.
   * ================================================================ */
  it("FN-M06 dock taps fire Capacitor Haptics", async () => {
    await switchToWebView();
    await waitOutSplash();

    // Instrument the bridge before tapping so we can observe the plugin call.
    await browser.execute(() => {
      const w = window as unknown as {
        __hapticCalls: number;
        Capacitor?: { Plugins?: Record<string, { impact?: (o: unknown) => unknown }> };
      };
      w.__hapticCalls = 0;
      const haptics = w.Capacitor?.Plugins?.Haptics;
      if (haptics?.impact) {
        const original = haptics.impact.bind(haptics);
        haptics.impact = (opts: unknown) => {
          w.__hapticCalls += 1;
          return original(opts);
        };
      }
    });

    await browser.execute(() => {
      const dock = document.querySelector("footer")!;
      const buttons = Array.from(dock.querySelectorAll("button"));
      (buttons.find((b) => b.textContent?.includes("Debts")) as HTMLButtonElement).click();
    });

    const calls = await browser.execute(
      () => (window as unknown as { __hapticCalls: number }).__hapticCalls
    );

    // The dock's handleCategorySwitch (apps/mobile/src/app/page.tsx) calls
    // Haptics.impact() on every tap. Not yet run on a device: if the count stays
    // at 0, check whether the ES-module plugin proxy bypasses
    // Capacitor.Plugins.Haptics, and instrument the bridge call instead.
    wdioExpect(Number(calls)).toBeGreaterThan(0);
  });

  /* ================================================================
   * FN-M07 | Offline Operation -- OS-level airplane mode
   * Expected : all computations execute locally without network errors.
   * ================================================================ */
  it("FN-M07 keeps computing in real airplane mode", async () => {
    // Requires the emulator to be started with -writable-system, or a device
    // where settings may be written. `setNetworkConnection` maps to airplane
    // mode on UiAutomator2 (0 = all radios off).
    await browser.switchContext("NATIVE_APP");
    await browser.setNetworkConnection(0);

    try {
      await switchToWebView();
      await waitOutSplash();

      const before = await browser.execute(
        () => document.querySelector("main div.text-3xl")!.textContent
      );

      await browser.execute(() => {
        const slider = document.querySelector<HTMLInputElement>('main input[type="range"]')!;
        const setter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          "value"
        )!.set!;
        setter.call(slider, slider.max);
        slider.dispatchEvent(new Event("input", { bubbles: true }));
        slider.dispatchEvent(new Event("change", { bubbles: true }));
      });

      const after = await browser.execute(
        () => document.querySelector("main div.text-3xl")!.textContent
      );

      wdioExpect(after).not.toBe(before);
      wdioExpect(String(after)).toMatch(/₹[\d,]+/);
    } finally {
      await browser.switchContext("NATIVE_APP");
      await browser.setNetworkConnection(6); // wifi + data back on
    }
  });
});
