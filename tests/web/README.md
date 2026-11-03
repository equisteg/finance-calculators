# Finealth E2E Automation Suite

Automation for the Finealth test cases in `clearfile and finealth test cases.xlsx`
(rows **FN-W01–FN-W06** and **FN-M01–FN-M07**). The Clearfile rows in that sheet
are out of scope here.

| Case | Covered by | Layer |
|---|---|---|
| FN-W01 Tailwind & Dark Theme | `tests/finealth-web.spec.ts` | Playwright / Chrome |
| FN-W02 Live Bullion Benchmark | `tests/finealth-web.spec.ts` | Playwright / Chrome |
| FN-W03 Equities Ticker | `tests/finealth-web.spec.ts` | Playwright / Chrome |
| FN-W04 Statutory Jurisdiction | `tests/finealth-web.spec.ts` | Playwright / Chrome |
| FN-W05 Static Route Pages | `tests/finealth-web.spec.ts` (×3 routes) | Playwright / Chrome |
| FN-W06 Monetization & Ads | `tests/finealth-web.spec.ts` | Playwright / Chrome |
| FN-M01 App Shell & Native Header | `tests/finealth-mobile.spec.ts` + `tests/native/` | WebView + Appium |
| FN-M02 SIP Wealth Accumulator | `tests/finealth-mobile.spec.ts` | WebView |
| FN-M03 Annual Step-Up | `tests/finealth-mobile.spec.ts` | WebView |
| FN-M04 Loan / EMI Engine | `tests/finealth-mobile.spec.ts` | WebView |
| FN-M05 SWP & Fixed Deposit | `tests/finealth-mobile.spec.ts` | WebView |
| FN-M06 Native Tab Bar | `tests/finealth-mobile.spec.ts` + `tests/native/` | WebView + Appium |
| FN-M07 Offline Operation | `tests/finealth-mobile.spec.ts` + `tests/native/` | WebView + Appium |

## Quick start

```bash
cd e2e
npm install                 # also runs `playwright install chromium`
npm test                    # both projects
npm run test:web            # FN-W01..W06 only
npm run test:mobile         # FN-M01..M07 only
npm run report              # open the HTML report
```

The first run builds both apps, so expect a few minutes. While iterating on
specs, reuse the existing build:

```bash
SKIP_BUILD=1 npm test
```

### If the Playwright browser download is blocked

On networks that block the Chromium CDN, drive a locally installed browser:

```bash
PW_CHANNEL=chrome npm test     # or PW_CHANNEL=msedge
```

### Running against a deployed environment

Supplying either base URL suppresses the local servers entirely:

```bash
WEB_BASE_URL=https://finance-calculators.vercel.app npm run test:web
MOBILE_BASE_URL=https://staging.example.com npm run test:mobile
```

## Why production builds, not `next dev`

`playwright.config.ts` builds and serves each app rather than using `next dev`:

1. **It is the artifact that ships.** `apps/mobile` sets `output: "export"` and
   Capacitor loads `webDir: "out"`, so only the export is meaningful. `next start`
   refuses to serve an exported app, hence `scripts/serve-static.mjs` — a
   dependency-free static server that honours the app's `trailingSlash: true`.
2. **`next dev --turbopack` never finishes hydrating when its HMR websocket
   cannot connect** (proxied or locked-down agents). The DOM renders but no
   handler attaches, so every slider and dropdown silently does nothing and
   interaction assertions fail for a reason that has nothing to do with the app.

## The native layer

`tests/native/finealth-native.appium.spec.ts` is **not** run by Playwright
(`testIgnore: ["**/native/**"]`). It runs under WebdriverIO + Appium and carries
only what an emulated browser cannot check: the real status-bar/cutout inset,
Capacitor Haptics on dock taps, and OS-level airplane mode.

