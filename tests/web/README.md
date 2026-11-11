# Finealth E2E Automation Suite

Automation for the Finealth test cases in `clearfile and finealth test cases.xlsx`
(rows **FN-W01–FN-W06**). The Clearfile rows in that sheet are out of scope here.
The FN-M rows tested the old Capacitor app; the Expo app is tested with Maestro
(`tests/mobile/README.md`).

| Case | Covered by | Layer |
|---|---|---|
| FN-W01 Tailwind & Dark Theme | `tests/finealth-web.spec.ts` | Playwright / Chrome |
| FN-W02 Live Bullion Benchmark | `tests/finealth-web.spec.ts` | Playwright / Chrome |
| FN-W03 Equities Ticker | `tests/finealth-web.spec.ts` | Playwright / Chrome |
| FN-W04 Statutory Jurisdiction | `tests/finealth-web.spec.ts` | Playwright / Chrome |
| FN-W05 Static Route Pages | `tests/finealth-web.spec.ts` (×3 routes) | Playwright / Chrome |
| FN-W06 Monetization & Ads | `tests/finealth-web.spec.ts` | Playwright / Chrome |

## Quick start

```bash
cd e2e
npm install                 # also runs `playwright install chromium`
npm test                    # the web project
npm run test:web            # FN-W01..W06 only
npm run report              # open the HTML report
```

The first run builds the website, so expect a few minutes. While iterating on
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

Supplying the base URL suppresses the local servers entirely:

```bash
WEB_BASE_URL=https://finance-calculators.vercel.app npm run test:web
```

## Why production builds, not `next dev`

`playwright.config.ts` builds and serves the website rather than using `next dev`:

1. **It is the artifact that ships.** `apps/web` sets `output: "export"`. `next start`
   refuses to serve an exported app, hence `scripts/serve-static.mjs` — a
   dependency-free static server that honours the app's `trailingSlash: true`.
2. **`next dev --turbopack` never finishes hydrating when its HMR websocket
   cannot connect** (proxied or locked-down agents). The DOM renders but no
   handler attaches, so every slider and dropdown silently does nothing and
   interaction assertions fail for a reason that has nothing to do with the app.

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
├── playwright.config.ts        one project: web (Desktop Chrome)
├── tsconfig.json               Playwright specs
├── fixtures/finealth.ts        splash handling, CLS, WCAG contrast, slider driver, knownGap
├── scripts/serve-static.mjs    dependency-free static server for apps/web/out
└── tests/
    └── finealth-web.spec.ts
```

### Notes for maintainers

- **Third-party failures are scoped to FN-W06.** Other tests assert on
  `firstParty()` only, so an unreachable ad network does not turn the suite red.
- **Google injects its own hidden `ins.adsbygoogle-noablate`** once the loader
  runs with a valid publisher id. Ad-unit assertions exclude it.
- **Dock buttons pair a glyph with the label,** so their accessible name is
  `"▲ Wealth"` — match by substring, not exactly.
- **FD compounding buttons are ordered Quarterly / Monthly / Annually,** not by
  ascending frequency. Address them by name; indexing them will assert the wrong
  inequality.
