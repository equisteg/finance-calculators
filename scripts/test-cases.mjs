// Builds tests/cases/test-cases.xlsx in the company test-case format (adopted from ClearFile, 10 Nov 2026):
// sheets "Read me", "Test Cases" (one row per test case, numbered steps paired with numbered expected results),
// "Summary" (counts by formula) and "Archive" (the cases of the older one-row-per-case sheet, kept for reference).
// Source of truth: tests/cases/fragments/*.json (one file per feature) and tests/cases/archive.json. Edit those, then
//   npm run cases        (this script, then python tests/tools/export_cases.py --check → docs/test-cases.md)
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import ExcelJS from 'exceljs';

const DIR = 'tests/cases/fragments';
export const COLUMNS = [
  ['TC ID', 16], ['Feature', 18], ['Platform', 10], ['Test Type', 14], ['Scenario', 13], ['Test Case Description', 42],
  ['REQ / NFR', 14], ['Priority', 8], ['Sanity', 8], ['Regression', 10], ['Integration', 10], ['Preconditions', 30],
  ['Test Data', 26], ['Steps', 60], ['Expected Result', 64], ['Automatable', 11], ['Automation Script', 44], ['Status', 10],
  ['Remarks / old TC ID', 26],
];
const HEAD = COLUMNS.map(([h]) => h);
const PLATFORMS = ['Web', 'Android', 'API'];
const TYPES = ['Functional', 'Non-functional'];
const SCENARIOS = ['Positive', 'Negative', 'Edge', 'Performance', 'Load', 'Security', 'Accessibility', 'Compatibility', 'Reliability', 'Compliance', 'Privacy', 'SEO', 'Accuracy'];
const STATUSES = ['Not run', 'Pass', 'Fail', 'Flaky', 'Blocked', 'Retired'];

const cases = readdirSync(DIR)
  .filter((f) => f.endsWith('.json'))
  .sort()
  .flatMap((f) => JSON.parse(readFileSync(join(DIR, f), 'utf8')).map((c) => ({ ...c, _file: f })));

