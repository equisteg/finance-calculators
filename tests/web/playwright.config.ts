import { defineConfig, devices } from "@playwright/test";

/**
 * Finealth end-to-end suite.
 *
 *   project "web" -> apps/web (Next.js static export, served from out/)
 *
 * The Android app (apps/mobile, Expo) has native screens, so it is tested with Maestro flows on a phone or emulator
 * (tests/mobile/README.md), not here.
 *
 * Point the suite at a deployed environment by exporting WEB_BASE_URL,
 * which also suppresses the local dev servers:
 *
 *   WEB_BASE_URL=https://finance-calculators.vercel.app npm run test:web
 */

const WEB_BASE = process.env.WEB_BASE_URL ?? "http://127.0.0.1:3100";

// Only boot local dev servers when no external target was supplied.
const useLocalServers = !process.env.WEB_BASE_URL;

/**
 * Normally Playwright drives its own pinned Chromium (`playwright install chromium`).
 * Where that download is unavailable -- locked-down corporate networks, offline
 * build agents -- set PW_CHANNEL=chrome (or msedge) to drive the browser already
 * installed on the machine instead.
 */
const channel = process.env.PW_CHANNEL;
/** Or point at any Chromium binary already on the machine (e.g. PW_EXECUTABLE_PATH=/opt/pw-browsers/chromium). */
const executablePath = process.env.PW_EXECUTABLE_PATH;

/** Reuse an existing build instead of rebuilding on every run. */
const skipBuild = process.env.SKIP_BUILD === "1";

export default defineConfig({
  testDir: "./specs",

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
    ...(executablePath ? { launchOptions: { executablePath } } : {}),
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: process.env.PW_NO_VIDEO ? "off" : "retain-on-failure",
    actionTimeout: 15_000,
  },

  projects: [
    {
      name: "web",
      testMatch: /(finealth-web|product|pro|a11y)\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        ...(channel ? { channel } : {}),
        baseURL: WEB_BASE,
        viewport: { width: 1280, height: 900 },
        // The palette assertions check the light "Paper" mode; pin it so a dark-preferring runner gets the same result.
        colorScheme: "light",
      },
    },
  ],

  /*
   * The suite runs against PRODUCTION BUILDS, not `next dev`, for two reasons:
   *
   *  1. It is the artifact that actually ships.
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
            ? "node ../../tests/web/scripts/serve-static.mjs out 3100"
            : "npm run build && node ../../tests/web/scripts/serve-static.mjs out 3100",
          cwd: "../../apps/web",
          url: WEB_BASE,
          reuseExistingServer: !process.env.CI,
          timeout: 420_000,
          stdout: "pipe",
          stderr: "pipe",
        },
      ]
    : undefined,
});
