# Finealth

Private financial health check and planner by Equisteg. A 0-100 money score with ranked actions, a debt payoff planner (snowball vs avalanche), goal planner, retirement projection with Monte Carlo odds, loan prepayment optimiser and 36 free calculators. No login, no bank link: every number stays on the user's device. Freemium: free with ads, **Pro** (₹199/yr, ₹499 lifetime) for the full plan and no ads.

Built on the Equisteg monorepo template v4 (same layout as InvoiceKit).

## Structure

```
apps/
  web/        Next.js 16 static export (calculators + product pages + Pro)     @finealth/web
  api/        Cloudflare Worker (Hono): Razorpay/Play licence checks, serves web @finealth/api
  mobile/     Capacitor Android/iOS shell (Expo port planned, RSK-002)          @finealth/mobile
packages/
  finance-core/  all formulas, health score, planners, plan limits, licence tokens
  shared-types/  API and token types
tests/        automation (Robot Framework: one test per case, web + Android screens + API), web (Playwright), mobile/native (Appium), cases (xlsx), bugs, load, tools
docs/         HLD, LLD, USER_MANUAL (.md + .docx), test-cases, product brief, risks, standards
scripts/      test-cases.mjs, docs-export.mjs, gen-licence-keys.mjs, make-test-licence.mjs
```

## Commands

```bash
npm install            # one install for every workspace
npm run dev:web        # http://localhost:3000
npm run check          # lint + typecheck + unit tests + build, all workspaces
npm run test:web       # Playwright (builds and serves the static exports)
npm run cases          # regenerate docs/test-cases.md and tests/cases/test-cases.xlsx
npm run docs           # regenerate HLD/LLD/USER_MANUAL .docx (needs Chrome for diagrams)
npm run dev:api        # wrangler dev for the licence Worker
```

Pro end-to-end locally: `eval "$(npm run -s licence:test)"`, build the web app with `NEXT_PUBLIC_LICENCE_PUBLIC_KEY=$PRO_TEST_PUBLIC_KEY`, then run `PRO_TEST_TOKEN=$PRO_TEST_TOKEN npm run test:web -- --project=web`.

Standing rules for contributors and Claude: `CLAUDE.md`. Progress and open founder actions: `PROGRESS.md`.
