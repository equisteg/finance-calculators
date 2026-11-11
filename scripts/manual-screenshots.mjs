// Captures the real screens used in docs/USER_MANUAL.md, docs/HLD.md and docs/LLD.md (docs/manual/*.png).
// Run: npm run docs:shots   (needs the local builds served, as the Robot suites do:
//        python tests/automation/run.py --serve ... or node tests/web/scripts/serve-static.mjs apps/web/out 3100,
//        apps/mobile/out on 3101 and the test-key Pro build tests/automation/.pro-site on 3102)
//      BASE_URL=https://finealth-staging.<account>.workers.dev npm run docs:shots   (website shots only)
// Only local or *-staging/*-dev workers.dev addresses are allowed: never production.
// Every number shown is the built-in example household; no real data. The Pro shots use the throwaway test key from
// tests/automation/tools/build-pro-site.mjs (skipped when that build or its token is missing).
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from '@playwright/test';

const BASE = (process.env.BASE_URL || 'http://127.0.0.1:3100').replace(/\/$/, '');
const APP = (process.env.MOBILE_URL || 'http://127.0.0.1:3101').replace(/\/$/, '');
const PRO = (process.env.PRO_URL || 'http://127.0.0.1:3102').replace(/\/$/, '');
const allowed = (u) => {
  const h = new URL(u).hostname;
  return ['localhost', '127.0.0.1'].includes(h) || /^[a-z0-9-]+-(staging|dev)\.[a-z0-9-]+\.workers\.dev$/.test(h);
};
for (const u of [BASE, APP, PRO]) if (!allowed(u)) { console.error(`Refusing ${u}: local, *-staging or *-dev workers.dev only.`); process.exit(1); }

const tokenFile = fileURLToPath(new URL('../tests/automation/.pro-site.token', import.meta.url));
const TOKEN = process.env.PRO_TEST_TOKEN || (existsSync(tokenFile) ? readFileSync(tokenFile, 'utf8').trim() : '');
const dir = fileURLToPath(new URL('../docs/manual/', import.meta.url));
mkdirSync(dir, { recursive: true });
for (const f of readdirSync(dir)) if (f.endsWith('.png')) rmSync(`${dir}/${f}`); // screens that no longer exist go too

// The Chromium that ships with this Playwright, or CHROME_BINARY (e.g. a pre-installed browser of another version).
const browser = await chromium.launch(process.env.CHROME_BINARY ? { executablePath: process.env.CHROME_BINARY } : {});
const common = { locale: 'en-IN', timezoneId: 'Asia/Kolkata', serviceWorkers: 'block', reducedMotion: 'reduce' };
const page = async (opts, init) => {
  const ctx = await browser.newContext({ colorScheme: 'light', ...common, ...opts });
  // Block the live exchange-rate call, so pictures never depend on the network; the page falls back to its built-in rates.
  await ctx.route(/open\.er-api\.com|googlesyndication|doubleclick/, (r) => r.abort());
  if (init) await ctx.addInitScript(init.fn, init.arg);
  return ctx.newPage();
};
const desktop = await page({ viewport: { width: 1280, height: 860 } });
const dark = await page({ viewport: { width: 1280, height: 860 }, colorScheme: 'dark' });
const phone = await page({ ...devices['Pixel 7'] });
const seedPro = { fn: (t) => { try { localStorage.setItem('finealth.pro.v1', JSON.stringify({ key: 'pay_TestKey12345678', plan: 'pro_yearly', token: t })); } catch { /* blocked */ } }, arg: TOKEN };
const pro = TOKEN ? await page({ viewport: { width: 1280, height: 860 } }, seedPro) : null;

async function open(p, url) {
  await p.goto(url, { waitUntil: 'networkidle' });
  await p.locator('main#main h1').first().waitFor({ timeout: 30_000 });
  await p.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : undefined)); // no focused skip link
  await p.waitForTimeout(700); // fonts and charts settle
}
// The sticky header would cover the top of a section picture, so it scrolls away for these shots.
const section = (sel) => async (p) => {
  await p.evaluate(() => { const h = document.querySelector('header'); if (h) h.style.position = 'static'; });
  const el = p.locator(sel).first();
  await el.scrollIntoViewIfNeeded();
  await p.waitForTimeout(300);
  return el;
};

