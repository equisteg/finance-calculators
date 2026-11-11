"""Extra keywords for the non-functional suites (tests/automation/web/nfr): API outage simulation (CDP blocked URLs),
engine timing, forged Pro tokens, secret scans of the built bundles, keyboard reachability and accessible names.
Used together with FinealthLib (resources/nonfunctional.resource). Test tools only; never shipped."""
import base64
import json
import os
import shutil
import subprocess
import time
from datetime import date
from pathlib import Path

from robot.api.deco import keyword, library
from robot.libraries.BuiltIn import BuiltIn
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.keys import Keys

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]


def _b64d(s):
    return base64.urlsafe_b64decode(s + '=' * (-len(s) % 4))


def _b64e(b):
    return base64.urlsafe_b64encode(b).decode().rstrip('=')


@library(scope='GLOBAL')
class NonfunctionalLib:
    @property
    def _d(self):
        return BuiltIn().get_library_instance('SeleniumLibrary').driver

    def _node(self, code, payload=None, timeout=120):
        p = subprocess.run(['node', '--input-type=module', '-e', code], input=json.dumps(payload or {}),
                           capture_output=True, text=True, cwd=str(ROOT), timeout=timeout)
        if p.returncode != 0:
            raise AssertionError(f'node failed: {p.stderr.strip()[-2000:]}')
        return json.loads(p.stdout)

    # ------------------------------------------------------------------ reliability
    @keyword('Block API Requests')
    def block_api(self, *patterns):
        """Makes every request to /api/* fail in the browser (Chrome DevTools Network.setBlockedURLs), as if the Worker
        were down. Stays on for the rest of the browser session, across navigations."""
        urls = list(patterns) or ['*/api/*']
        self._d.execute_cdp_cmd('Network.enable', {})
        self._d.execute_cdp_cmd('Network.setBlockedURLs', {'urls': urls})

    @keyword('Type Into First Number Input')
    def type_first_number(self, value):
        """Types ``value`` into the first number input in <main> (select all, type, Tab). Returns False when the page
        has no number input (for example a tool that takes a pasted list)."""
        el = self._d.execute_script('return document.querySelector("main input[type=number]")')
        if el is None:
            return False
        self._d.execute_script('arguments[0].scrollIntoView({block: "center"})', el)
        el.click()
        el.send_keys(Keys.CONTROL, 'a')
        el.send_keys(Keys.DELETE)
        el.send_keys(str(value))
        el.send_keys(Keys.TAB)
        return True

    @keyword('Local Storage Should Contain Text')
    def storage_contains(self, text, timeout=5):
        """Passes when some finealth.* localStorage value contains ``text`` (proof the typed number was accepted and
        kept on the device)."""
        end = time.time() + float(timeout)
        while True:
            blob = self._d.execute_script(
                'return Object.keys(localStorage).filter(k => k.startsWith("finealth")).map(k => localStorage.getItem(k)).join("\\n")')
            if str(text) in (blob or ''):
                return
            if time.time() > end:
                raise AssertionError(f'"{text}" is not kept in finealth.* browser storage')
            time.sleep(0.3)

    @keyword('Local Storage Keys Outside Namespace')
    def storage_outside(self):
        """localStorage keys that do not start with "finealth" (all app data must stay under finealth.*)."""
        return self._d.execute_script('return Object.keys(localStorage).filter(k => !k.startsWith("finealth"))')

    # ------------------------------------------------------------------ performance
    @keyword('Time Monte Carlo')
    def time_monte_carlo(self, runs=1000, years=80, repeats=7):
        """Runs retirementOdds from packages/finance-core in one Node process ``repeats`` times (after one warm-up) on a
        plan of ``years`` years (age 20 to 20 + years) and returns {median_ms, max_ms, runs, years, result}."""
        code = r'''
import { load, readStdin } from './tests/automation/libraries/bundle.mjs';
const { runs, years, repeats } = await readStdin();
const core = await load('packages/finance-core/src/index.ts', 'finance-core', ['packages/finance-core/src']);
const input = { currentAge: 20, retireAge: 60, planToAge: 20 + years, currentSavings: 500000, monthlySaving: 20000,
  yearlySpendingToday: 600000, inflationPct: 6, returnPct: 11, retiredReturnPct: 7, volatilityPct: 15 };
core.retirementOdds(input, runs);
const t = [];
let result;
for (let i = 0; i < repeats; i++) { const a = performance.now(); result = core.retirementOdds(input, runs); t.push(performance.now() - a); }
t.sort((x, y) => x - y);
process.stdout.write(JSON.stringify({ median_ms: t[Math.floor(t.length / 2)], max_ms: t[t.length - 1], runs: result.runs, years, result }));
'''
        return self._node(code, {'runs': int(runs), 'years': int(years), 'repeats': int(repeats)})

    @keyword('Tool Is Installed')
    def tool_installed(self, name):
        """True when the command ``name`` is on PATH or in node_modules/.bin (no download, no install)."""
        return bool(shutil.which(name) or (ROOT / 'node_modules' / '.bin' / name).exists())

    # ------------------------------------------------------------------ security
    @keyword('Forge Pro Token Claims')
    def forge_claims(self, **changes):
        """Rewrites the claims inside the stored Pro token (e.g. plan=pro_lifetime, exp_years=10) and keeps the old
        signature, the way an attacker would edit localStorage. Returns the forged claims."""
        raw = json.loads(self._d.execute_script('return localStorage.getItem("finealth.pro.v1")') or '{}')
        body, sig = raw['token'].split('.')
        claims = json.loads(_b64d(body))
        if 'plan' in changes:
            claims['plan'] = changes['plan']
        if 'exp_years' in changes:
            claims['exp'] = int(time.time()) + int(changes['exp_years']) * 365 * 86400
        raw['token'] = _b64e(json.dumps(claims, separators=(',', ':')).encode()) + '.' + sig
        if 'plan' in changes:
            raw['plan'] = changes['plan']
        self._d.execute_script('localStorage.setItem("finealth.pro.v1", arguments[0])', json.dumps(raw))
        return claims

    @keyword('Store Token Signed By Foreign Key')
    def foreign_token(self):
        """Signs valid-looking Pro claims with a freshly generated Ed25519 key (not the one the build trusts) and stores
        them as the Pro licence. Returns the claims."""
        code = r'''
const enc = new TextEncoder();
const b64 = (b) => Buffer.from(b).toString('base64url');
const kp = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
const now = Math.floor(Date.now() / 1000);
const claims = { v: 1, plan: 'pro_lifetime', src: 'razorpay', iat: now, exp: now + 7 * 86400 };
const body = b64(enc.encode(JSON.stringify(claims)));
const sig = new Uint8Array(await crypto.subtle.sign({ name: 'Ed25519' }, kp.privateKey, enc.encode(body)));
process.stdout.write(JSON.stringify({ token: body + '.' + b64(sig), claims }));
'''
        out = self._node(code)
        self._d.execute_script('localStorage.setItem("finealth.pro.v1", arguments[0])',
                               json.dumps({'key': 'pay_ForgedKey1234567', 'plan': 'pro_lifetime', 'token': out['token']}))
        return out['claims']

    @keyword('Scan Folder For Secrets')
    def scan_secrets(self, folder):
        """Runs the repo's secret value patterns (tests/tools/secret-patterns.mjs) over every text file in ``folder``
        (a built bundle). Returns {files, findings: ["path: kind"]}."""
        code = r'''
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { findSecretValue } from './tests/tools/secret-patterns.mjs';
let s = ''; for await (const c of process.stdin) s += c;
const { folder } = JSON.parse(s);
const findings = []; let files = 0;
const walk = (d) => { for (const e of readdirSync(d, { withFileTypes: true })) { const p = join(d, e.name);
  if (e.isDirectory()) walk(p); else { if (statSync(p).size > 5e6) continue; const t = readFileSync(p, 'utf8');
    if (t.includes('\u0000')) continue; files++; const v = findSecretValue(t); if (v) findings.push(relative(folder, p) + ': ' + v); } } };
walk(folder);
process.stdout.write(JSON.stringify({ files, findings }));
'''
        return self._node(code, {'folder': str(Path(folder).resolve())})

    # ------------------------------------------------------------------ accessibility
    @keyword('Tab Until Focused')
    def tab_until(self, css, max_tabs=60):
        """Presses Tab from the top of the page until the focused element matches ``css``; returns the number of
        presses. Fails after ``max_tabs``."""
        d = self._d
        d.execute_script('document.activeElement && document.activeElement.blur(); window.scrollTo(0, 0);')
        for i in range(1, int(max_tabs) + 1):
            ActionChains(d).send_keys(Keys.TAB).perform()
            if d.execute_script('return !!document.activeElement && document.activeElement.matches(arguments[0])', css):
                visible = d.execute_script('const r = document.activeElement.getBoundingClientRect(); return r.width > 0 && r.height > 0')
                if not visible:
                    raise AssertionError(f'{css} took focus but is not visible')
                return i
        raise AssertionError(f'{css} was not reached with {max_tabs} Tab presses')

    @keyword('Press Key On Focused')
    def press_on_focused(self, key):
        ActionChains(self._d).send_keys(getattr(Keys, key.upper(), key)).perform()

    @keyword('Unnamed Form Fields')
    def unnamed_fields(self):
        """Inputs, selects and textareas in <main> with no accessible name (no label, aria-label or aria-labelledby)."""
        return self._d.execute_script(r'''
return [...document.querySelectorAll('main input:not([type=hidden]), main select, main textarea')].filter(el => {
  if ((el.getAttribute('aria-label') || '').trim()) return false;
  const by = el.getAttribute('aria-labelledby');
  if (by && by.split(/\s+/).some(id => (document.getElementById(id)?.textContent || '').trim())) return false;
  if (el.labels && [...el.labels].some(l => l.textContent.trim())) return false;
  if ((el.getAttribute('title') || '').trim()) return false;
  return true;
}).map(el => el.outerHTML.slice(0, 120));''')

    # ------------------------------------------------------------------ compliance
    @keyword('Days Since ISO Date')
    def days_since(self, iso):
        return (date.today() - date.fromisoformat(str(iso).strip())).days

    @keyword('Read Repo File')
    def read_repo_file(self, rel):
        p = ROOT / rel
        if not p.exists():
            raise AssertionError(f'{rel} does not exist')
        return p.read_text(encoding='utf-8')

    @keyword('Repo File Exists')
    def repo_file_exists(self, rel):
        return (ROOT / rel).exists()
