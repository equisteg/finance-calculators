# Tests — everything test-related lives here, separate per platform

| Folder | What | Tool |
|---|---|---|
| `cases/` | `test-cases.xlsx` — ClearFile format: one *Test Cases* sheet (one row per case, numbered Steps paired with numbered Expected Result, Platform Web / Android / API, Test Type Functional / Non-functional, Sanity / Regression / Integration flags), plus *Summary* and *Archive*. Built from `cases/fragments/*.json` by `npm run cases` | Excel / LibreOffice |
| `automation/` | Robot Framework + Selenium: one Robot test per TC ID for web, the Android app's screens and the Worker API; `run.py` with live progress and HTML evidence (see `automation/README.md`) | Python + Robot Framework |
| `bugs/` | `bug-log.xlsx` — every failure found on staging/dev, its status and fix PR | Excel / LibreOffice |
| `tools/` | `collect-results.mjs` merges every result file; `bug_log.py` updates the bug log and test-case statuses; `export_cases.py` writes `docs/test-cases.md` from the sheet and checks that sheet and automation agree; `mobile-perf.sh` records Android cold start and APK size on the CI emulator; `lint-agents.mjs` checks the reviewer agents, skills and Claude settings (`npm run lint:agents`) | Node / Python + openpyxl / bash |
| `web/` | Web automation (`specs/`, `pages/` page objects, `playwright.config.ts`, `fixtures/finealth.ts` — shared helpers: number parsing, splash, CLS, console-problem collector) | Playwright + TypeScript |
| `mobile/` | Android automation (`flows/*.yaml`, `config.yaml`; run with `npm run test:mobile`) | Maestro |
| `testdata/` | `web/`, `mobile/`, `shared/` — every input value, file and fixture used by tests | JSON / CSV / files |
| `load/` | Performance and load: `npm run perf`, `npm run load -- <profile>` (see `load/README.md`) | Lighthouse CI + k6 |

Unit tests stay next to the code they test (`*.test.ts`).

## Local run
`npx playwright test -c tests/web/playwright.config.ts --project=chromium` starts `wrangler dev --env dev` in `apps/api` (pages from `apps/web/out` + the API on :8787). Build web first.

Pro specs (`specs/pro.spec.ts`) need a web build that trusts a **throwaway** test key and a token signed by it; never a real key.
`eval "$(node scripts/make-test-licence.mjs)"` exports `PRO_TEST_PUBLIC_KEY` and `PRO_TEST_TOKEN`; build with `NEXT_PUBLIC_LICENCE_PUBLIC_KEY=$PRO_TEST_PUBLIC_KEY` and run with
`PRO_TEST_TOKEN` set (without it the Pro specs skip with the reason). The Robot suites do the same in one step:
`npm run robot:pro-site` (see `automation/README.md`). Real Razorpay test-mode payments are a manual check on staging.

## Staging run
`.github/workflows/staging-tests.yml` runs after every staging deploy: Playwright (functional + `@nfr` specs), Lighthouse CI, k6 smoke, OWASP ZAP baseline. Android runs in the same staging run (its `android` job calls `mobile.yml`: APK built against staging, Maestro on an emulator), so one report covers web and Android.

Before testing, `node tests/tools/preflight.mjs` lists every tool, repo setting and test asset needed, what is missing, and the free fix. Then `/test` logs failures in `bugs/bug-log.xlsx`, writes `docs/test-reports/…`, and asks which bugs to fix.

Naming: every Robot test, test title or flow name starts with its TC ID (`TC-W-HOM-001 …`, `TC-N-PERF-001 …`) so results map to test cases and bugs.
Never put real customer data, live keys or production URLs in `testdata/`.
