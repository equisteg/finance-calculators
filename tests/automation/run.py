#!/usr/bin/env python3
"""Runs the Finealth Robot Framework suites and keeps the evidence.

Examples (from the repository root):
  python tests/automation/run.py --env local --serve                  # everything, against the local builds, browser visible
  python tests/automation/run.py --env local --serve --suite sanity   # the sanity set only
  python tests/automation/run.py --env local --serve --feature home   # one feature folder (web/home)
  python tests/automation/run.py --env local --serve --test TC-W-HOM-001,TC-W-HLT-002
  python tests/automation/run.py --platform android --env local --serve   # the Android app's screens (phone emulation)
  python tests/automation/run.py --platform api                        # Worker API (no browser, no server needed)
  python tests/automation/run.py --suite regression --headless --base-url https://finealth-staging.<account>.workers.dev
  python tests/automation/run.py --dryrun                              # check every suite without running anything

Local builds: `npm run build -w @finealth/web` (apps/web/out), `npm run build -w @finealth/mobile` (apps/mobile/out) and,
for the Pro cases, `node tests/automation/tools/build-pro-site.mjs` (a test-key build in tests/automation/.pro-site plus
a matching token). `--serve` starts a static server for each build that exists.
Evidence: tests/automation/results/<date-time>/ holds report.html (summary), log.html (every step with screenshots)
and output.xml. --log-bugs also feeds the results into tests/bugs/bug-log.xlsx and the test-case statuses.
Never point this at production: run.py refuses any address that is not local, dev or staging.
"""
import argparse
import json
import os
import socket
import subprocess
import sys
import time
import webbrowser
from pathlib import Path
from urllib.parse import urlparse

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
LOCAL = {'web': 'http://127.0.0.1:3100', 'android': 'http://127.0.0.1:3101', 'pro': 'http://127.0.0.1:3102'}
BUILDS = {'web': ROOT / 'apps/web/out', 'android': ROOT / 'apps/mobile/out', 'pro': HERE / '.pro-site'}
PRO_TOKEN_FILE = HERE / '.pro-site.token'
PRO_TOKEN_REFRESH_FILE = HERE / '.pro-site.token-refresh'
PRO_TOKEN_EXPIRED_FILE = HERE / '.pro-site.token-expired'


def allowed(url):
    host = urlparse(url).hostname or ''
    # Only the Worker's own name (the first label) may say -staging / -dev: an account subdomain like acct-dev must not count.
    return host in ('127.0.0.1', 'localhost') or (host.endswith('.workers.dev') and host.split('.')[0].endswith(('-staging', '-dev')))


def port_open(port):
    with socket.socket() as s:
        s.settimeout(0.3)
        return s.connect_ex(('127.0.0.1', port)) == 0


def serve(kind, procs):
    port = int(urlparse(LOCAL[kind]).port)
    if port_open(port):
        return True
    if not BUILDS[kind].exists():
        print(f'  {kind}: no build at {BUILDS[kind]} (those tests will fail or skip)', flush=True)
        return False
    procs.append(subprocess.Popen(['node', str(ROOT / 'tests/web/scripts/serve-static.mjs'), str(BUILDS[kind]), str(port)],
                                  stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL))
    for _ in range(50):
        if port_open(port):
            print(f'  {kind}: serving {BUILDS[kind].relative_to(ROOT)} on {LOCAL[kind]}', flush=True)
            return True
        time.sleep(0.1)
    return False