```bash
# 1. Build an APK
cd apps/mobile && npm run build && npx cap sync android \
  && cd android && ./gradlew assembleDebug

# 2. Start an emulator and an Appium server with the uiautomator2 driver
appium --port 4723

# 3. Run it
cd e2e
npm install                                    # installs the optional wdio/appium deps
FINEALTH_APK=/abs/path/app-debug.apk npm run test:native
```

Its dependencies are `optionalDependencies`, so a Playwright-only install skips
them. Typecheck that layer separately once they are present:

```bash
npx tsc --noEmit -p tsconfig.native.json
```

## Reading the results

These specs assert **the behaviour the sheet requires**, not whatever the code
happens to do. All 15 pass against the current apps.

When the first version of this suite ran, nine assertions failed, each on a
real defect. They were fixed in the apps, and the tests that caught them now
guard against a regression:

| Case | Guards against |
|---|---|
| FN-W01 | React #418 hydration mismatch from money formatted without an explicit locale; missing web font |
| FN-W02 | No 22K gold card; benchmarks mislabelled "LIVE" when they are static reference data |
| FN-W04 | Calculator values not rebasing on jurisdiction switch (₹35,00,000 shown as $3,500,000) |
| FN-W05 | Unreadable dark-on-dark text on `/emi-calculator` and `/compound-interest`; no chart on `/sip-calculator` |
| FN-W06 | AdSense loader using a placeholder publisher id instead of the one `ads.txt` authorises |
| FN-M01 | Missing `/logo.png` (the repo-root `.gitignore` excluded every `*.png`) |
| FN-M04 | EMI engine with no principal/interest breakdown |
| FN-M07 | Dock taps lazy-loading a network chunk (the Haptics web fallback). Not one of the original nine: introduced while adding dock haptics, and caught by this test before it shipped |

If a spec finds a new gap you are not fixing immediately, record it with
`knownGap(testInfo, description, "file:line")` from `fixtures/finealth.ts` so
the HTML report explains the failure.

### Ad units

`FN-W06` checks that the loader requests the publisher id from `public/ads.txt`
and that every rendered ad unit carries it. Units render only when real slot
ids are configured, so set them to exercise that path:

```bash
NEXT_PUBLIC_ADSENSE_SLOT_TOP=... NEXT_PUBLIC_ADSENSE_SLOT_MID=... \
NEXT_PUBLIC_ADSENSE_SLOT_BOTTOM=... NEXT_PUBLIC_ADSENSE_SLOT_CALCULATOR=... npm run test:web
```

## Layout

```
e2e/
├── playwright.config.ts        two projects: web (Desktop Chrome), mobile-webview (Pixel 5)
├── wdio.conf.ts                Appium runner for the native layer
├── tsconfig.json               Playwright specs
├── tsconfig.native.json        native specs (needs the optional deps)
├── fixtures/finealth.ts        splash handling, CLS, WCAG contrast, slider driver, knownGap
├── scripts/serve-static.mjs    dependency-free static server for apps/mobile/out
└── tests/
    ├── finealth-web.spec.ts
    ├── finealth-mobile.spec.ts
    └── native/finealth-native.appium.spec.ts
```

### Notes for maintainers

- **Splash gate.** `SplashSequence` is a `fixed inset-0` overlay at z-index 99999
  that unmounts on a 2200 ms timer. Every mobile test must call `openMobileApp()`
  / `dismissSplash()` first or its clicks land on the splash.
- **Third-party failures are scoped to FN-W06.** Other tests assert on
  `firstParty()` only, so an unreachable ad network does not turn the suite red.
- **Google injects its own hidden `ins.adsbygoogle-noablate`** once the loader
  runs with a valid publisher id. Ad-unit assertions exclude it.
- **Dock buttons pair a glyph with the label,** so their accessible name is
  `"▲ Wealth"` — match by substring, not exactly.
- **FD compounding buttons are ordered Quarterly / Monthly / Annually,** not by
  ascending frequency. Address them by name; indexing them will assert the wrong
  inequality.
