// Single source for the test-case catalogue → docs/test-cases.md and tests/cases/test-cases.xlsx
// (sheets "Test cases" and "Non-functional"). Edit this script, not the outputs.
// Usage: node scripts/test-cases.mjs   (npm run cases)
import { writeFileSync } from 'node:fs';
import ExcelJS from 'exceljs';

const FC = 'packages/finance-core/src/';
const WL = 'apps/web/src/lib/';
const E2E = 'tests/web/specs/';
const API = 'apps/api/test/api.test.ts';
const W = 'Web';
const A = 'Android';
const B = 'Both';
const P = 'Positive';
const N = 'Negative';
const X = 'Edge';

export const REQS = {
  'REQ-001': 'Health check score',
  'REQ-002': 'Health action plan',
  'REQ-003': 'Debt payoff planner',
  'REQ-004': 'Debt what-if and schedule (Pro)',
  'REQ-005': 'Goal planner',
  'REQ-006': 'Retirement projection',
  'REQ-007': 'Retirement odds (Pro)',
  'REQ-008': 'Loan prepayment',
  'REQ-009': 'Local storage, backup and restore',
  'REQ-010': 'Progress snapshots (Pro)',
  'REQ-011': 'Pricing and checkout',
  'REQ-012': 'Restore Pro and licence token',
  'REQ-013': 'Ads gating',
  'REQ-014': 'Disclaimer and legal pages',
  'REQ-015': 'Calculators (SIP, EMI, tax, GST…)',
  'REQ-016': 'CSV export',
  'REQ-017': 'SEO',
  'REQ-018': 'Licence API',
};
const m = (req) => `${req} ${REQS[req]}`;

