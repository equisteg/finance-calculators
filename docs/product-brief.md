# Product Brief — Finealth

## 1. Product idea
A private money check-up: a financial health score out of 100 in two minutes, then a plan for debts, goals and retirement. No login, no bank link, nothing leaves the device. Free with ads; Pro for the full plan and no ads.

## 1b. Category
**Finance** (`docs/standards/product-categories.md` §1). Red lines respected: no lending, no money movement, no personalised investment advice or product recommendations.

## 2. Problem & target users (18+; children: no)
Salaried adults (25-45) in India first, then US/UK/EU, who earn steadily but do not know whether they are "on track": carrying card debt, unsure how much to save for a house or a child's education, worried about retirement. Existing apps either need a bank login (privacy worry, and limited in India) or are single calculators that give a number but no plan.

## 3. Screens
Calculators dashboard (`/`), Health Check, Debt Payoff Planner, Goal Planner, Retirement Planner, Loan Prepayment, My Plan, Pricing, Restore Pro, About, Privacy, Terms, Refunds, Contact.

## 4. Functional requirements
REQ-001…REQ-018, listed with test cases in `docs/test-cases.md`.

## 4b. Non-functional requirements
NFR-001…NFR-013 and NFR-015 in `docs/test-cases.md`, NFR-014 unused (accuracy 100 % on golden cases, Monte Carlo < 100 ms, Lighthouse ≥ 90, layout shift (CLS) < 0.1, no financial data off-device, no ad script for Pro, WCAG 2.2 AA, disclaimer on every result).

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
