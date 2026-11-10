# Test-case sheet rules (`test-cases.xlsx`) — ClearFile format (10 Nov 2026)

- Do not edit the workbook by hand. Edit `fragments/<feature>.json` and run `npm run cases`: it rebuilds
  `test-cases.xlsx`, runs `tests/tools/export_cases.py --check` (every REQ/NFR in `docs/product-brief.md` has cases,
  every case names a Robot test that exists) and writes `docs/test-cases.md`.
- Sheet **Test Cases**: one row per test case with 19 columns: TC ID, Feature, Platform (Web / Android / API), Test Type
  (Functional / Non-functional), Scenario (Positive, Negative, Edge, Performance, Load, Security, Accessibility,
  Compatibility, Reliability, Compliance, Privacy, SEO, Accuracy), Test Case Description, REQ / NFR, Priority (P1–P3),
  Sanity, Regression, Integration (Y / N), Preconditions, Test Data, Steps, Expected Result, Automatable, Automation
  Script, Status, Remarks / old TC ID.
- Steps and Expected Result are numbered (`1. …`); expected result 3 belongs to step 3, and each is observable.
- TC IDs: `TC-W-<FEATURE>-001` website, `TC-M-<FEATURE>-001` Android app, `TC-A-<FEATURE>-001` Worker API,
  `TC-N-<CATEGORY>-001` non-functional. Numbers are never reused; a dropped case gets Status Retired.
- Automation Script = `tests/automation/<web|mobile|api>/<feature>/<file>.robot :: <TC ID>`; Playwright and unit twins go
  in Remarks. Non-functional Expected Result states a measurable threshold ("LCP < 2.5 s", "0 serious axe issues").
- Test Data points to `tests/testdata/` or states the values; never real customer data, live keys or production URLs.
- Status (Not run / Pass / Fail / Flaky / Blocked / Retired) is written by `tests/tools/bug_log.py ingest` after a run
  (`run.py --log-bugs` or `/test`); failures go to `tests/bugs/bug-log.xlsx`.
- Sheet **Archive** keeps the 123 cases of the older one-row-per-step sheet with their old IDs; each new case names the
  old ID it replaces in Remarks, and the Archive row says which new case(s) it became.
