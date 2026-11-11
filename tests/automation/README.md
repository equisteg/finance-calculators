# Finealth test automation — Robot Framework (Python) + Selenium

Every case in `tests/cases/test-cases.xlsx` (sheet **Test Cases**) names its Robot test in the column
*Automation Script*: `tests/automation/<web|mobile|api>/<feature>/<file>.robot :: <TC ID>`. The Robot test has
**the TC ID at the start of its name**, so results, the sheet and the bug log line up. Same framework and format as
ClearFile (founder decision, 10 Nov 2026). The older Playwright specs (`tests/web/specs/`) and Vitest unit tests stay
as twins and are named in the sheet's *Remarks*.

```
tests/automation/
  run.py                    one command: pick a suite, platform, feature or TC ID, watch it live, keep the evidence
  requirements.txt          Python packages (all free and open source, pinned)
  libraries/
    FinealthLib.py          browser set-up (phone, dark, reduced motion), fields, storage, Pro licence seeding,
                            console and network checks, layout and contrast checks, axe, downloads, engine and API calls
    engine-bridge.mjs       runs a packages/finance-core function from Robot (Call Engine) for golden-value checks
    api-bridge.mjs          runs the Worker (apps/api) in-process from Robot (Call API): no server, no network
    bundle.mjs              builds those bridges with esbuild into .cache/ (rebuilt when the sources change)
    LiveProgress.py         live step-by-step console output
  resources/common.resource shared keywords (Open Finealth, Open Finealth Pro, Open Finealth App, Evidence …)
  tools/build-pro-site.mjs  a web build that trusts a throwaway test key, plus a matching Pro token (never a real key)
  web/<feature>/*.robot     website suites (home, health, debt, goals, retirement, prepay, myplan, pricing, pro, tools,
                            calc, tax, ads, legal, seo, nav, nfr …)
  mobile/<feature>/*.robot  the Android app's screens (the static export the Capacitor app ships) in a phone window
  api/<feature>/*.robot     Worker API cases (licence, Play, health, headers)
  results/<date-time>/      evidence of each run (git-ignored)
```

## 1. One-time setup (Windows, macOS or Linux)

1. Install **Python 3.12+**, **Node 22+** and **Google Chrome** (Firefox and Edge also work).
2. From the repository root:
   ```
   npm ci
   python -m venv tests/automation/.venv
   tests/automation/.venv/Scripts/python -m pip install -r tests/automation/requirements.txt     (Windows)
   tests/automation/.venv/bin/python -m pip install -r tests/automation/requirements.txt         (macOS/Linux)
   ```
   Selenium Manager downloads the matching ChromeDriver. Where downloads are blocked, point `CHROMEDRIVER` at a driver
   (and `CHROME_BINARY` at a Chrome) of the same version.
3. Build what the suites open:
   ```
   npm run build -w @finealth/web          # apps/web/out    (website)
   npm run build -w @finealth/mobile       # apps/mobile/out (Android app screens)
   npm run robot:pro-site                  # tests/automation/.pro-site + .pro-site.token (Pro cases)
   ```
   `robot:pro-site` makes a fresh throwaway Ed25519 key, signs a 6-day Pro token with it, builds the site trusting
   that key, then rebuilds the normal site. The key is never stored; the token only unlocks that local test build.

## 2. Run

Use the virtual environment's Python. `--serve` starts a static server for each build that exists
(web :3100, app :3101, Pro :3102).

