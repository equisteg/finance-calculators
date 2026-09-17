import { defineConfig, devices } from "@playwright/test";

/**
 * Finealth end-to-end suite.
 *
 *   project "web"            -> apps/web        (Next.js server-rendered site)
 *   project "mobile-webview" -> apps/mobile     (Next.js static export wrapped by Capacitor)
 *
 * apps/mobile ships as `output: "export"` inside an Android WebView, so the DOM the
 * suite drives here is byte-for-byte the DOM the APK renders. The two assertions that
 * genuinely need a device (native status bar, airplane mode at the OS level) live in
 * tests/native/ and run under WebdriverIO + Appium instead -- see README.md.
 *
 * Point the suite at a deployed environment by exporting WEB_BASE_URL / MOBILE_BASE_URL,
 * which also suppresses the local dev servers:
 *
 *   WEB_BASE_URL=https://finance-calculators.vercel.app npm run test:web
 */

const WEB_BASE = process.env.WEB_BASE_URL ?? "http://127.0.0.1:3100";
const MOBILE_BASE = process.env.MOBILE_BASE_URL ?? "http://127.0.0.1:3101";

// Only boot local dev servers when no external target was supplied.
const useLocalServers = !process.env.WEB_BASE_URL && !process.env.MOBILE_BASE_URL;

/**
 * Normally Playwright drives its own pinned Chromium (`playwright install chromium`).
 * Where that download is unavailable -- locked-down corporate networks, offline
 * build agents -- set PW_CHANNEL=chrome (or msedge) to drive the browser already
 * installed on the machine instead.
 */
const channel = process.env.PW_CHANNEL;

/** Reuse an existing build instead of rebuilding both apps on every run. */
const skipBuild = process.env.SKIP_BUILD === "1";

export default defineConfig({
  testDir: "./tests",

  // tests/native/* is a WebdriverIO + Appium spec, not a Playwright one.
  testIgnore: ["**/native/**"],

  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,

  // Sliders and useMemo recalculation are synchronous; generous timeouts here
  // only ever cover first-hit Next.js route compilation in dev mode.
  timeout: 60_000,
  expect: { timeout: 10_000 },

  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
    ["json", { outputFile: "test-results/results.json" }],
  ],

  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 15_000,
  },

  projects: [
    {
      name: "web",
      testMatch: /finealth-web\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        ...(channel ? { channel } : {}),
        baseURL: WEB_BASE,
        viewport: { width: 1280, height: 900 },
      },
    },
    {
      name: "mobile-webview",
      testMatch: /finealth-mobile\.spec\.ts/,
      use: {
        // Pixel 5 descriptor = Chrome on Android, the same engine backing the
        // Capacitor WebView. Kept over newer descriptors for version portability.
        ...devices["Pixel 5"],
        ...(channel ? { channel } : {}),
        baseURL: MOBILE_BASE,
      },
    },
  ],

  /*
   * The suite runs against PRODUCTION BUILDS, not `next dev`, for two reasons:
   *
   *  1. It is the artifact that actually ships -- apps/mobile in particular is
   *     only meaningful once exported, since Capacitor loads webDir "out".
   *  2. `next dev --turbopack` never finishes hydrating when its HMR websocket
   *     cannot connect (locked-down CI networks, proxies). The DOM renders but
   *     no handler attaches, so every interaction assertion fails misleadingly.
   *
   * Set SKIP_BUILD=1 to reuse an existing build while iterating on specs.
   */
  webServer: useLocalServers
    ? [
        {
          command: skipBuild
            ? "npx next start --port 3100"
            : "npm run build && npx next start --port 3100",
          cwd: "../apps/web",
          url: WEB_BASE,
          reuseExistingServer: !process.env.CI,
          timeout: 420_000,
          stdout: "pipe",
          stderr: "pipe",
        },
        {
          // `output: "export"` means there is no server to start -- serve out/.
          command: skipBuild
            ? "node ../../e2e/scripts/serve-static.mjs out 3101"
            : "npm run build && node ../../e2e/scripts/serve-static.mjs out 3101",
          cwd: "../apps/mobile",
          url: MOBILE_BASE,
          reuseExistingServer: !process.env.CI,
          timeout: 420_000,
          stdout: "pipe",
          stderr: "pipe",
        },
      ]
    : undefined,
});
