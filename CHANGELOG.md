# Changelog

## Unreleased — 2026-11-09
### Added
- Tools library at `/tools/` with 36 new calculators: India (detailed regime, HRA, gratuity, PPF), US federal (single and married jointly), Australia, Canada (tax and GST/HST/PST), Singapore, New Zealand, world VAT/GST for 67 countries (Pakistan excluded), and universal tools (inflation, real return, CAGR, Rule of 72, simple interest, RD, savings goal, retirement corpus, NPV/IRR, XIRR, card payoff, affordability, true loan cost, flat rate, rent vs buy, 50/30/20, emergency fund, net worth, percentage, discount, tip, margin, break-even, salary).
- Every tool shows its formula source, what it leaves out, the rates-last-checked date and an official calculator link.
- Pricing: an "estimates only, not advice" acknowledgement must be ticked before the buy buttons work.
- 102 engine tests (golden values computed independently) and 7 new E2E tests; test cases 64 → 94.
### Fixed
- India old regime: 80D now has separate caps for self/family (₹25,000, or ₹50,000 if 60+) and parents (same); before, one ₹1,00,000 cap overstated deductions for most people under 60.
- EU VAT list now has all 27 member states (Bulgaria, Croatia, Cyprus, Czechia, Latvia, Lithuania, Malta and Slovenia were missing).
- Rate solver (true loan cost, flat rate, IRR) now handles long loans and 100+ periods; NPV/XIRR read "1,00,000"-style amounts, reject impossible dates and name lines they skip (found in specialist review).
- India old regime now applies senior (60-79) and super-senior (80+) exemptions when the age is given.
### Changed
- Premium glass redesign: new design system (glass cards, gradient buttons, focus glow, Fraunces + Inter), original glassy icon tiles for every area, category and tool, horizontal layouts (inputs beside results from tablet up, two-column inputs on phones, horizontal tool cards, one scrolling nav rail instead of a hamburger menu). An overflow audit at 360/768/1280 px finds no text or icon outside its box.
- Terms rewritten: no-advice and no-regulator-registration statement, accuracy and estimates, no warranty, limitation of liability, indemnity, statutory rights, grievance contact. Refund policy explains how calculation errors are handled. Stronger disclaimer on every result, the calculators page and the footer.
- UK take-home now says Scotland is not covered; India tax note points to the detailed calculator.

## Unreleased — 2026-11-03
### Added
- Financial Health Check (score, grade, ranked actions; full report, print and snapshots with Pro).
- Debt Payoff Planner (snowball / avalanche / custom; what-if, schedule, chart, CSV with Pro).
- Goal Planner (inflation-adjusted, priority funding; unlimited goals and step-up with Pro).
- Retirement Planner (projection; Monte Carlo odds with Pro) and Loan Prepayment Optimiser.
- My Plan: progress snapshots (Pro), backup/restore and delete-my-data.
- Pricing, Restore Pro, About, Privacy, Terms, Refund and Contact pages; robots and sitemap.
- Stateless licence Worker (`apps/api`) with Razorpay checkout and Play verification.
- HLD, LLD, user manual (.md + .docx), test-case catalogue (64 cases, 12 NFRs) and Playwright specs.
### Changed
- Repository restructured to the Equisteg template v4: npm workspaces + Turborepo, shared `packages/finance-core`, one lockfile, `tests/`, `.claude/`, CI.
- Ads load only for confirmed free users; Pro users load no ad script.
### Removed
- Duplicated legacy app at the repository root and the copied `finance.ts` / `format.ts` in each app.
