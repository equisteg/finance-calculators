---
title: "Finealth — Low-Level Design"
subtitle: "Modules, formulas, contracts and sequences"
version: "1.0"
date: "2026-11-03"
---

# 1. Workspace structure
```
finance-calculators/
├── apps/
│   ├── web/            @finealth/web     Next.js 16 static export
│   │   └── src/
│   │       ├── app/                 / (calculators), sip/emi/compound routes, robots, sitemap
│   │       ├── app/(product)/       health-check, debt-payoff, goal-planner, retirement-planner,
│   │       │                        loan-prepayment, my-plan, pricing, pro, about, privacy, terms, refund, contact
│   │       ├── components/          ProProvider, PriceCards, ActivatePro, AdLoader, AdSenseBanner, ui.tsx, site/, tools/
│   │       └── lib/                 config, ads, pro, checkout, storage, usePersistent
│   ├── api/            @finealth/api     Cloudflare Worker (Hono)
│   └── mobile/         @finealth/mobile  Capacitor shell (android/, ios/)
├── packages/
│   ├── finance-core/   formulas + licence verify (pure TS, no DOM)
│   └── shared-types/   API and token types
├── tests/              web/ (Playwright), mobile/native (Appium), cases/, bugs/, load/, tools/
├── scripts/            test-cases.mjs, docs-export.mjs, gen-licence-keys.mjs, make-test-licence.mjs
└── docs/               HLD, LLD, USER_MANUAL, test-cases, standards/
```

# 2. Shared types (`@finealth/shared-types`)
| Type | Fields |
|---|---|
| `ProPlan` | `'pro_monthly' \| 'pro_yearly' \| 'pro_lifetime'` |
| `LicenceClaims` | `v: 1`, `plan`, `src: 'razorpay' \| 'play'`, `iat`, `exp` (≤ 7 days), `kh?` (16-byte key hash), `env?` |
| `CheckoutRequest` | `plan: 'pro_yearly' \| 'pro_lifetime'`, `currency: 'INR' \| 'USD'` |
| `LicenceResponse` | `token`, `plan`, `exp`, `licenceKey?` |

# 3. `@finealth/finance-core` contracts
All functions are pure and synchronous. Inputs that are negative, `NaN` or infinite are treated as 0. Money inside loops is integer minor units (paise/cents); results are rounded to whole units (or 2 dp for schedules) only at the end.

| Module | Function | Returns |
|---|---|---|
| `health.ts` | `financialHealth(input, fmt?)` | `{ score 0-100, grade, pillars[6], actions[] (ranked), metrics }` |
| `debt.ts` | `planDebtPayoff(debts, budget, strategy)` | `{ feasible, reason?, months, totalInterest, totalPaid, payoffs[], schedule[] }` |
| `debt.ts` | `compareDebtStrategies(debts, budget)` | minimum / avalanche / snowball plans, `best`, `interestSaved`, `monthsSaved` |
| `goals.ts` | `planGoal(goal)`, `planGoals(goals, budget)` | future cost, savings growth, gap, monthly needed, allocation by priority |
| `retirement.ts` | `projectRetirement(input)` | corpus at retirement, corpus needed, run-out age |
| `retirement.ts` | `retirementOdds(input, runs = 1000, seed)` | success rate, p10/p50/p90 corpus, median run-out age |
| `prepayment.ts` | `comparePrepayment(input)` | EMI, baseline, reduce-tenure and reduce-EMI options, `better` |
| `plan.ts` | `FREE_LIMITS`, `PRO_FEATURES`, `PLAN_PRICES`, `limitFor()` | display-only prices (server prices in `apps/api/src/config/skus.ts`) |
| `csv.ts` | `toCsv(header, rows)` | RFC 4180 text with formula-injection guard |
| `licence.ts` | `verifyLicence`, `signLicence`, `licenceKeyHash` … | Ed25519 token helpers (WebCrypto) |

## 3.1 Health score
Six pillars, each 0-100, weighted sum rounded to a whole number (float noise trimmed first).

