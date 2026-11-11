"""Robot Framework listener that prints every test and every step as it runs, so you can follow the suite live in the
terminal while the browser runs on screen. Used by run.py (``--listener libraries/LiveProgress.py``)."""
import sys
import time

ROBOT_LISTENER_API_VERSION = 3

_COLORS = {'PASS': '\033[32m', 'FAIL': '\033[31m', 'SKIP': '\033[33m', 'NOT RUN': '\033[33m'}
_RESET = '\033[0m'
_DIM = '\033[2m'
# keywords that are plumbing, not steps a tester cares about
_QUIET = ('Wait Until', 'Get ', 'Set ', 'Log', 'Run Keyword', 'Should ', 'Element Should', 'Execute ', 'Evaluate',
          'Create ', 'Convert ', 'Sleep', 'Capture', 'Register', 'Return', 'Variable', 'Call Method', 'Catenate',
          'Scroll ', 'Press Keys', 'Input Text', 'Click', 'Select Frame', 'Unselect Frame', 'Switch Window')


def _now():
    return time.strftime('%H:%M:%S')


def _out(text):
    sys.__stdout__.write(text + '\n')
    sys.__stdout__.flush()


class LiveProgress:
    ROBOT_LISTENER_API_VERSION = 3

    def __init__(self):
        self.depth = 0
        self.started = None
        self.counts = {'PASS': 0, 'FAIL': 0, 'SKIP': 0}

    def start_suite(self, data, result):
        if data.tests:
            _out(f'\n{_now()}  ═══ {data.longname}  ({len(data.tests)} tests)')

    def start_test(self, data, result):
        self.started = time.time()
        self.depth = 0
        tags = ', '.join(t for t in data.tags if t in ('sanity', 'regression', 'integration'))
        _out(f'{_now()}  ▶ {data.name}' + (f'  {_DIM}[{tags}]{_RESET}' if tags else ''))

    def start_keyword(self, data, result):
        self.depth += 1
        name = data.name or ''
        # show the readable, top-level steps of a test (the user keywords in resources/), not library internals
        if self.depth == 1 and not name.startswith(_QUIET):
            args = ' '.join(str(a) for a in data.args)[:80]
            _out(f'{_now()}      • {name}' + (f'  {_DIM}{args}{_RESET}' if args else ''))

    def end_keyword(self, data, result):
        if self.depth == 1 and result.status == 'FAIL':
            _out(f'{_now()}      {_COLORS["FAIL"]}✗ {data.name} failed{_RESET}')
        self.depth -= 1

    def end_test(self, data, result):
        took = time.time() - (self.started or time.time())
        st = result.status
        self.counts[st] = self.counts.get(st, 0) + 1
        msg = f' — {result.message[:200]}' if result.message and st != 'PASS' else ''
        _out(f'{_now()}  {_COLORS.get(st, "")}{st}{_RESET}  {data.name.split(" ")[0]}  ({took:.1f} s){msg}')

    def close(self):
        c = self.counts
        _out(f'\n{_now()}  Done: {c.get("PASS", 0)} passed, {c.get("FAIL", 0)} failed, {c.get("SKIP", 0)} skipped')
