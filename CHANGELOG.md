# Changelog

## Unreleased — 2026-11-09
### Added
- Production domain is now `finealth.teiqtools.com`, a subdomain of TEIQTools.com (founder decision): canonical URLs, sitemap, robots and the Worker's host redirect use it (RSK-010). The footer links to TEIQTools.com.
- Home page: popular calculators and a three-step "How it works" section.
- New home page: a premium hero (headline, two clear actions, trust chips) beside a live example score card from the real engine, five planner cards, and the same nav rail as the rest of the site.
- Two-tone glass icons with depth lighting, and new, more accurate icons: prepayment (calendar with fast-forward), tax (receipt with %), bank (RD), piggy bank (PPF), stamp duty, 50/30/20 (pie), Rule of 72 (hourglass), inflation, price tag (discount, margin, sales tax).
- No empty cells: the tools library, pricing comparison, calculator results (money multiplied, payments) and bullion charts (value labels, growth since the first year) fill every row; the Lifetime card lists what it includes.
- Aggressive pricing after a market check (Indian money apps ₹149 a month or ₹499 a year; global budgeting apps US$95-110 a year): Pro yearly ₹199 / US$7.99, Lifetime ₹499 / US$19.99, Monthly ₹29 / US$0.99 on Android.
- Gap-free tool layouts: every tool heading shows its 2-3 key figures; input and result rows fill edge to edge (the last item stretches); the health score and top priority sit side by side at equal height, with savings rate, emergency months, loan-to-pay and a score scale.
- Ad placeholders: dev and staging builds (`NEXT_PUBLIC_AD_PLACEHOLDERS=1`) show a labelled "Advertisement" box wherever an AdSense slot id is still unset; production shows nothing until the slot ids exist. Pro users still load no ads.
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
- Layout: every tool now runs top to bottom (your numbers first, then the result, then the notes), and inside each section the fields, debts, goals and result tiles run across in horizontal rows. SIP, EMI and compound pages put the sliders in one row and the figure, chart and breakdown in another.
- Design polish after review: each debt is now its own card (no more clipped numbers or labels split mid-word), result figures shrink to fit instead of breaking mid-number, ₹/$ and % signs inside inputs, input boxes line up across a row, a solid answer bar stays in view on phones, and the SIP, EMI and compound interest pages now use the glass design inside the site menu. A stricter fit check (7 widths) finds no cramped input or broken figure.
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
