# Product Brief — Finealth

## 1. Product idea
A private money check-up: a financial health score out of 100 in two minutes, then a plan for debts, goals and retirement. No login, no bank link, nothing leaves the device. Free with ads; Pro for the full plan and no ads.

## 1b. Category
**Finance** (`docs/standards/product-categories.md` §1). Red lines respected: no lending, no money movement, no personalised investment advice or product recommendations.

## 2. Problem & target users (18+; children: no)
Salaried adults (25-45) in India first, then US/UK/EU, who earn steadily but do not know whether they are "on track": carrying card debt, unsure how much to save for a house or a child's education, worried about retirement. Existing apps either need a bank login (privacy worry, and limited in India) or are single calculators that give a number but no plan.

## 3. Screens
Home (`/`: hero with a live example score, planners, markets, quick calculators, Free vs Pro, questions), All tools (`/tools/` and one page per tool), SIP, EMI and compound interest calculators, Health Check, Debt Payoff Planner, Goal Planner, Retirement Planner, Loan Prepayment, My Plan, Pricing, Restore Pro, About, Privacy, Terms, Refunds, Contact.

## 4. Functional requirements
Every REQ has test cases in `tests/cases/test-cases.xlsx` (sheet Test Cases; readable copy `docs/test-cases.md`) and a Robot Framework test per case in `tests/automation/`.

| REQ | Requirement |
|---|---|
| REQ-001 | Health check score |
| REQ-002 | Health action plan |
| REQ-003 | Debt payoff planner |
| REQ-004 | Debt what-if and schedule (Pro) |
| REQ-005 | Goal planner |
| REQ-006 | Retirement projection |
| REQ-007 | Retirement odds (Pro) |
| REQ-008 | Loan prepayment |
| REQ-009 | Local storage, backup and restore |
| REQ-010 | Progress snapshots (Pro) |
| REQ-011 | Pricing and checkout |
| REQ-012 | Restore Pro and licence token |
| REQ-013 | Ads gating |
| REQ-014 | Disclaimer and legal pages |
| REQ-015 | Calculators (SIP, EMI, tax, GST…) |
| REQ-016 | CSV export |
| REQ-017 | SEO |
| REQ-018 | Licence API |
| REQ-019 | Global tools library (/tools) |
| REQ-020 | Country tax engines (AU, CA, SG, NZ, US joint, India detail) |
| REQ-021 | Payment acknowledgement and strengthened disclaimers |
| REQ-022 | Gap-free tool layouts with key figures in the heading |
| REQ-023 | Warm Editorial look: light and dark modes, floating glass nav, bento planners, calm motion |
| REQ-024 | One header and footer on every page, skip link, compact phone home, stable planner layout, honest market labels |
| REQ-025 | Home page, a landing page only (no calculator inputs): hero with a live score card, planners, how it works, popular calculators, a quick calculators card, Free vs Pro, privacy promise, questions and a final call to action |
| REQ-026 | Quick calculators page (/quick-calculators/): honest market reference values with their history and the quick calculators for the visitor's country (moved off the home page, founder request 11 Nov 2026) |

## 4b. Non-functional requirements
Every NFR has a measurable threshold and at least one non-functional test case.

| NFR | Area | Requirement | Threshold |
|---|---|---|---|
| NFR-001 | Accuracy | Golden formula cases match independent calculations | 100 % match |
| NFR-002 | Performance | Monte Carlo 1,000 runs × 80 years | < 100 ms on a mid-range phone |
| NFR-003 | Performance | Tool pages Lighthouse performance (mobile) | ≥ 90 |
| NFR-004 | Privacy | No financial input leaves the device | 0 requests carrying form values |
| NFR-005 | Privacy | Pro users load no ad script | 0 ad scripts |
| NFR-006 | Security | Pro token cannot be forged or tampered | Tampered token → free |
| NFR-007 | Security | No secrets in repo or bundle | 0 findings |
| NFR-008 | Reliability | Static pages work when the API is down | All tools usable |
| NFR-009 | Accessibility | WCAG 2.2 AA on key pages, light and dark modes | 0 serious/critical axe issues (glass gradients flattened so contrast is measured) |
| NFR-010 | Compliance | Disclaimer on every result screen | Visible on 5/5 tools |
| NFR-011 | Compatibility | Layout at 360 px width | No horizontal scroll |
| NFR-012 | Load | Licence API under load | p95 < 300 ms, errors < 1 % at 20 rps |
| NFR-013 | Performance | Layout stability on the debt planner and home pages (phone 412 px) | CLS < 0.1 |
| NFR-015 | Compliance | Statutory rates carry a last-checked date no older than 12 months | Date shown on every tax tool; yearly re-check issue |
| NFR-014 | — | **Retired** (number not used) | — |

## 5. Data entities & storage
`HealthInput`, `Debt[]`, `Goal[]`, `RetirementInput`, `Snapshot[]` in browser `localStorage` (`finealth.v1.*`); Pro licence record `finealth.pro.v1`. Nothing on the server.

## 6. Login required? Backend needed?
No login. A stateless Worker only to verify purchases and sign Pro tokens (same protocol as InvoiceKit).

## 7. Region & languages
India (INR) first; USD, GBP, EUR supported in every tool. English.

## 8. Primary keywords and intent
financial health check, financial health score, debt payoff planner, snowball vs avalanche calculator, goal planner calculator, retirement calculator india, monte carlo retirement calculator, loan prepayment calculator (reduce EMI or tenure), SIP calculator, EMI calculator. Intent: informational/transactional tools.

## 9. Brand
Finealth identity (v10 "Warm Editorial", founder choice 10 Nov 2026): light "Paper" `#f5f1ea` and dark "Espresso" `#14110e` modes (device setting, with a switch); terracotta = act, sage = gain, clay = loss, ochre = Pro; Fraunces serif headings with an italic terracotta accent, Inter body; the score ring and health-score number stay the hero visual. The Android shell still uses the old dark look until it is ported (RSK-011).

## 10. Policy risk check
AdSense: finance tools allowed; ads kept outside results. Play: no financial-services declaration needed for calculators and planners (re-check at submission). No personalised advice.

## 11. Assumptions
| # | Assumption | Why |
|---|---|---|
| A1 | "Our repo template" = Equisteg template v4 as used by InvoiceKit | Newest, most complete company repo |
| A2 | Same Pro prices as InvoiceKit | Shared payment code and Razorpay setup |
| A3 | Keep Capacitor mobile for this release | Avoid breaking the existing Android app; Expo port next |
| A4 | Keep app id `com.tezech.finealth` | It may already be on Play |

## 12. Market research summary (Nov 2026)
See `docs/competitor-analysis.md`.
