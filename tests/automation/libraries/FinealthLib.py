"""Finealth helper keywords for Robot Framework (Selenium): browser set-up, form fields, browser storage, Pro seeding,
downloads, network and console checks, accessibility (axe-core), layout shift, and two bridges that run the shared
TypeScript code directly: the finance engine (packages/finance-core) and the Worker API (apps/api, with Razorpay and
Google Play answered by scripted fakes). Used by resources/common.resource. Test tools only; never shipped."""
import csv
import json
import os
import re
import subprocess
import time
from pathlib import Path

import requests
from robot.api.deco import keyword, library
from robot.libraries.BuiltIn import BuiltIn
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
PRO_STORAGE_KEY = 'finealth.pro.v1'
AXE = ROOT / 'node_modules' / 'axe-core' / 'axe.min.js'
# axe cannot measure text on gradients: flatten the glass surfaces to their solid colours first (same as a11y.spec.ts)
FLATTEN = ('body{background-image:none!important}.card,.glass,.glass-strong{background:var(--surface)!important}'
           '.btn-primary{background:var(--accent-hi)!important}*{animation:none!important;transition:none!important}')

# Finds an input/select/textarea by its visible label (case-insensitive, start of the label text), its aria-label,
# or its data-testid. ``index`` picks the n-th match (0-based), for repeated rows such as debts and goals.
_FIND_FIELD = r'''
const [name, index] = [arguments[0].toLowerCase().trim(), arguments[1]];
const all = [...document.querySelectorAll('main input, main select, main textarea, header select')];
const text = (s) => (s || '').replace(/\s+/g, ' ').trim().toLowerCase();
const hits = all.filter((el) => {
  if (el.dataset.testid && el.dataset.testid.toLowerCase() === name) return true;
  if (text(el.getAttribute('aria-label')) === name || text(el.getAttribute('aria-label')).startsWith(name)) return true;
  const lab = el.labels && el.labels[0];
  if (lab && text(lab.textContent).startsWith(name)) return true;
  const wrap = el.closest('label');
  return !!(wrap && text(wrap.textContent).startsWith(name));
});
return hits[index] || null;
'''


def _yes(v):
    return str(v).lower() in ('true', '1', 'yes')


