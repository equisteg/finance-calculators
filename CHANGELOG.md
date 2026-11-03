# Changelog

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