// [id, module, platform, type, preconditions, steps, data, expected, priority, automated]
const rows = [
  // REQ-001 health score
  ['TC-001', m('REQ-001'), B, P, 'Health Check open', 'Enter the example household', 'income 1,00,000; spend 60,000; EMIs 15,000; fund 2,25,000; costly 60,000; invest 12,00,000; age 35; 2 dependants; cover 50,00,000; health yes', 'Score 75, grade Good; pillars 100/50/88/90/50/71', 'P1', `Y — ${FC}planning.test.ts; ${E2E}product.spec.ts FH-02`],
  ['TC-002', m('REQ-001'), B, N, 'Health Check open', 'Enter income 0, spending −5, investments NaN', 'junk numbers', 'Score is a whole number 0-100, no NaN, no crash', 'P1', `Y — ${FC}planning.test.ts`],
  ['TC-003', m('REQ-001'), B, X, 'Health Check open', 'Meet every rule of thumb', 'fund 6,00,000; costly 0; EMIs 5,000; invest 50,00,000; cover 2 cr', 'Score 100, Excellent, no actions', 'P2', `Y — ${FC}planning.test.ts`],
  ['TC-004', m('REQ-001'), W, P, 'Health Check open', 'Change emergency savings to 4,50,000', '450000', 'Score updates to 85 without a page reload', 'P1', `Y — ${E2E}product.spec.ts FH-02`],
  ['TC-005', m('REQ-001'), B, X, 'Age at guideline points', 'Compute retirement target', 'ages 22, 30, 45, 80', 'Targets 0×, 1×, 4.5×, 10×', 'P2', `Y — ${FC}planning.test.ts`],
  // REQ-002 actions
  ['TC-006', m('REQ-002'), B, P, 'Example household', 'Read action list', '—', 'Ranked emergency, retirement, protection, debt payments, costly debt; points never increase down the list', 'P1', `Y — ${FC}planning.test.ts`],
  ['TC-007', m('REQ-002'), W, N, 'Free plan', 'Open Health Check', '—', 'Only the top priority is shown; Pro gate "Full report" visible', 'P1', `Y — ${E2E}product.spec.ts FH-02`],
  ['TC-008', m('REQ-002'), B, X, 'Spending > income', 'Enter spending 95,000', '95000', 'Savings action says "Stop the monthly shortfall"', 'P2', `Y — ${FC}planning.test.ts`],
  ['TC-009', m('REQ-002'), W, P, 'Pro active', 'Open Health Check', 'test token', 'All 5 actions and six pillars visible; Print and Save snapshot buttons', 'P1', `Y — ${E2E}pro.spec.ts TC-040`],
  // REQ-003 debt
  ['TC-010', m('REQ-003'), B, P, 'One debt', 'Plan payoff', '1,000 at 12 %, pay 100', '11 months, interest 58.98, total 1,058.98', 'P1', `Y — ${FC}planning.test.ts`],
  ['TC-011', m('REQ-003'), B, P, 'Two debts, budget 300', 'Compare strategies', 'card 2,000 @24 % min 60; loan 500 @10 % min 25', 'Avalanche 10 mo / 214.10; snowball 10 mo / 251.64; minimums 56 mo / 1,378.10; best = avalanche', 'P1', `Y — ${FC}planning.test.ts`],
  ['TC-012', m('REQ-003'), B, N, 'Budget below minimums', 'Plan payoff', 'budget 50', 'Not feasible: "budget is less than the total of the minimum payments"', 'P1', `Y — ${FC}planning.test.ts`],
  ['TC-013', m('REQ-003'), B, N, 'Minimum below interest', 'Plan payoff', '10,000 @36 % pay 100', 'Not feasible: payments do not cover the interest', 'P1', `Y — ${FC}planning.test.ts`],
  ['TC-014', m('REQ-003'), B, X, 'No debts', 'Plan payoff', '[]', 'Feasible, 0 months', 'P3', `Y — ${FC}planning.test.ts`],
  ['TC-015', m('REQ-003'), W, X, 'Free plan with 3 debts', 'Look for Add a debt', '—', 'Limit note "up to 3 debts" instead of the add button; extra saved debts faded and not planned', 'P1', `Y — ${E2E}product.spec.ts FH-03`],
  // REQ-004 what-if
  ['TC-016', m('REQ-004'), W, P, 'Pro active, example debts', 'Enter 5,000 extra in What if', '5000', '"…debt-free N mo sooner and saves ₹X" shown; chart has 3 lines', 'P1', `Y — ${E2E}pro.spec.ts TC-041`],
  ['TC-017', m('REQ-004'), W, N, 'Free plan', 'Open Debt Planner', '—', 'What-if and schedule are behind the Pro gate', 'P1', `Y — ${E2E}product.spec.ts FH-03`],
  ['TC-018', m('REQ-004'), W, X, 'Pro active, infeasible plan', 'Enter what-if', 'budget below minimums', 'No what-if sentence; danger notice remains', 'P3', 'N — manual'],
  // REQ-005 goals
  ['TC-019', m('REQ-005'), B, P, 'Goal planner', 'Plan goal', '10,00,000 in 10 y, 6 % inflation, 12 % return', 'Future cost 17,90,848; monthly 7,708', 'P1', `Y — ${FC}planning.test.ts`],
  ['TC-020', m('REQ-005'), B, N, 'Budget lower than needed', 'Fund two goals', 'needs 100 + 200, budget 200', 'First goal 100 % funded, second 50 %; shortfall 100', 'P1', `Y — ${FC}planning.test.ts`],
  ['TC-021', m('REQ-005'), B, X, '0 % return, 0 inflation', 'Plan goal', '2,400 in 2 years', 'Monthly 100 (plain division)', 'P2', `Y — ${FC}planning.test.ts`],
  ['TC-022', m('REQ-005'), W, X, 'Free plan', 'Open Goal Planner with 3 example goals', '—', 'Only goal #1 planned; others faded; limit notice', 'P2', 'N — manual'],
  // REQ-006 retirement projection
  ['TC-023', m('REQ-006'), B, P, 'Retirement planner', 'Project', 'age 30→60→85, 5 L saved, 20 k/mo, spend 6 L, 6 % inflation', 'First-year spending 34,46,095; corpus and need > 0', 'P1', `Y — ${FC}planning.test.ts`],
  ['TC-024', m('REQ-006'), W, N, 'Retirement planner', 'Set monthly saving to 0', '0', 'Verdict shows "Runs out at <age>" in red', 'P2', 'N — manual'],
  ['TC-025', m('REQ-006'), B, X, 'Retire age < current age', 'Project', 'age 50, retire 45', 'No crash; working years 0', 'P3', 'N — manual'],
  // REQ-007 odds
  ['TC-026', m('REQ-007'), B, P, 'Same seed', 'Run odds twice', '500 runs, seed 7', 'Identical results; p10 ≤ p50 ≤ p90; 0 ≤ success ≤ 1', 'P1', `Y — ${FC}planning.test.ts; ${E2E}pro.spec.ts TC-042`],
  ['TC-027', m('REQ-007'), W, N, 'Free plan', 'Open Retirement planner', '—', 'Odds behind Pro gate; no simulation runs', 'P1', 'N — manual'],
  ['TC-028', m('REQ-007'), B, X, 'Volatility 0', 'Run odds', '—', 'Success 100 % or 0 % matching projection; median = projection', 'P2', `Y — ${FC}planning.test.ts`],
  // REQ-008 prepayment
  ['TC-029', m('REQ-008'), B, P, 'Prepayment tool', 'Compare', '10 L, 9 %, 240 mo, prepay 1 L', 'EMI 8,997.26; new EMI 8,097.53; tenure 186 mo (54 saved); better = reduce tenure', 'P1', `Y — ${FC}planning.test.ts`],
  ['TC-030', m('REQ-008'), B, X, 'Lump sum ≥ balance', 'Compare', '50,000 balance, 80,000 lump', 'Tenure 0, new EMI 0, no crash', 'P2', `Y — ${FC}planning.test.ts`],
  ['TC-031', m('REQ-008'), W, N, 'Prepayment tool', 'Enter months left 9999', '9999', 'Capped at 480', 'P3', 'N — manual'],
  // REQ-009 storage
  ['TC-032', m('REQ-009'), W, P, 'Health check edited', 'Reload page', '—', 'Same numbers and score after reload', 'P1', `Y — ${E2E}product.spec.ts FH-02; ${WL}storage.test.ts`],
  ['TC-033', m('REQ-009'), W, N, 'Corrupt localStorage', 'Open tools', 'non-JSON / wrong types', 'Falls back to example, no crash', 'P1', `Y — ${WL}storage.test.ts`],
  ['TC-034', m('REQ-009'), W, X, 'Backup with one invalid section', 'Restore from file', 'goals: [{bad:true}]', 'Valid sections restored, invalid skipped; message lists restored sections', 'P2', `Y — ${WL}storage.test.ts`],
  ['TC-035', m('REQ-009'), W, N, 'My Plan', 'Restore a non-Finealth file', '{"app":"other"}', '"That file is not a Finealth backup."', 'P2', `Y — ${WL}storage.test.ts`],
  // REQ-010 snapshots
  ['TC-036', m('REQ-010'), W, P, 'Pro active', 'Save snapshot, open My Plan', '—', 'Latest score 75 shown', 'P1', `Y — ${E2E}pro.spec.ts TC-040`],
  ['TC-037', m('REQ-010'), W, N, 'Free plan', 'Open My Plan', '—', 'Progress behind Pro gate; backup still available', 'P2', 'N — manual'],
  ['TC-038', m('REQ-010'), W, X, 'Pro, no snapshots', 'Open My Plan', '—', '"No snapshots yet" with link to Health Check', 'P3', 'N — manual'],
  // REQ-011 pricing / checkout
  ['TC-039', m('REQ-011'), W, P, 'Pricing page', 'Read plans', '—', 'Free ₹0, Yearly ₹399, Lifetime ₹999; Monthly noted as Android only', 'P1', `Y — ${E2E}product.spec.ts FH-04`],
  ['TC-040', m('REQ-011'), W, N, 'Razorpay not enabled', 'Look at buy buttons', 'NEXT_PUBLIC_RAZORPAY_ENABLED unset', 'Buttons disabled "Coming soon"', 'P1', `Y — ${E2E}product.spec.ts FH-04`],
  ['TC-041', m('REQ-011'), W, P, 'Test keys, Razorpay test mode', 'Buy Lifetime with test card', 'rzp_test', 'Pro active, licence key shown with Copy button', 'P1', `Y — ${WL}checkout.test.ts (mocked); real Razorpay NEEDS HUMAN`],
  ['TC-042', m('REQ-011'), W, X, 'Paid, tab closed before confirm', 'Reopen site', '—', 'Pending confirm retried in background; Pro switches on', 'P2', `Y — ${WL}checkout.test.ts`],
  // REQ-012 restore / token
  ['TC-043', m('REQ-012'), W, P, 'Valid token stored', 'Open any page', 'test token', 'Pro badge, Pro features unlocked', 'P1', `Y — ${WL}pro.test.ts; ${E2E}pro.spec.ts`],
  ['TC-044', m('REQ-012'), W, N, 'Tampered token stored', 'Open Health Check', 'last 4 chars changed', 'Free plan; no pillars', 'P1', `Y — ${E2E}pro.spec.ts TC-043; ${FC}licence.test.ts`],
  ['TC-045', m('REQ-012'), W, N, 'Restore Pro', 'Paste "hello"', 'hello', 'Hint "Paste the payment ID (pay_…)…", no request sent', 'P2', `Y — ${WL}pro.test.ts`],
  ['TC-046', m('REQ-012'), W, X, 'Clock set back > 1 h', 'Open site offline', '—', 'Old token not trusted; refresh required', 'P2', `Y — ${WL}pro.test.ts`],
  // REQ-013 ads
  ['TC-047', m('REQ-013'), W, P, 'Free plan, slot configured', 'Open a tool', '—', 'AdSense script injected once; ad below the disclaimer, never inside a result', 'P1', 'N — manual (needs AdSense slot)'],
  ['TC-048', m('REQ-013'), W, N, 'Pro active', 'Open Health Check', '—', 'No #adsbygoogle-js script in the page', 'P1', `Y — ${E2E}pro.spec.ts TC-040`],
  ['TC-049', m('REQ-013'), W, X, 'Licence stored but unconfirmed (offline)', 'Open site', '—', 'No ads and no Pro features; "Couldn\'t confirm Pro — retrying."', 'P2', `Y — ${WL}pro.test.ts`],
  // REQ-014 disclaimer / legal
  ['TC-050', m('REQ-014'), W, P, '—', 'Open each planning tool', '5 routes', 'Disclaimer visible, readable size', 'P1', `Y — ${E2E}product.spec.ts FH-01`],
  ['TC-051', m('REQ-014'), W, N, '—', 'Open /privacy/, /terms/, /refund/, /contact/', '—', 'Pages load with Equisteg as legal entity and a contact email', 'P1', 'N — manual (Razorpay website review)'],
  ['TC-052', m('REQ-014'), W, X, 'Print preview', 'Print the health report', '—', 'Header, footer, ads and inputs hidden; text dark on white', 'P3', 'N — manual'],
  // REQ-015 calculators
  ['TC-053', m('REQ-015'), B, P, 'Calculators', 'EMI, SIP, tax, GST golden cases', 'see finance.test.ts', 'Matches hand-worked values', 'P1', `Y — ${FC}finance.test.ts`],
  ['TC-054', m('REQ-015'), W, N, 'Calculators', 'Switch jurisdiction to GBP', '—', 'UK tools shown; no Indian tabs', 'P2', 'Y — apps/web/__tests__/HomePage.test.tsx'],
  ['TC-055', m('REQ-015'), B, X, 'EMI at 0 %', 'Compute', '1,20,000 / 12 months', 'EMI 10,000', 'P2', `Y — ${FC}finance.test.ts`],
  // REQ-016 CSV
  ['TC-056', m('REQ-016'), B, P, 'Rows with commas and quotes', 'toCsv', '"x,y", say "hi"', 'Quoted and doubled quotes, CRLF line ends', 'P2', `Y — ${FC}planning.test.ts`],
  ['TC-057', m('REQ-016'), B, N, 'Cell starts with =', 'toCsv', '=SUM(A1)', "Prefixed with ' (no formula runs)", 'P1', `Y — ${FC}planning.test.ts`],
  ['TC-058', m('REQ-016'), B, X, 'Negative number', 'toCsv', '-12.5', 'Left as a number (no prefix)', 'P3', `Y — ${FC}planning.test.ts`],
  // REQ-017 SEO
  ['TC-059', m('REQ-017'), W, P, 'Built site', 'Fetch /sitemap.xml', '—', 'Lists tools, pricing and legal pages; excludes /pro/ and /my-plan/', 'P2', 'N — manual'],
  ['TC-060', m('REQ-017'), W, N, 'NEXT_PUBLIC_NOINDEX=1 (staging)', 'Fetch /robots.txt', '—', 'Disallow: /', 'P2', 'N — manual'],
  ['TC-061', m('REQ-017'), W, X, 'Any tool page', 'Read <title> and canonical', '—', 'Unique title "… · Finealth" and canonical with trailing slash', 'P3', 'N — manual'],
  // REQ-018 API
  ['TC-062', m('REQ-018'), W, P, 'Worker with test keys', 'POST /api/v1/checkout lifetime INR', '{plan:"pro_lifetime",currency:"INR"}', 'Order created at server price 99900 paise with notes product=finealth', 'P1', `Y — ${API}`],
  ['TC-063', m('REQ-018'), W, N, 'Worker', 'POST /licence/verify with refunded payment', 'pay_ refunded', '400 refunded', 'P1', `Y — ${API}`],
  ['TC-064', m('REQ-018'), W, X, 'Razorpay 5xx', 'Verify key', '—', '503 unavailable, never invalid_key; retried once', 'P1', `Y — ${API}`],
];