@library(scope='GLOBAL')
class FinealthLib:
    def _sl(self):
        return BuiltIn().get_library_instance('SeleniumLibrary')

    @property
    def _d(self):
        return self._sl().driver

    # ------------------------------------------------------------------ browser
    @keyword('Open Finealth Browser')
    def open_browser(self, url, browser='chrome', headless=False, downloads='', phone=False, dark=False, width=1366, height=900,
                     reduced_motion=False):
        """Opens the browser with downloads to ``downloads``, an optional phone-size window (390 x 844, touch, Android user
        agent), the dark-mode preference and browser/network logging for the console and privacy checks.
        CHROMEDRIVER and CHROME_BINARY (environment) point Selenium at a driver and browser already on the machine;
        without them Selenium Manager finds or downloads the matching ChromeDriver itself."""
        headless, phone, dark, reduced_motion = _yes(headless), _yes(phone), _yes(dark), _yes(reduced_motion)
        Path(downloads).mkdir(parents=True, exist_ok=True)
        browser = browser.lower()
        if browser in ('chrome', 'edge'):
            o = webdriver.ChromeOptions() if browser == 'chrome' else webdriver.EdgeOptions()
            o.add_experimental_option('prefs', {
                'download.default_directory': str(Path(downloads).resolve()), 'download.prompt_for_download': False,
                'profile.default_content_setting_values.automatic_downloads': 1, 'intl.accept_languages': 'en-US,en',
            })
            o.add_argument('--lang=en-US')
            if os.environ.get('CHROME_BINARY'):
                o.binary_location = os.environ['CHROME_BINARY']
            if headless:
                o.add_argument('--headless=new')
            if os.environ.get('CI') or (hasattr(os, 'geteuid') and os.geteuid() == 0):
                o.add_argument('--no-sandbox')
            if phone:
                o.add_experimental_option('mobileEmulation', {
                    'deviceMetrics': {'width': 390, 'height': 844, 'pixelRatio': 3, 'touch': True},
                    'userAgent': 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36'})
            else:
                o.add_argument(f'--window-size={int(width)},{int(height)}')
            o.set_capability('goog:loggingPrefs', {'browser': 'ALL', 'performance': 'ALL'})
            service = None
            if os.environ.get('CHROMEDRIVER'):
                from selenium.webdriver.chrome.service import Service
                service = Service(os.environ['CHROMEDRIVER'])
            if browser == 'chrome':
                driver = webdriver.Chrome(options=o, service=service) if service else webdriver.Chrome(options=o)
            else:
                driver = webdriver.Edge(options=o)
        else:
            o = webdriver.FirefoxOptions()
            o.set_preference('intl.accept_languages', 'en-US, en')
            o.set_preference('browser.download.folderList', 2)
            o.set_preference('browser.download.dir', str(Path(downloads).resolve()))
            o.set_preference('browser.helperApps.neverAsk.saveToDisk', 'text/csv,application/json,application/octet-stream')
            if dark:
                o.set_preference('ui.systemUsesDarkTheme', 1)
            if headless:
                o.add_argument('-headless')
            driver = webdriver.Firefox(options=o)
            driver.set_window_size(390 if phone else int(width), 844 if phone else int(height))
        self._sl().register_driver(driver, None)
        if browser in ('chrome', 'edge'):
            features = []
            if dark:
                features.append({'name': 'prefers-color-scheme', 'value': 'dark'})
            if reduced_motion:
                features.append({'name': 'prefers-reduced-motion', 'value': 'reduce'})
            if features:
                driver.execute_cdp_cmd('Emulation.setEmulatedMedia', {'features': features})
        driver.get(url)

    @keyword('Set Window Width')
    def set_width(self, width, height=900):
        """Resizes the window so the page viewport is ``width`` px wide (for 320 px / 360 px layout checks)."""
        d = self._d
        try:
            d.execute_cdp_cmd('Emulation.setDeviceMetricsOverride', {'width': int(width), 'height': int(height), 'deviceScaleFactor': 1, 'mobile': int(width) < 600})
        except Exception:
            d.set_window_size(int(width), int(height))

    # ------------------------------------------------------------------ fields
    def _field(self, name, index=0, timeout=10):
        end = time.time() + float(timeout)
        while True:
            el = self._d.execute_script(_FIND_FIELD, str(name), int(index))
            if el is not None or time.time() > end:
                break
            time.sleep(0.2)
        if el is None:
            raise AssertionError(f'No field labelled "{name}" (match {index}) on the page')
        return el

    @keyword('Set Field')
    def set_field(self, name, value, index=0):
        """Types ``value`` into the field labelled ``name`` (label text, aria-label or data-testid; case-insensitive), the
        way a person does: select what is there, type the new value, leave the field. Selects pick the option whose value
        or text is ``value``; checkboxes take true/false."""
        el = self._field(name, index)
        tag = el.tag_name.lower()
        typ = (el.get_attribute('type') or '').lower()
        self._d.execute_script('arguments[0].scrollIntoView({block: "center"})', el)
        if tag == 'select':
            from selenium.webdriver.support.ui import Select
            s = Select(el)
            values = [o.get_attribute('value') for o in s.options]
            if str(value) in values:
                s.select_by_value(str(value))
            else:
                s.select_by_visible_text(str(value))
            return
        if typ == 'checkbox':
            if el.is_selected() != _yes(value):
                el.click()
            return
        if typ == 'range':
            self.set_range(name, value, index)
            return
        el.click()
        el.send_keys(Keys.CONTROL, 'a')
        el.send_keys(Keys.DELETE)
        if str(value) != '':
            el.send_keys(str(value))
        el.send_keys(Keys.TAB)

    @keyword('Set Range')
    def set_range(self, name, value, index=0):
        """Moves the slider labelled ``name`` to ``value`` (React picks up the change as if dragged)."""
        el = self._field(name, index)
        self._d.execute_script(
            'const el = arguments[0]; const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;'
            'set.call(el, String(arguments[1])); el.dispatchEvent(new Event("input", {bubbles: true}));'
            'el.dispatchEvent(new Event("change", {bubbles: true}));', el, str(value))

    @keyword('Field Value Should Be')
    def field_value(self, name, expected, index=0):
        got = self._field(name, index).get_attribute('value')
        if str(got) != str(expected):
            raise AssertionError(f'Field "{name}" holds "{got}", expected "{expected}"')

    @keyword('Get Field Value')
    def get_field_value(self, name, index=0):
        return self._field(name, index).get_attribute('value')

    @keyword('Click Centered')
    def click_centered(self, locator):
        """Scrolls the element to the middle of the window (clear of the floating header) and clicks it."""
        from selenium.webdriver.common.action_chains import ActionChains
        from selenium.common.exceptions import ElementClickInterceptedException
        el = self._sl().find_element(locator)
        self._d.execute_script('arguments[0].scrollIntoView({block: "center", inline: "nearest"})', el)
        # hovering a planner card widens its grid column (0.4 s); let the layout settle before clicking
        ActionChains(self._d).move_to_element(el).perform()
        time.sleep(0.5)
        try:
            el.click()
        except ElementClickInterceptedException:
            time.sleep(0.5)
            el.click()

    # ------------------------------------------------------------------ storage and Pro
    @keyword('Set Local Storage Item')
    def set_storage(self, key, value):
        self._d.execute_script('localStorage.setItem(arguments[0], arguments[1])', key, value if isinstance(value, str) else json.dumps(value))

    @keyword('Get Local Storage Item')
    def get_storage(self, key):
        return self._d.execute_script('return localStorage.getItem(arguments[0])', key)

    @keyword('Get Local Storage Keys')
    def storage_keys(self):
        return self._d.execute_script('return Object.keys(localStorage).sort()')

    @keyword('Clear Site Storage')
    def clear_storage(self):
        self._d.execute_script('localStorage.clear(); sessionStorage.clear();')

    @keyword('Seed Pro Licence')
    def seed_pro(self, token, key='pay_TestKey12345678', plan='pro_yearly'):
        """Stores a Pro licence record (licence key, plan, signed token) the way Restore Pro does. The token must be signed
        by the key the build trusts (NEXT_PUBLIC_LICENCE_PUBLIC_KEY): see tools/build-pro-site.mjs."""
        self.set_storage(PRO_STORAGE_KEY, json.dumps({'key': key, 'plan': plan, 'token': token}))

    @keyword('Tamper Pro Token')
    def tamper_pro(self):
        raw = json.loads(self.get_storage(PRO_STORAGE_KEY) or '{}')
        raw['token'] = raw.get('token', '')[:-4] + 'AAAA'
        self.set_storage(PRO_STORAGE_KEY, json.dumps(raw))

    # ------------------------------------------------------------------ page checks
    @keyword('Get Browser Console Problems')
    def console_problems(self):
        """Errors and warnings from the page console (Chrome/Edge). Third-party ad requests blocked offline and
        Chrome's own manifest checks are not page problems."""
        from robot.api import logger
        try:
            logs = self._d.get_log('browser')
        except Exception:
            return []
        out = []
        for e in logs:
            if e['level'] not in ('SEVERE', 'WARNING'):
                continue
            msg = e['message']
            origin = self._d.execute_script('return location.origin')
            third_party_net = 'net::ERR_' in msg and not msg.startswith(origin)
            if ' - Manifest: ' in msg or 'googlesyndication' in msg or 'adtrafficquality' in msg or 'favicon' in msg or third_party_net:
                logger.info(f'ignored: {msg}')
                continue
            out.append(f"{e['level']}: {msg}")
        return out

    @keyword('Get Network Requests')
    def network_requests(self):
        """Every request the page made since the last call: [{url, method, body}] (Chrome/Edge performance log)."""
        out = []
        for e in self._d.get_log('performance'):
            m = json.loads(e['message'])['message']
            if m.get('method') == 'Network.requestWillBeSent':
                r = m['params']['request']
                if r['url'].startswith(('data:', 'blob:')):
                    continue
                out.append({'url': r['url'], 'method': r['method'], 'body': r.get('postData', '') or ''})
        return out

    @keyword('No Request Should Carry')
    def no_request_carries(self, *values):
        """Fails when any request URL or body since the last network read contains one of ``values`` (the privacy
        check: financial numbers typed on the page must never leave the device)."""
        reqs = self.network_requests()
        bad = [f"{r['method']} {r['url']}" for r in reqs for v in values if str(v) in r['url'] or str(v) in r['body']]
        if bad:
            raise AssertionError(f'Financial input left the device: {bad}')
        non_get = [f"{r['method']} {r['url']}" for r in reqs if r['method'] not in ('GET', 'HEAD', 'OPTIONS')]
        return non_get

    @keyword('Page Has No Horizontal Scroll')
    def no_hscroll(self):
        w = self._d.execute_script('return [document.documentElement.scrollWidth, document.documentElement.clientWidth]')
        if w[0] > w[1] + 1:
            raise AssertionError(f'The page scrolls sideways: {w[0]} px content in a {w[1]} px window')

    @keyword('Elements Should Fit Their Boxes')
    def elements_fit(self, css):
        """Fails when an element matching ``css`` is wider than its parent (text spilling out of a tile)."""
        bad = self._d.execute_script(
            'return [...document.querySelectorAll(arguments[0])].filter(e => e.scrollWidth > e.parentElement.clientWidth + 1)'
            '.map(e => e.textContent.trim().slice(0, 40))', css)
        if bad:
            raise AssertionError(f'Spills out of its box: {bad}')

    @keyword('Get Layout Shift')
    def layout_shift(self, wait=2):
        """Cumulative layout shift since the page loaded (PerformanceObserver, buffered), after ``wait`` seconds."""
        time.sleep(float(wait))
        return self._d.execute_async_script(
            'const done = arguments[arguments.length - 1]; let cls = 0;'
            'new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) cls += e.value; })'
            '.observe({type: "layout-shift", buffered: true}); setTimeout(() => done(cls), 300);')

    @keyword('Run Axe')
    def run_axe(self):
        """Runs axe-core (WCAG 2.0/2.1/2.2 A and AA) on the page and returns the serious and critical violations."""
        d = self._d
        d.execute_script('const s = document.createElement("style"); s.textContent = arguments[0]; document.head.appendChild(s);', FLATTEN)
        d.execute_script(AXE.read_text(encoding='utf-8'))
        return d.execute_async_script(
            'const done = arguments[arguments.length - 1];'
            'axe.run(document, {runOnly: {type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]}}).then(r => done('
            'r.violations.filter(v => v.impact === "serious" || v.impact === "critical")'
            '.map(v => v.id + ": " + v.nodes.slice(0, 3).map(n => n.target.join(" ")).join(" | "))))'
            '.catch(e => done(["axe failed: " + e]));')

    @keyword('Get Computed Style')
    def computed_style(self, css, prop):
        return self._d.execute_script('const e = document.querySelector(arguments[0]); return e ? getComputedStyle(e)[arguments[1]] : null;', css, prop)

    @keyword('Contrast Ratio')
    def contrast(self, fg, bg):
        """WCAG contrast ratio of two CSS colours given as rgb()/rgba() strings."""
        def lum(c):
            r, g, b = [int(x) / 255 for x in re.findall(r'[\d.]+', c)[:3]]
            f = lambda v: v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
            return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
        a, b = sorted([lum(fg), lum(bg)], reverse=True)
        return round((a + 0.05) / (b + 0.05), 2)

    @keyword('Number From Text')
    def number_from(self, text):
        """"₹1,50,000" → 150000; "−21.04" → -21.04; "1 yr 10 mo" → 1 (the first number)."""
        t = str(text).replace('−', '-').replace(' ', '')
        m = re.search(r'-?[\d,]*\.?\d+', t)
        if not m:
            raise AssertionError(f'No number in "{text}"')
        return float(m.group(0).replace(',', ''))

    # ------------------------------------------------------------------ files
    @keyword('Wait For New Download')
    def wait_for_download(self, folder, suffix='', timeout=30, since=0):
        end = time.time() + float(timeout)
        while time.time() < end:
            files = [f for f in Path(folder).iterdir() if f.is_file() and not f.name.endswith(('.crdownload', '.part', '.tmp'))
                     and f.stat().st_mtime > float(since) and f.name.lower().endswith(suffix.lower())]
            if files:
                f = max(files, key=lambda x: x.stat().st_mtime)
                size = -1
                while size != f.stat().st_size:
                    size = f.stat().st_size
                    time.sleep(0.3)
                return str(f)
            time.sleep(0.3)
        raise AssertionError(f'No {suffix or "file"} downloaded into {folder} within {timeout} s')

    @keyword('Get Epoch Time')
    def now(self):
        return time.time()

    @keyword('Read CSV File')
    def read_csv(self, path):
        """Returns the rows of a CSV file as lists of cells (raw text kept, so a formula guard like a leading ' shows)."""
        with open(path, newline='', encoding='utf-8-sig') as f:
            return [row for row in csv.reader(f)]

    @keyword('Read Text File Raw')
    def read_raw(self, path):
        return Path(path).read_bytes().decode('utf-8-sig')

    @keyword('Read JSON File')
    def read_json(self, path):
        return json.loads(Path(path).read_text(encoding='utf-8'))

    @keyword('Write JSON File')
    def write_json(self, path, data):
        if isinstance(data, str):
            data = json.loads(data)
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        Path(path).write_text(json.dumps(data), encoding='utf-8')
        return str(path)

    @keyword('Clear Folder')
    def clear_folder(self, folder):
        Path(folder).mkdir(parents=True, exist_ok=True)
        for f in Path(folder).iterdir():
            if f.is_file():
                f.unlink()

    # ------------------------------------------------------------------ HTTP
    @keyword('Fetch Text')
    def fetch_text(self, url):
        r = requests.get(url, timeout=30)
        return {'status': r.status_code, 'text': r.text, 'headers': {k.lower(): v for k, v in r.headers.items()}}

    # ------------------------------------------------------------------ bridges to the TypeScript code
    def _node(self, script, payload, timeout=60):
        p = subprocess.run(['node', str(HERE / script)], input=json.dumps(payload), capture_output=True, text=True,
                           cwd=str(ROOT), timeout=timeout)
        if p.returncode != 0:
            raise AssertionError(f'{script} failed: {p.stderr.strip()[-2000:]}')
        return json.loads(p.stdout)

    @keyword('Call Engine')
    def call_engine(self, function, *args):
        """Runs ``function`` from the shared finance engine (packages/finance-core, the code both the website and the
        Android app run) with JSON ``args`` and returns its JSON result. Use it for rules the screens do not show."""
        parsed = [json.loads(a) if isinstance(a, str) and a[:1] in '[{"' or a in ('true', 'false', 'null') else
                  (float(a) if isinstance(a, str) and re.fullmatch(r'-?\d+(\.\d+)?', a) else a) for a in args]
        out = self._node('engine-bridge.mjs', {'fn': function, 'args': parsed})
        return out['result']

    @keyword('Call API')
    def call_api(self, method, path, body=None, scenario='none', headers=None, env=None):
        """Sends one request to the Finealth Worker (apps/api) running in Node, with Razorpay and Google Play answered by
        the named fake ``scenario`` (see api-bridge.mjs). Returns {status, headers, json, text, upstream, logs}."""
        if isinstance(body, str) and body[:1] in '[{':
            body = json.loads(body)
        payload = {'method': method.upper(), 'path': path, 'body': body, 'scenario': scenario,
                   'headers': json.loads(headers) if isinstance(headers, str) else (headers or {}),
                   'env': json.loads(env) if isinstance(env, str) else (env or {})}
        return self._node('api-bridge.mjs', payload, timeout=120)
