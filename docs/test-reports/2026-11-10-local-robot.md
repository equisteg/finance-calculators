# Test report — Finealth, full Robot Framework run (local builds), 10 Nov 2026

**Branch:** `claude/project-thread-ptb1eg` · **Environment:** local static builds (web :3100, Android app screens :3101,
test-key Pro build :3102), Worker API in-process · **Browser:** Chrome 153 headless · **Run:** `tests/automation/results/2026-11-10_20-56-02_22449/`
(evidence, not committed) · **Command:** `python tests/automation/run.py --env local --headless --no-open --log-bugs`

## Result

| Total | Passed | Failed | Skipped | Time |
|---|---|---|---|---|
| 273 | 265 | 1 | 7 | 13 min |

Every one of the 273 cases in `tests/cases/test-cases.xlsx` has its own Robot test; `npm run cases` reports coverage complete
(every REQ-001…025 and every live NFR has cases; all 123 old cases carried over).

## The one failure

| Bug | TC | Severity | What | How we tackle it |
|---|---|---|---|---|
| BUG-0001 | TC-N-SEC-008 | S3 | Pages have no Content-Security-Policy | Reduce: report-only CSP on staging listing the AdSense, consent and Razorpay origins, then enforce (RSK-015). Done in this run: the other page headers (`_headers`). Production response: none. Residual: no CSP until the staging trial. Blocks production, not development |

## Skips (each with its reason; all must run before production)

| TC | Why it skips locally | Where it runs |
|---|---|---|
| TC-W-PRC-005, TC-W-PRC-006 | Need Razorpay test mode and the API | Staging with `RAZORPAY_TEST=1` |
| TC-W-SEO-003 | Needs the noindex (staging) build | Staging with `FH_NOINDEX_BUILD=1` |
| TC-N-LOAD-001 | k6 not installed | `k6 run … tests/load/load.js` against staging |
| TC-N-PERF-004 | Lighthouse CI not installed | `npx @lhci/cli autorun --config=tests/load/lighthouserc.json` against staging |
| TC-M-APP-004, TC-M-OFF-002 | Need a real Android device (native status bar, airplane mode) | NEEDS HUMAN device check |

## Bugs found by the new suites and fixed in this branch

BUG-0002…0012 in `tests/bugs/bug-log.xlsx` (status Fixed; Verified after the next staging run): Android disclaimer, negative
Android amounts, the non-AdMob Android card, the prepayment month count, missing page security headers, titles and canonicals
of the SIP/EMI/compound pages, the home canonical, Equisteg on the Refund page, the 67-vs-66 VAT claim, the k6 threshold and the
cut-off retirement verdict tile. Each now passes in the run above.

## Recommendation

Go for merging into `development`. Not ready for production: BUG-0001 (CSP), the staging-only skips, the device checks,
ad consent (RSK-017) and the missing deploy monitor and rollback (RSK-019) come first.