| Pillar | Measure | Full marks | Zero | Weight | Source |
|---|---|---|---|---|---|
| Savings rate | (income − spending − loan payments) / income | ≥ 20 % | ≤ 0 % | 20 % | 50/30/20 rule |
| Emergency fund | savings / (spending + loan payments) | ≥ 6 months | 0 | 20 % | CFPB emergency-fund guide (3-6 months) |
| Debt payments | loan payments / income | ≤ 10 % | ≥ 50 % | 20 % | CFPB debt-to-income (36 % / 43 %) |
| Costly debt | card + personal-loan balance / yearly income | 0 | ≥ 50 % | 10 % | — |
| Retirement | investments / yearly income vs age multiple | ≥ target | 0 | 15 % | Fidelity: 1× at 30, 3× at 40, 6× at 50, 8× at 60, 10× at 67 (linear between) |
| Protection | life cover / yearly income (if dependants) and health cover | 10× and yes | none | 15 % | Income-replacement rule (IRDAI consumer education) |

Grades: ≥ 80 Excellent, ≥ 60 Good, ≥ 40 Fair, else Needs attention. Actions are ranked by points recoverable = (100 − pillar score) × weight. Golden case: the example household scores **75 / Good** (`planning.test.ts`).

## 3.2 Debt payoff
Each month, for every open debt: interest = round(balance × APR / 1200) is added; the minimum (or whole balance) is paid; the rest of the budget goes to the first open debt in strategy order and rolls to the next when one is cleared. Avalanche = highest APR first (ties: smaller balance); snowball = smallest balance first; custom = list order; minimum = minimums only, no roll-over. Infeasible when budget < sum of minimums, when month 1 payments do not cover interest, or after 600 months. Golden: ₹1,000 at 12 % paying ₹100 → 11 months, ₹58.98 interest (closed form n = −ln(1 − rB/P)/ln(1 + r) = 10.59).

## 3.3 Goals
future cost = cost × (1 + inflation)^years; savings grow at (1 + r/12)^(12·years); monthly saving = gap / F where F = ((1 + i)^n − 1)/i × (1 + i) (annuity-due, i = r/12, n = 12·years), or a month-by-month sum when stepping up yearly. Rounded **up** so the goal is met. Golden: ₹10 lakh in 10 years at 6 % inflation, 12 % return → future cost ₹17,90,848, ₹7,708 a month.

## 3.4 Retirement
Yearly model. Working years: corpus = (corpus + 12 × monthly saving) × (1 + r). Retired years: corpus −= spending, then × (1 + r_retired); spending grows with inflation. Corpus needed = present value at retirement of the growing spending stream. Monte Carlo: yearly return ~ Normal(mean, volatility) with mulberry32 seeded PRNG and Box-Muller; retired volatility is scaled by r_retired / r; a year cannot lose more than 95 %. With volatility 0 the odds equal the straight-line verdict (test).

## 3.5 Prepayment
EMI = P·r·(1 + r)^n / ((1 + r)^n − 1). Reduce tenure: keep EMI (+ extra monthly) on the reduced balance and amortise until zero. Reduce EMI: new EMI over the same remaining months. Golden: ₹10 lakh, 9 %, 240 months, ₹1 lakh prepaid → EMI ₹8,997.26, new EMI ₹8,097.53, tenure 186 months (54 saved).

# 4. Web modules
| Module | Responsibility |
|---|---|
| `lib/config.ts` | Reads `NEXT_PUBLIC_*` once (inlined at build) |
| `lib/pro.ts` | Stored licence (`finealth.pro.v1`), token verification, background refresh, clock-rollback guard, restore |
| `lib/checkout.ts` | Razorpay Checkout: `/checkout` → Razorpay modal → `/checkout/confirm`; pending-confirm recovery (`finealth.pending.v1`) |
| `lib/storage.ts` | Validated `localStorage` read/write under `finealth.v1.*`, backup export/import, file download |
| `lib/usePersistent.ts` | React state remembered after mount (no hydration mismatch) |
| `components/ProProvider.tsx` | `usePro()`, `useAdsAllowed()`; re-checks on focus and at token expiry |
| `components/AdLoader.tsx` | Injects the AdSense script only for confirmed free users |
| `components/ui.tsx` | `ToolPage` (heading + disclaimer + ad slot), `ProGate`, `NumberField`, `Stat`, `ScoreRing`, `LineChart`, `Bar` |
| `components/tools/*` | One client component per product page |