// Non-functional requirements with measurable thresholds (template rule: every NFR has rows).
const NF_HEAD = ['ID', 'Area', 'Requirement', 'Threshold', 'How measured', 'Automated (Y/N + file)'];
const nfr = [
  ['NFR-001', 'Accuracy', 'Golden formula cases match independent calculations', '100 % match', 'Vitest golden tables', `Y — ${FC}finance.test.ts, planning.test.ts`],
  ['NFR-002', 'Performance', 'Monte Carlo 1,000 runs × 80 years', '< 100 ms on a mid-range phone', 'Manual timing in DevTools (4× CPU throttle)', 'N — manual'],
  ['NFR-003', 'Performance', 'Tool pages Lighthouse performance (mobile)', '≥ 90', 'Lighthouse CI (tests/load/lighthouserc.json)', 'Partly — config copied, routes to update'],
  ['NFR-004', 'Privacy', 'No financial input leaves the device', '0 requests carrying form values', 'Playwright network log on each tool', 'N — manual (planned automation)'],
  ['NFR-005', 'Privacy', 'Pro users load no ad script', '0 ad scripts', 'Playwright', `Y — ${E2E}pro.spec.ts TC-040`],
  ['NFR-006', 'Security', 'Pro token cannot be forged or tampered', 'Tampered token → free', 'Unit + E2E', `Y — ${FC}licence.test.ts; ${E2E}pro.spec.ts TC-043`],
  ['NFR-007', 'Security', 'No secrets in repo or bundle', '0 findings', 'check-forbidden-files, Gitleaks, Semgrep, OSV-Scanner', 'Y — .github/workflows/ci.yml'],
  ['NFR-008', 'Reliability', 'Static pages work when the API is down', 'All tools usable', 'Block /api/* in Playwright', 'N — manual'],
  ['NFR-009', 'Accessibility', 'WCAG 2.2 AA on tool pages', '0 serious/critical axe issues', 'axe-core', 'N — planned (@axe-core/playwright)'],
  ['NFR-010', 'Compliance', 'Disclaimer on every result screen', 'Visible on 5/5 tools', 'Playwright', `Y — ${E2E}product.spec.ts FH-01`],
  ['NFR-011', 'Compatibility', 'Layout at 360 px width', 'No horizontal scroll', 'Playwright Pixel 5 project', 'Partly — mobile-webview project'],
  ['NFR-012', 'Load', 'Licence API under load', 'p95 < 300 ms, errors < 1 % at 20 rps', 'k6 (tests/load/load.js) on staging', 'Partly — script copied from template'],
];