| What | Command |
|---|---|
| Everything, locally, browser visible | `python tests/automation/run.py --env local --serve` (`npm run robot`) |
| Sanity set | add `--suite sanity` |
| Regression / integration | `--suite regression` / `--suite integration` |
| One platform | `--platform web`, `--platform android` or `--platform api` (API needs no browser or server) |
| One feature folder | `--feature health` (any folder under the platform) |
| Some test cases | `--test TC-W-HOM-001,TC-W-HLT-002` |
| Leave out a tag | `--exclude slow` |
| Another browser | `--browser firefox` or `--browser edge` |
| Watch slowly | `--slow 0.5` (half a second after each browser action) |
| No window (CI) | `--headless` |
| Staging | `--env staging --base-url https://finealth-staging.<account>.workers.dev --headless` |
| Check every suite without running | `--dryrun` (`npm run robot:dryrun`) |
| Also log failures as bugs | `--log-bugs` (updates `tests/bugs/bug-log.xlsx` and the sheet's Status column) |

`run.py` refuses any address that is not local, `*-dev.*.workers.dev` or `*-staging.*.workers.dev`: never production.
The Pro cases skip when no Pro token is set up, and on staging (its licence key is not the throwaway one).

## 3. Watching a run live

The browser stays visible unless `--headless`. The terminal prints each test, each step and PASS / FAIL:

```
20:21:16  ▶ TC-W-HOM-001 Home hero shows the start button and the example score  [P1, regression, sanity]
20:21:16      • Open Finealth  /
20:21:18      • Test Id Should Contain  hero-grade  …
20:21:18      • Evidence  Hero with example score
20:21:19  PASS  TC-W-HOM-001  (3.1 s)
```

## 4. Evidence after the run

Each run gets `tests/automation/results/<date-time>_<pid>/`:

| File | What it shows |
|---|---|
| `report.html` | Totals, pass/fail per suite and tag (sanity / regression / integration / priority), each test's status |
| `log.html` | Every step with timings and an embedded **screenshot of each key screen**, plus one at any failure |
| `output.xml` | Machine-readable results (used by `--log-bugs`, CI and `tests/tools/collect-results.mjs`) |
| `downloads/` | Files the tests downloaded and checked (backup JSON, CSV exports) |

The report opens in your browser when a visible run ends (`--no-open` to stop that).

## 5. Writing a suite

- Pages are real paths with a trailing slash (`/health-check/`); the client fills `<main id="main">`.
  `Open Finealth  /health-check/` opens a page with clean storage (the example household), `Go To Page` moves on,
  `Wait For Page Rendered` waits for the page's `h1`.
- Prefer `data-testid` locators (`Test Id`, `Text Of`, `Test Id Should Contain`, `Number Of Test Id Should Be`), then
  labels: `Set Field  Take-home income  85000` finds the field by label, aria-label or test id and types like a person.
- Money checks compare with the engine, not with numbers copied by hand:
  `${r}=  Call Engine  loanSummary  3500000  8.5  10` then `Number Of Test Id Should Be  emi  ${r}[emi]`.
- Privacy checks: `No Request Should Carry  85000` proves a typed number never left the browser.
- Non-functional keywords: `Page Should Pass Axe`, `Contrast Ratio`, `Get Layout Shift`, `Page Has No Horizontal Scroll`,
  `Elements Should Fit Their Boxes`, `Page Should Have No Console Problems`, `Page Should Load No Ad Script`.
- Pro: `Open Finealth Pro  /debt-payoff/` (seeds the signed licence); `Tamper Pro Token` for the negative cases.
- Android: `Open Finealth App` opens the app build in a 390 × 844 window after its splash.
- API: `${res}=  Call API  GET  /api/v1/health` returns status, headers and body from the Worker run in-process.
- Test data lives in `tests/testdata/` (`${DATA}`); never real customer data, live keys or production URLs.

## 6. Adding a test case

1. Add the case to the feature's file in `tests/cases/fragments/*.json` (all 19 columns; numbered Steps with the same
   number of numbered Expected Result lines; Sanity / Regression / Integration = Y or N; Automation Script =
   `tests/automation/<platform>/<feature>/<file>.robot :: <TC ID>`).
2. Add the Robot test named `<TC ID> <title>` in that file, tagged with the suites (`sanity`, `regression`,
   `integration`) and the priority (`P1` …) as in the sheet.
3. Run `npm run cases` (rebuilds the workbook, checks every case has its Robot test and every REQ/NFR has cases, and
   writes `docs/test-cases.md`), then run the new test with `--test <TC ID>`.