## 4.1 Free vs Pro gating
| Feature | Free | Pro |
|---|---|---|
| Health check | Score, grade, top action | All actions, six-pillar breakdown, print, snapshots |
| Debt planner | 3 debts, debt-free date, strategy comparison | Unlimited, what-if, chart, schedule, CSV |
| Goal planner | 1 goal | Unlimited, priority order, step-up, CSV |
| Retirement | Straight-line projection | Monte Carlo odds |
| Prepayment, calculators, backup | Yes | Yes |
| Ads | Yes (after consent) | None; script never loaded |

Saved data above the free limit is kept, shown faded and excluded from the maths, and comes back with Pro.

## 4.2 Local storage keys
| Key | Shape | Validator |
|---|---|---|
| `finealth.v1.health` | `HealthInput` | `isHealthInput` |
| `finealth.v1.debts` | `Debt[]` (≤ 50) | `isDebtList` |
| `finealth.v1.goals` | `Goal[]` (≤ 50) | `isGoalList` |
| `finealth.v1.retirement` | `RetirementInput` | `isRetirementInput` |
| `finealth.v1.snapshots` | `Snapshot[]` (≤ 500) | `isSnapshotList` |
| `finealth.pro.v1` | `{ key, plan, token, lastSeen }` | `readStoredPro` |

Backup file: `{ app: 'finealth', version: 1, exportedAt, data: { …keys } }`; import writes only sections that validate.

# 5. Mobile modules
`apps/mobile` is a Next.js static export (`src/app/page.tsx`, splash, tab bar) loaded by Capacitor (`appId com.tezech.finealth`, `webDir out`). It imports formulas from `@finealth/finance-core`. Build: `npm run cap:sync -w @finealth/mobile`, then Gradle. Expo port and Play Billing: next PR (RSK-002).

# 6. APIs & database
No database. API (`apps/api`, details in `apps/api/README.md`):

| Route | Body | Success |
|---|---|---|
| `POST /api/v1/checkout` | `{ plan, currency }` | Razorpay order (lifetime) or subscription (yearly) at the server price |
| `POST /api/v1/checkout/confirm` | Razorpay ids + signature | First Pro token + licence key |
| `POST /api/v1/licence/verify` | `{ key, activate? , token? }` | Fresh 7-day token |
| `POST /api/v1/play/verify` | `{ purchaseToken, productId }` | Token for Play purchases |
| `POST /api/v1/errors` | scrubbed error report | 204 |

Purchases are recognised by Razorpay notes `{ product: 'finealth', plan }`; activations per key are counted in payment notes `fh_activations` (max 5).

# 7. Validation rules
- Numeric inputs: non-finite → 0; negatives → 0 in the engines; ages capped in the UI (0-110), years ≤ 60, months ≤ 480.
- Text: debt/goal names ≤ 60 characters (UI) and ≤ 80 (storage validator).
- Backup import: ≤ 2 MB, must be `app: 'finealth'`, `version: 1`.
- Licence key: `^(pay|sub)_[A-Za-z0-9]{8,40}$`.

# 8. Key sequences
```mermaid
sequenceDiagram
  participant B as Browser
  participant W as Licence Worker
  participant R as Razorpay
  B->>W: POST /checkout {plan, currency}
  W->>R: create order / subscription (server price)
  W-->>B: orderId / subscriptionId, keyId
  B->>R: Razorpay Checkout (card/UPI)
  R-->>B: payment id + signature
  B->>W: POST /checkout/confirm
  W->>R: verify payment + signature
  W-->>B: signed token (7 days) + licence key
  B->>B: verify signature with public key, store, unlock Pro, remove ads
```

```mermaid
sequenceDiagram
  participant B as Browser
  participant W as Licence Worker
  participant R as Razorpay
  B->>B: app start: verify stored token
  alt more than 2 days left
    B->>B: Pro
  else close to expiry
    B->>W: POST /licence/verify {key, token}
    W->>R: payment / subscription status
    alt active
      W-->>B: new token
    else refunded / ended
      W-->>B: 400 refunded / expired → remove licence, free plan
    end
  end
```

# 9. Error handling & logging
Engines never throw for bad numbers; infeasible plans return `feasible: false` with a plain-English `reason` shown in a danger notice. Storage failures (private mode, quota) are swallowed: the session keeps working. The Worker logs one scrubbed line per request (no IP, body, query, or key in clear).

# 10. Accessibility
Every input has a visible label; result values have test ids and text equivalents; the score ring has `role="img"` with an aria-label; toggles use `aria-pressed`; colour is never the only signal (status text accompanies bars); the disclaimer uses normal text size and AA contrast.
