#!/usr/bin/env python3
"""Exports tests/cases/test-cases.xlsx ("Test Cases" sheet, one row per case, numbered steps) to docs/test-cases.md and
checks coverage: every live REQ in docs/product-brief.md has at least one case, every NFR has a row, IDs are unique,
steps and expected results pair up, every automated case names a script that exists (and, for a test file, a test
whose title is the TC ID or starts with the named title), and every live case has a Robot Framework test.
Usage: python tests/tools/export_cases.py [--check]   (exit 1 on any gap)"""
import re
import sys
from collections import Counter
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parents[2]
SHEET = ROOT / 'tests/cases/test-cases.xlsx'
OUT = ROOT / 'docs/test-cases.md'
# several scripts in one cell are separated by "; " before the next path (titles may contain "; " themselves)
SPLIT = re.compile(r';\s+(?=(?:tests|apps|packages|\.github)/)')


def cell(v):
    return '' if v is None else str(v).replace('|', '\\|').replace('\n', '<br>')


def count_numbered(text):
    return len(re.findall(r'(?m)^\d+\.\s', str(text or '')))


def check_ref(tc_id, ref):
    """Returns a problem string, or None when the script (and the named test in it) exists."""
    path, _, name = ref.partition(' :: ')
    path, name = path.strip(), name.strip()
    f = ROOT / path
    if not f.exists():
        return f'{tc_id}: script {path} does not exist'
    if not name:
        return None
    if f.is_dir():
        return f'{tc_id}: {path} is a folder, not a test file'
    text = f.read_text(encoding='utf-8')
    if path.endswith('.robot'):
        # Robot tests start a line with the TC ID
        ok = re.search(rf'(?m)^{re.escape(name)}\b', text)
    elif path.endswith('.yaml'):
        # Maestro flows (Android app) name each case in a comment: "# TC-M-HLT-001 …"
        ok = re.search(rf'(?m)^#\s*{re.escape(name)}\b', text)
    else:
        # Playwright / node:test: test('<TC ID> …') or test("<title>…"); the reference is the TC ID, the full title or its start
        ok = re.search(r'\b(?:test|it)(?:\.\w+)?\(\s*[\'"`]' + re.escape(name), text)
    return None if ok else f'{tc_id}: no test named "{name}" in {path}'


def main():
    wb = openpyxl.load_workbook(SHEET)
    ws = wb['Test Cases']
    head = [c.value for c in ws[1]]
    col = {h: i for i, h in enumerate(head)}
    rows = [r for r in ws.iter_rows(min_row=2, values_only=True) if r[0]]
    brief = (ROOT / 'docs/product-brief.md').read_text(encoding='utf-8')
    # retired requirements (marked **Retired …** in the brief) need no new cases
    reqs = sorted(set(re.findall(r'^\| (REQ-\d+) \| (?!\*\*Retired)', brief, re.M)), key=lambda x: int(x.split('-')[1]))
    nfrs = sorted(set(re.findall(r'^\| (NFR-\d+) \| (?![^|]*\| \*\*Retired)', brief, re.M)), key=lambda x: int(x.split('-')[1]))
    live = [r for r in rows if r[col['Status']] != 'Retired']
    covered = set(x for r in live for x in re.findall(r'(?:REQ|NFR)-\d+', str(r[col['REQ / NFR']] or '')))
    problems = []
    dups = [k for k, n in Counter(r[0] for r in rows).items() if n > 1]
    if dups: problems.append(f'duplicate TC IDs: {dups}')
    for r in live:
        if not re.fullmatch(r'TC-[WMAN]-[A-Z]+-\d{3,}', str(r[0])): problems.append(f'{r[0]}: TC ID must look like TC-W-HOM-001')
        s, e = count_numbered(r[col['Steps']]), count_numbered(r[col['Expected Result']])
        if s == 0 or s != e: problems.append(f'{r[0]}: {s} steps but {e} expected results')
        if r[col['Automatable']] == 'Y' and not r[col['Automation Script']]: problems.append(f'{r[0]}: automatable but no script')
        for ref in SPLIT.split(str(r[col['Automation Script']] or '')):
            if ref.strip():
                p = check_ref(r[0], ref.strip())
                if p: problems.append(p)
        script = str(r[col['Automation Script']] or '')
        # Android app cases run as Maestro flows on a phone (tests/mobile/flows) or as unit tests of the app's pure logic
        # (apps/mobile/__tests__, packages/finance-core); manual Android cases need no script
        android = r[col['Platform']] == 'Android'
        unit = '.test.ts :: ' in script
        if '.robot :: ' not in script and not (android and ('.yaml :: ' in script or unit or r[col['Automatable']] == 'N')):
            problems.append(f'{r[0]}: no Robot Framework test (or Maestro flow / unit test for Android) named')
        for f in ('Sanity', 'Regression', 'Integration', 'Automatable'):
            if r[col[f]] not in ('Y', 'N'): problems.append(f'{r[0]}: {f} must be Y or N')
    missing_req = [q for q in reqs if q not in covered]
    missing_nfr = [n for n in nfrs if n not in covered]

    by = Counter((r[col['Platform']], r[col['Test Type']]) for r in live)
    flags = {f: sum(1 for r in live if r[col[f]] == 'Y') for f in ('Sanity', 'Regression', 'Integration', 'Automatable')}
    lines = ['# Test cases — Finealth', '', 'Generated from `tests/cases/test-cases.xlsx` (sheet "Test Cases") by `tests/tools/export_cases.py`.', '',
             '## Summary', '', '| Platform | Type | Cases |', '|---|---|---|'] + [f'| {p} | {t} | {n} |' for (p, t), n in sorted(by.items())]
    lines += ['', ' · '.join(f'{k}: {v}' for k, v in flags.items()) + f' · total: {len(live)}', '',
              f'REQs covered: {len(reqs) - len(missing_req)}/{len(reqs)} · NFRs covered: {len(nfrs) - len(missing_nfr)}/{len(nfrs)}', '']
    for feature in sorted(set(str(r[col['Platform']]) + ' · ' + str(r[col['Feature']]) for r in live)):
        lines += [f'## {feature}', '', '| ' + ' | '.join(head) + ' |', '|' + '---|' * len(head)]
        lines += ['| ' + ' | '.join(cell(v) for v in r[:len(head)]) + ' |' for r in live if f"{r[col['Platform']]} · {r[col['Feature']]}" == feature]
        lines.append('')
    OUT.write_text('\n'.join(lines) + '\n', encoding='utf-8')
    print(f'wrote {OUT.relative_to(ROOT)}; {len(live)} cases; ' + ', '.join(f'{p} {t} {n}' for (p, t), n in sorted(by.items())))
    if missing_req or missing_nfr:
        problems.append(f'not covered: {missing_req} {missing_nfr}')
    if problems:
        print('problems:\n  ' + '\n  '.join(problems))
        if '--check' in sys.argv:
            sys.exit(1)
    else:
        print('coverage complete: every live REQ and NFR has a case; IDs unique; steps and expected results pair up; every case has a Robot test (Android: a Maestro flow or app unit test); every named script and test exists')


if __name__ == '__main__':
    main()
