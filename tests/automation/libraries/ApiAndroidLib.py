"""Extra keywords for the Worker API and Android app suites (tests/automation/api, tests/automation/mobile).

API: ``Call API With`` sends a raw body or repeats a request in one Worker instance (rate limit), through the same
api-bridge.mjs as FinealthLib's ``Call API``; ``Upstream Calls`` filters the faked Razorpay/Google calls.
Android: the Capacitor app's screens have no data-testids, so these keywords find the bottom dock, the tool bar, the
big result figure and the labelled result rows the way a person reads them, move range sliders the way React sees it,
and cut the network with Chrome DevTools (Network.emulateNetworkConditions). Test tools only; never shipped."""
import json
import re
import subprocess
from pathlib import Path

from robot.api.deco import keyword, library
from robot.libraries.BuiltIn import BuiltIn

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]

_SET_RANGE = r'''
const el = arguments[0], v = String(arguments[1]);
const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
setter.call(el, v);
el.dispatchEvent(new Event('input', { bubbles: true }));
el.dispatchEvent(new Event('change', { bubbles: true }));
return el.value;
'''


@library(scope='GLOBAL')
class ApiAndroidLib:
    @property
    def _d(self):
        return BuiltIn().get_library_instance('SeleniumLibrary').driver

    # ------------------------------------------------------------------ API
    @keyword('Call API With')
    def call_api_with(self, method, path, body=None, scenario='none', headers=None, env=None, raw_body=None, repeat=1):
        """Like ``Call API`` but can send ``raw_body`` as is (invalid JSON, a form post) and ``repeat`` the request N
        times against one Worker instance; the result has ``statuses`` (one per request) and the last response."""
        if isinstance(body, str) and body[:1] in '[{':
            body = json.loads(body)
        payload = {'method': method.upper(), 'path': path, 'body': body, 'scenario': scenario,
                   'headers': json.loads(headers) if isinstance(headers, str) else (headers or {}),
                   'env': json.loads(env) if isinstance(env, str) else (env or {}),
                   'rawBody': raw_body, 'repeat': int(repeat)}
        p = subprocess.run(['node', str(HERE / 'api-bridge.mjs')], input=json.dumps(payload), capture_output=True,
                           text=True, cwd=str(ROOT), timeout=120)
        if p.returncode != 0:
            raise AssertionError(f'api-bridge.mjs failed: {p.stderr.strip()[-2000:]}')
        return json.loads(p.stdout)

    @keyword('Upstream Calls')
    def upstream_calls(self, result, method=None, contains=''):
        """The faked Razorpay/Google calls the Worker made, filtered by HTTP method and a URL fragment."""
        return [c for c in result['upstream'] if (not method or c['method'] == method.upper()) and contains in c['url']]

    @keyword('Logs Should Contain Event')
    def logs_contain(self, result, event, extra=''):
        """At least one Worker log line has ``"evt":"<event>"`` (or ``"result":"<event>"``) and contains ``extra``."""
        hits = [l for l in result['logs'] if (f'"{event}"' in l) and extra in l]
        if not hits:
            raise AssertionError(f'No log line with "{event}" {extra}: {result["logs"]}')
        return hits

    @keyword('Log API Result')
    def log_api(self, result):
        """Writes the status, body, headers and upstream calls into log.html as evidence (no secrets are in them)."""
        BuiltIn().log(json.dumps({k: result[k] for k in ('status', 'statuses', 'json', 'headers', 'upstream', 'claims', 'leaks')},
                                 indent=1, ensure_ascii=False))

    # ------------------------------------------------------------------ Android app screens
    def _click(self, el):
        self._d.execute_script('arguments[0].scrollIntoView({block: "center"}); arguments[0].click();', el)

    @keyword('Tap Dock')
    def tap_dock(self, label):
        """Taps the bottom dock category (Wealth, Income, Debts, Macro)."""
        els = self._d.find_elements('xpath', f'//footer//button[.//span[normalize-space(.)="{label}"]]')
        if not els:
            raise AssertionError(f'No dock button "{label}"')
        self._click(els[0])

    @keyword('Tap Tool')
    def tap_tool(self, name):
        """Taps a tool in the header tool bar (SIP Engine, Lump Sum, SWP Cashflow, Fixed Deposit, Loan & EMI, ...)."""
        els = self._d.find_elements('xpath', f'//header//button[normalize-space(.)="{name}"]')
        if not els:
            raise AssertionError(f'No tool button "{name}"')
        self._click(els[0])

    @keyword('Tap App Button')
    def tap_main_button(self, name):
        els = self._d.find_elements('xpath', f'//main//button[normalize-space(.)="{name}"]')
        if not els:
            raise AssertionError(f'No button "{name}" in the workspace')
        self._click(els[0])

    @keyword('Panel Heading Should Be')
    def panel_heading(self, text):
        """The open tool's panel heading (an h2; compared case-insensitively because CSS shows it in capitals)."""
        hs = [h.get_attribute('textContent').strip() for h in self._d.find_elements('css selector', 'main h2')]
        if text.lower() not in [h.lower() for h in hs]:
            raise AssertionError(f'Panel heading "{text}" not shown; headings: {hs}')

    @keyword('Big Figure')
    def big_figure(self):
        """Text of the large result figure of the open tool (Maturity Balance, Monthly EMI Due, ...)."""
        els = self._d.find_elements('css selector', 'main div.text-3xl, main div.text-2xl')
        if not els:
            raise AssertionError('No result figure on the screen')
        return els[0].get_attribute('textContent').strip()

    @keyword('Result Row')
    def result_row(self, label):
        """Text of the value printed next to the result label ``label`` (e.g. Total Invested)."""
        els = self._d.find_elements('xpath', f'//main//span[normalize-space(.)="{label}"]/following-sibling::span[1]')
        if not els:
            raise AssertionError(f'No result row "{label}"')
        return els[0].get_attribute('textContent').strip()

    @keyword('Amount')
    def amount(self, text):
        """The whole number in an amount such as "₹27,00,000" or "+₹48,58,000" (minus kept)."""
        m = re.search(r'-?[\d,]+(\.\d+)?', str(text).replace('−', '-'))
        if not m:
            raise AssertionError(f'No number in "{text}"')
        return float(m.group(0).replace(',', ''))

    @keyword('Set App Slider')
    def set_slider(self, index, value):
        """Moves the ``index``-th range slider (0-based) of the open tool to ``value``, as a drag does (input event)."""
        els = self._d.find_elements('css selector', 'main input[type="range"]')
        if int(index) >= len(els):
            raise AssertionError(f'Only {len(els)} sliders on the screen')
        return self._d.execute_script(_SET_RANGE, els[int(index)], value)

    @keyword('Slider Bounds')
    def slider_bounds(self, index):
        el = self._d.find_elements('css selector', 'main input[type="range"]')[int(index)]
        return {'min': float(el.get_attribute('min')), 'max': float(el.get_attribute('max')), 'value': float(el.get_attribute('value'))}

    @keyword('Number Of App Sliders')
    def count_sliders(self):
        return len(self._d.find_elements('css selector', 'main input[type="range"]'))

    @keyword('Type In App Field')
    def type_field(self, index, value):
        """Types ``value`` into the ``index``-th number box (0-based) of the open tool, as the keyboard does."""
        els = self._d.find_elements('css selector', 'main input[type="number"]')
        el = els[int(index)]
        return self._d.execute_script(_SET_RANGE, el, value)

    @keyword('Mark Document')
    def mark_document(self):
        """Tags the loaded document, so ``Document Should Not Have Reloaded`` can prove no full reload happened."""
        self._d.execute_script('window.__noReload = true')

    @keyword('Document Should Not Have Reloaded')
    def not_reloaded(self):
        if self._d.execute_script('return window.__noReload === true') is not True:
            raise AssertionError('The document reloaded (the marker set before is gone)')

    @keyword('Set Network Offline')
    def set_offline(self, offline=True):
        """Cuts (or restores) the network with Chrome DevTools: Network.emulateNetworkConditions offline."""
        off = str(offline).lower() in ('true', '1', 'yes')
        self._d.execute_cdp_cmd('Network.enable', {})
        self._d.execute_cdp_cmd('Network.emulateNetworkConditions', {'offline': off, 'latency': 0, 'downloadThroughput': -1, 'uploadThroughput': -1})
        return self._d.execute_script('return navigator.onLine')

    @keyword('Browser Log Lines')
    def browser_log(self):
        """Console lines (all levels) since the last read."""
        try:
            return [e.get('message', '') for e in self._d.get_log('browser')]
        except Exception:
            return []

    @keyword('Image Should Decode')
    def image_decodes(self, css):
        w = self._d.execute_script('const i = document.querySelector(arguments[0]); return i ? i.naturalWidth : -1', css)
        if not w or w <= 0:
            raise AssertionError(f'Image {css} did not decode (naturalWidth {w})')
        return w
