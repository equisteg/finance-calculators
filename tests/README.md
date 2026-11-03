# Tests — everything test-related lives here, separate per platform

| Folder | What | Tool |
|---|---|---|
| `cases/` | `test-cases.xlsx` — functional (Web, Mobile, API, Payments) and `Non-functional` test cases, one row per step with its own expected result | Excel / LibreOffice |
| `bugs/` | `bug-log.xlsx` — every failure found on staging/dev, its status and fix PR | Excel / LibreOffice |
| `tools/` | `collect-results.mjs` merges every result file; `bug_log.py` updates the bug log and test-case statuses; `export_cases.py` writes `docs/test-cases.md` from the sheet and checks that sheet and automation agree; `mobile-perf.sh` records Android cold start and APK size on the CI emulator; `lint-agents.mjs` checks the reviewer agents, skills and Claude settings (`npm run lint:agents`) | Node / Python + openpyxl / bash |
| `web/` | Web automation (`specs/`, `pages/` page objects, `playwright.config.ts`, `fixtures.ts` — import `test`/`expect` from it: fails a test on any console error or warning) | Playwright + TypeScript |
| `mobile/` | Android automation (`flows/*.yaml`, `config.yaml`; run with `npm run test:mobile`) | Maestro |
| `testdata/` | `web/`, `mobile/`, `shared/` — every input value, file and fixture used by tests | JSON / CSV / files |
| `load/` | Performance and load: `npm run perf`, `npm run load -- <profile>` (see `load/README.md`) | Lighthouse CI + k6 |

Unit tests stay next to the code they test (`*.test.ts`).

## Local run
`npx playwright test -c tests/web/playwright.config.ts --project=chromium` starts `wrangler dev --env dev` in `apps/api` (pages from `apps/web/out` + the API on :8787). Build web first.

Pro specs (TC-W-022, TC-W-024..026, TC-N-PRIV-002/003, TC-N-REL-001) need a licence key pair. Locally use a **throwaway** one, never a real key:

```bash
node tests/tools/local-licence-key.mjs setup     # private key → LICENCE_SIGNING_KEY in apps/api/.dev.vars (git-ignored, never printed)
NEXT_PUBLIC_RAZORPAY_ENABLED=1 NEXT_PUBLIC_LICENCE_PUBLIC_KEY=$(node tests/tools/local-licence-key.mjs public) npm run build --workspace @finealth/web
```

The specs sign fresh Pro tokens with the same private key (`tests/web/fixtures.ts`, `asProUser`). Without it they skip with the reason; in CI and deployed runs they fail instead. CI/staging pass the dev/staging **test** private key as the secret `LICENCE_TEST_SIGNING_KEY`. Locally, wrangler dev has no Razorpay keys, so the "bad key" message of TC-W-022 is only checked against a deployed Worker. The checkout specs (TC-W-025/026, TC-N-PRIV-003) never touch Razorpay or our checkout API: `fakeRazorpayCheckout` in `fixtures.ts` serves a fake `checkout.js` and answers `/api/v1/checkout` and `/api/v1/checkout/confirm` with a freshly signed token. They need a web build with `NEXT_PUBLIC_RAZORPAY_ENABLED=1` (otherwise the buy buttons say "Coming soon" and they skip). Real Razorpay test-mode payments are a manual check on staging. AdSense units exist only in production builds, so TC-W-023 skips unless `NEXT_PUBLIC_ADSENSE_ID` is set.

## Staging run
`.github/workflows/staging-tests.yml` runs after every staging deploy: Playwright (functional + `@nfr` specs), Lighthouse CI, k6 smoke, OWASP ZAP baseline. Android runs in the same staging run (its `android` job calls `mobile.yml`: APK built against staging, Maestro on an emulator), so one report covers web and Android.

Before testing, `node tests/tools/preflight.mjs` lists every tool, repo setting and test asset needed, what is missing, and the free fix. Then `/test` logs failures in `bugs/bug-log.xlsx`, writes `docs/test-reports/…`, and asks which bugs to fix.

Naming: every test title or flow name starts with its TC ID (`TC-W-001 …`, `TC-N-004 … @nfr`) so results map to test cases and bugs.
Never put real customer data, live keys or production URLs in `testdata/`.