const HEAD = ['ID', 'Module', 'Platform', 'Type', 'Preconditions', 'Steps', 'Test data', 'Expected result', 'Priority', 'Automated (Y/N + file)'];

// Coverage self-check: every REQ has positive, negative and edge cases; ids are unique.
for (const req of Object.keys(REQS)) {
  const types = new Set(rows.filter((r) => r[1].startsWith(req)).map((r) => r[3]));
  for (const t of [P, N, X]) if (!types.has(t)) throw new Error(`${req} is missing a ${t} case`);
}
if (new Set(rows.map((r) => r[0])).size !== rows.length) throw new Error('duplicate test-case id');

const esc = (s) => String(s).replace(/\|/g, '\\|');
const auto = rows.filter((r) => r[9].startsWith('Y')).length;
const partly = rows.filter((r) => r[9].startsWith('Partly')).length;
const md = [
  '# Finealth — Test cases',
  '',
  '_Generated by `node scripts/test-cases.mjs` — edit the script, not this file. Also exported as [tests/cases/test-cases.xlsx](../tests/cases/test-cases.xlsx)._',
  '',
  `**${rows.length} functional cases** · automated ${auto} · partly ${partly} · manual ${rows.length - auto - partly}. **${nfr.length} non-functional requirements.** Every ${Object.keys(REQS)[0]}…${Object.keys(REQS).at(-1)} has at least one positive, negative and edge case (checked by the script).`,
  '',
  '## Suites',
  '',
  '| Layer | Tool | Location | Command |',
  '|---|---|---|---|',
  '| Unit — engines (golden cases) | Vitest | `packages/finance-core/src/*.test.ts` | `npm run test -w @finealth/finance-core` |',
  '| Unit — web logic (Pro, checkout, storage) | Vitest + jsdom | `apps/web/src/lib/*.test.ts`, `apps/web/__tests__/` | `npm run test -w @finealth/web` |',
  '| API | Vitest (mocked Razorpay / Play) | `apps/api/test/api.test.ts` | `npm run test -w @finealth/api` |',
  '| Web E2E | Playwright + page objects | `tests/web/specs/`, `tests/web/pages/` | `npm run test:web -- --project=web` |',
  '| Web E2E — Pro | Playwright with a throwaway signed token | `tests/web/specs/pro.spec.ts` | see `scripts/make-test-licence.mjs` |',
  '| Android WebView | Playwright Pixel 5 project | `tests/web/specs/finealth-mobile.spec.ts` | `npm run test:web -- --project=mobile-webview` |',
  '| Android native | WebdriverIO + Appium | `tests/mobile/native/` | `npx wdio run tests/mobile/native/wdio.conf.ts` |',
  '',
  '## Requirements',
  '',
  '| REQ | Feature |',
  '|---|---|',
  ...Object.entries(REQS).map(([k, v]) => `| ${k} | ${v} |`),
  '',
  '## Cases',
  '',
  `| ${HEAD.join(' | ')} |`,
  `|${HEAD.map(() => '---').join('|')}|`,
  ...rows.map((r) => `| ${r.map(esc).join(' | ')} |`),
  '',
  '## Non-functional',
  '',
  `| ${NF_HEAD.join(' | ')} |`,
  `|${NF_HEAD.map(() => '---').join('|')}|`,
  ...nfr.map((r) => `| ${r.map(esc).join(' | ')} |`),
  '',
].join('\n');
writeFileSync('docs/test-cases.md', md);

const wb = new ExcelJS.Workbook();
wb.creator = 'Equisteg';
const sheet = (name, head, data, widths) => {
  const ws = wb.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.columns = head.map((h, i) => ({ header: h, key: String(i), width: widths[i] }));
  data.forEach((r) => ws.addRow(r));
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
  ws.eachRow((row) => row.eachCell((c) => (c.alignment = { wrapText: true, vertical: 'top' })));
  ws.autoFilter = { from: 'A1', to: { row: 1, column: head.length } };
};
sheet('Test cases', HEAD, rows, [9, 30, 9, 9, 28, 36, 30, 48, 8, 48]);
sheet('Non-functional', NF_HEAD, nfr, [9, 14, 44, 28, 36, 44]);
sheet('Requirements', ['REQ', 'Feature'], Object.entries(REQS), [10, 40]);
await wb.xlsx.writeFile('tests/cases/test-cases.xlsx');
console.log(`docs/test-cases.md + tests/cases/test-cases.xlsx — ${rows.length} cases (${auto} automated, ${partly} partly), ${nfr.length} NFRs`);