// Fail early on the mistakes the checker would also catch, with the fragment file named.
const problems = [];
const seen = new Set();
for (const c of cases) {
  const where = `${c._file} ${c['TC ID']}`;
  for (const h of HEAD) if (c[h] === undefined) problems.push(`${where}: missing "${h}"`);
  if (seen.has(c['TC ID'])) problems.push(`${where}: duplicate TC ID`);
  seen.add(c['TC ID']);
  if (!PLATFORMS.includes(c.Platform)) problems.push(`${where}: Platform must be one of ${PLATFORMS}`);
  if (!TYPES.includes(c['Test Type'])) problems.push(`${where}: Test Type must be one of ${TYPES}`);
  if (!SCENARIOS.includes(c.Scenario)) problems.push(`${where}: Scenario "${c.Scenario}" is not one of ${SCENARIOS}`);
  if (!STATUSES.includes(c.Status)) problems.push(`${where}: Status must be one of ${STATUSES}`);
  const n = (s) => (String(s ?? '').match(/^\d+\.\s/gm) ?? []).length;
  if (n(c.Steps) === 0 || n(c.Steps) !== n(c['Expected Result'])) problems.push(`${where}: ${n(c.Steps)} steps but ${n(c['Expected Result'])} expected results`);
}
if (problems.length) {
  console.error(`test-cases: ${problems.length} problem(s)\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
const order = (id) => {
  const [, p, feat, num] = id.match(/^TC-([WMAN])-([A-Z]+)-(\d+)$/) ?? [];
  return `${'WMAN'.indexOf(p)}-${feat}-${String(num).padStart(4, '0')}`;
};
cases.sort((a, b) => order(a['TC ID']).localeCompare(order(b['TC ID'])));

const wb = new ExcelJS.Workbook();
wb.creator = 'Equisteg';
const NAVY = 'FF0B1F5C';
const SLATE = 'FF5B6478';
const header = (ws, fill) => {
  const row = ws.getRow(1);
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  row.alignment = { wrapText: true, vertical: 'middle' };
  row.eachCell((c) => (c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } }));
};

// Read me
const readme = wb.addWorksheet('Read me');
readme.columns = [{ width: 140 }];
[
  'Finealth test cases — one row per test case (company format, adopted from ClearFile on 10 Nov 2026).',
  'Steps and Expected Result are numbered: expected result 3 belongs to step 3.',
  'Filter with the header arrows: Platform (Web / Android / API), Test Type (Functional / Non-functional), Feature,',
  'and the suite flags Sanity, Regression, Integration (Y = in that suite). A case can be in several suites.',
  'Sanity = the short smoke set after every deploy (P1 core journeys). Regression = everything that must keep working. Integration = crosses a system boundary (our Worker API, Razorpay, Google Play, AdSense).',
  'TC IDs: TC-W-<FEATURE>-001 (website), TC-M-<FEATURE>-001 (Android app), TC-A-<FEATURE>-001 (Worker API), TC-N-<CATEGORY>-001 (non-functional). Numbers are never reused.',
  'Automation Script names the Robot Framework test: tests/automation/<web|mobile|api>/<feature>/<file>.robot :: <TC ID>. Every case has one.',
  'Run them: python tests/automation/run.py --env local --serve (see tests/automation/README.md). Unit and Playwright twins are named in Remarks.',
  'Status (Not run / Pass / Fail / Flaky / Blocked / Retired) is written by /test (tests/tools/bug_log.py ingest) after each run; failures go to tests/bugs/bug-log.xlsx.',
  'Test Data points to files in tests/testdata/ or states the values; never real customer data, live keys or production URLs.',
  'Archive keeps the cases of the older sheet (before 10 Nov 2026) with their old IDs; Remarks / old TC ID in Test Cases names the old ID each case replaces.',
  'Do not edit this workbook by hand: edit tests/cases/fragments/*.json and run npm run cases (it also checks coverage and writes docs/test-cases.md).',
  `Generated ${new Date().toISOString().slice(0, 10)} · ${cases.length} cases.`,
].forEach((t) => readme.addRow([t]));
readme.getRow(1).font = { bold: true, size: 13 };

// Test Cases
const ws = wb.addWorksheet('Test Cases', { views: [{ state: 'frozen', xSplit: 1, ySplit: 1 }] });
ws.columns = COLUMNS.map(([h, w]) => ({ header: h, width: w }));
for (const c of cases) ws.addRow(HEAD.map((h) => c[h]));
header(ws, NAVY);
ws.eachRow((row, i) => i > 1 && row.eachCell({ includeEmpty: true }, (cell) => (cell.alignment = { wrapText: true, vertical: 'top' })));
ws.autoFilter = { from: 'A1', to: { row: cases.length + 1, column: HEAD.length } };
const last = Math.max(cases.length + 1, 2) + 150;
const col = (h) => String.fromCharCode(65 + HEAD.indexOf(h));
for (const h of ['Sanity', 'Regression', 'Integration', 'Automatable']) {
  for (let r = 2; r <= last; r++) ws.getCell(`${col(h)}${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['"Y,N"'] };
}
for (let r = 2; r <= last; r++) ws.getCell(`${col('Status')}${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: [`"${STATUSES.join(',')}"`] };

// Summary (formulas, so it follows the sheet when statuses change)
const sum = wb.addWorksheet('Summary');
const SH = ['Platform', 'Test Type', 'Cases', 'Sanity', 'Regression', 'Integration', 'Automatable', 'Pass', 'Fail', 'Not run'];
sum.columns = SH.map((h, i) => ({ header: h, width: [12, 16, 9, 9, 11, 11, 12, 8, 8, 9][i] }));
const T = "'Test Cases'!";
const rng = (h) => `${T}$${col(h)}:$${col(h)}`;
for (const p of PLATFORMS) {
  for (const t of TYPES) {
    const base = `${rng('Platform')},"${p}",${rng('Test Type')},"${t}"`;
    sum.addRow([p, t,
      { formula: `COUNTIFS(${base})` },
      ...['Sanity', 'Regression', 'Integration', 'Automatable'].map((f) => ({ formula: `COUNTIFS(${base},${rng(f)},"Y")` })),
      ...['Pass', 'Fail', 'Not run'].map((s) => ({ formula: `COUNTIFS(${base},${rng('Status')},"${s}")` })),
    ]);
  }
}
sum.addRow(['Total', '', ...'CDEFGHIJ'.split('').map((L) => ({ formula: `SUM(${L}2:${L}${PLATFORMS.length * TYPES.length + 1})` }))]);
header(sum, NAVY);
sum.getRow(PLATFORMS.length * TYPES.length + 2).font = { bold: true };

// Archive
const arch = wb.addWorksheet('Archive', { views: [{ state: 'frozen', xSplit: 1, ySplit: 1 }] });
const old = JSON.parse(readFileSync('tests/cases/archive.json', 'utf8'));
const AH = ['Old TC ID', 'Old sheet', 'Module', 'Platform', 'Type', 'Preconditions', 'Steps', 'Test data', 'Expected result', 'Priority', 'Old automation ref', 'Note'];
arch.columns = AH.map((h, i) => ({ header: h, width: [11, 13, 30, 9, 13, 26, 40, 30, 50, 8, 40, 40][i] }));
const replacedBy = {};
for (const c of cases) for (const m of String(c['Remarks / old TC ID'] ?? '').matchAll(/\b(TC-\d{3}|NFR-\d{3})\b/g)) (replacedBy[m[1]] ??= []).push(c['TC ID']);
for (const o of old) {
  const to = replacedBy[o['Old TC ID']];
  arch.addRow([...AH.slice(0, -1).map((h) => o[h] ?? ''), to ? `Converted to the 10 Nov 2026 format as ${to.join(', ')}` : 'Not carried over']);
}
header(arch, SLATE);
arch.eachRow((row, i) => i > 1 && row.eachCell({ includeEmpty: true }, (cell) => (cell.alignment = { wrapText: true, vertical: 'top' })));
arch.autoFilter = { from: 'A1', to: { row: old.length + 1, column: AH.length } };

await wb.xlsx.writeFile('tests/cases/test-cases.xlsx');
const by = {};
for (const c of cases) by[`${c.Platform} ${c['Test Type']}`] = (by[`${c.Platform} ${c['Test Type']}`] ?? 0) + 1;
const notCarried = old.filter((o) => !replacedBy[o['Old TC ID']]).map((o) => o['Old TC ID']);
console.log(`tests/cases/test-cases.xlsx — ${cases.length} cases (${Object.entries(by).map(([k, v]) => `${k} ${v}`).join(', ')}); archive ${old.length} old rows${notCarried.length ? `, not carried over: ${notCarried.join(' ')}` : ', all carried over'}`);