// Scrolls a small element (a score, a button) to the middle of the window and shoots the window around it.
const around = (sel) => async (p) => {
  await p.locator(sel).first().evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await p.waitForTimeout(400);
  return null;
};

// [file name, page, url, optional step; a step returning a locator shoots that element, otherwise the window]
// The numbers match the pictures in docs/USER_MANUAL.md.
const SCREENS = [
  ['01-home', desktop, `${BASE}/`],
  ['02-home-planners', desktop, `${BASE}/`, section('#planners, [data-testid="planner-bento"]')],
  ['03-quick-calculators', desktop, `${BASE}/quick-calculators/`],
  ['04-home-plans', desktop, `${BASE}/`, section('[data-testid="free-vs-pro"]')],
  ['05-home-faq', desktop, `${BASE}/`, section('[data-testid="home-faq"]')],
  ['06-health-check', desktop, `${BASE}/health-check/`],
  ['07-health-result', desktop, `${BASE}/health-check/`, around('[data-testid="health-score"]')],
  ['08-debt-payoff', desktop, `${BASE}/debt-payoff/`],
  ['09-goal-planner', desktop, `${BASE}/goal-planner/`],
  ['10-retirement', desktop, `${BASE}/retirement-planner/`],
  ['11-prepayment', desktop, `${BASE}/loan-prepayment/`],
  ['12-my-plan', desktop, `${BASE}/my-plan/`],
  ['13-all-tools', desktop, `${BASE}/tools/`],
  ['14-tool-emergency', desktop, `${BASE}/tools/emergency-fund-calculator/`],
  ['15-tool-tax', desktop, `${BASE}/tools/india-tax-regime-calculator/`],
  ['16-sip', desktop, `${BASE}/sip-calculator/`],
  ['17-emi', desktop, `${BASE}/emi-calculator/`],
  ['18-compound', desktop, `${BASE}/compound-interest/`],
  ['19-pricing', desktop, `${BASE}/pricing/`],
  ['20-restore-pro', desktop, `${BASE}/pro/`],
  ['21-privacy', desktop, `${BASE}/privacy/`],
  ['22-dark-home', dark, `${BASE}/`],
  ['23-phone-home', phone, `${BASE}/`],
  ['24-phone-health', phone, `${BASE}/health-check/`],
  ...(pro ? [
    ['25-pro-health', pro, `${PRO}/health-check/`],
    ['26-pro-debt', pro, `${PRO}/debt-payoff/`, around('[data-testid="whatif-result"], [data-testid="export-debt-csv"]')],
    ['27-pro-retirement-odds', pro, `${PRO}/retirement-planner/`, async (p) => {
      await p.locator('[data-testid="run-odds"]').click();
      await p.locator('[data-testid="odds-success"]').waitFor({ timeout: 30_000 });
      return around('[data-testid="odds-success"]')(p);
    }],
  ] : []),
];

for (const [name, p, url, step] of SCREENS) {
  try {
    await open(p, url);
    const target = step ? await step(p) : null;
    if (target) await target.screenshot({ path: `${dir}/${name}.png` });
    else await p.screenshot({ path: `${dir}/${name}.png` });
    console.log(`  ${name}.png`);
  } catch (e) {
    console.error(`  ${name}.png FAILED: ${e.message.split('\n')[0]}`);
    process.exitCode = 1;
  }
}

// The Android app: its own static export in a phone frame, after the 2.2 s splash.
try {
  const app = await page({ ...devices['Pixel 7'] });
  await app.goto(`${APP}/`, { waitUntil: 'networkidle' });
  await app.waitForTimeout(2800);
  await app.screenshot({ path: `${dir}/28-app-dashboard.png` });
  console.log('  28-app-dashboard.png');
} catch (e) {
  console.error(`  28-app-dashboard.png FAILED (is the mobile build served on ${APP}?): ${e.message.split('\n')[0]}`);
}

await browser.close();
if (!pro) console.log('Pro shots skipped: run node tests/automation/tools/build-pro-site.mjs and serve tests/automation/.pro-site');
console.log(`screenshots written to docs/manual/ from ${BASE}`);