def main():
    p = argparse.ArgumentParser(description='Run Finealth Robot Framework suites')
    p.add_argument('--suite', choices=['sanity', 'regression', 'integration', 'all'], default='all', help='which flagged set to run')
    p.add_argument('--platform', choices=['web', 'android', 'api', 'all'], default='all',
                   help='web (website), android (the app screens in phone emulation), api (Worker), or all')
    p.add_argument('--feature', help='a feature folder, e.g. home, health, debt, tools (under tests/automation/<platform>/)')
    p.add_argument('--test', help='test case IDs, comma-separated, e.g. TC-W-HOM-001,TC-A-LIC-002')
    p.add_argument('--exclude', help='leave out tests with this tag')
    p.add_argument('--env', choices=['local', 'staging', 'dev'], default=os.environ.get('FH_TEST_ENV', 'local'))
    p.add_argument('--base-url', help='website address (local, dev or staging only); default the local web build')
    p.add_argument('--mobile-url', help='address of the Android app build (default the local mobile build)')
    p.add_argument('--pro-url', help='address of the test-key Pro build (default the local .pro-site build)')
    p.add_argument('--serve', action='store_true', help='start local static servers for the builds that exist')
    p.add_argument('--browser', choices=['chrome', 'firefox', 'edge'], default='chrome')
    p.add_argument('--headless', action='store_true', help='no browser window (CI); by default the browser is visible')
    p.add_argument('--slow', type=float, default=0.0, help='seconds to pause after each browser action, to watch closely')
    p.add_argument('--dryrun', action='store_true', help='check keywords and arguments without running anything')
    p.add_argument('--log-bugs', action='store_true', help='after the run, add failures to the bug log and statuses to the sheet')
    p.add_argument('--no-open', action='store_true', help='do not open the report when the run ends')
    a = p.parse_args()

    base = (a.base_url or LOCAL['web']).rstrip('/')
    mobile = (a.mobile_url or LOCAL['android']).rstrip('/')
    pro = (a.pro_url or LOCAL['pro']).rstrip('/')
    for url in (base, mobile, pro):
        if not allowed(url):
            sys.exit(f'Refusing to run against {url}: only local, *-dev.*.workers.dev or *-staging.*.workers.dev addresses are allowed.')

    out = HERE / 'results' / f"{time.strftime('%Y-%m-%d_%H-%M-%S')}_{os.getpid()}{'_DRYRUN' if a.dryrun else ''}"
    out.mkdir(parents=True, exist_ok=True)
    targets = [HERE / f for f in (['web', 'mobile', 'api'] if a.platform == 'all' else ['mobile' if a.platform == 'android' else a.platform])]
    if a.feature:
        targets = [t / a.feature for t in targets if (t / a.feature).exists()]
        if not targets:
            sys.exit(f'No feature folder named {a.feature}')

    procs = []
    if a.serve and not a.dryrun:
        print('Local servers:', flush=True)
        for kind, url in (('web', base), ('android', mobile), ('pro', pro)):
            if urlparse(url).hostname in ('127.0.0.1', 'localhost'):
                serve(kind, procs)
    token = os.environ.get('PRO_TEST_TOKEN') or (PRO_TOKEN_FILE.read_text().strip() if PRO_TOKEN_FILE.exists() else '')
    token_refresh = PRO_TOKEN_REFRESH_FILE.read_text().strip() if PRO_TOKEN_REFRESH_FILE.exists() else ''
    token_expired = PRO_TOKEN_EXPIRED_FILE.read_text().strip() if PRO_TOKEN_EXPIRED_FILE.exists() else ''

    cmd = [sys.executable, '-m', 'robot',
           '--outputdir', str(out), '--output', 'output.xml', '--log', 'log.html', '--report', 'report.html',
           '--name', f'Finealth {a.platform} {a.suite}', '--loglevel', 'INFO',
           '--listener', str(HERE / 'libraries' / 'LiveProgress.py'), '--console', 'quiet', '--runemptysuite',
           '--variable', f'BASE_URL:{base}', '--variable', f'MOBILE_URL:{mobile}', '--variable', f'PRO_URL:{pro}',
           '--variable', f'PRO_TOKEN:{token}', '--variable', f'PRO_TOKEN_REFRESH:{token_refresh}',
           '--variable', f'PRO_TOKEN_EXPIRED:{token_expired}', '--variable', f'ENV:{a.env}', '--variable', f'BROWSER:{a.browser}',
           '--variable', f'HEADLESS:{a.headless}', '--variable', f'SLOW:{a.slow}', '--variable', f'RESULTS:{out}',
           '--pythonpath', str(HERE / 'libraries'),
           '--metadata', f'Environment:{a.env} ({base})', '--metadata', f'Browser:{a.browser}']
    if a.dryrun:
        cmd.append('--dryrun')
    if a.suite != 'all':
        cmd += ['--include', a.suite]
    if a.exclude:
        cmd += ['--exclude', a.exclude]
    for t in (a.test or '').split(','):
        if t.strip():
            cmd += ['--test', f'{t.strip()}*']
    cmd += [str(t) for t in targets]

    print(f'Finealth tests · {a.platform} · suite {a.suite} · {a.env} ({base}) · {a.browser}{" headless" if a.headless else " (window visible)"}', flush=True)
    print(f'Evidence folder: {out}', flush=True)
    env = {**os.environ, 'PYTHONIOENCODING': 'utf-8'}
    try:
        code = subprocess.call(cmd, cwd=HERE, env=env)
    finally:
        for pr in procs:
            pr.terminate()
    print(f'\nReport: {out / "report.html"}\nStep log with screenshots: {out / "log.html"}')
    (out / 'run.json').write_text(json.dumps({'env': a.env, 'base_url': base, 'platform': a.platform, 'suite': a.suite, 'dryrun': a.dryrun}))

    if a.log_bugs:
        subprocess.call(['node', str(ROOT / 'tests/tools/collect-results.mjs'), str(out), '--env', a.env, '--base-url', base], cwd=ROOT)
        subprocess.call([sys.executable, str(ROOT / 'tests/tools/bug_log.py'), 'ingest', str(out / 'summary.json')], cwd=ROOT)
    if not a.no_open and not a.headless and not a.dryrun:
        webbrowser.open((out / 'report.html').as_uri())
    sys.exit(code)


if __name__ == '__main__':
    main()
