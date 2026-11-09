# Finealth — progress

| Phase | Status | Output |
|---|---|---|
| 0 Intake | ✅ | `docs/product-brief.md` |
| 1 Competitors | ✅ | `docs/competitor-analysis.md` |
| 2 Brand | ✅ (kept) | Existing Finealth name, dark theme and logo |
| 3 Architecture | ✅ | `docs/HLD.md`, `docs/LLD.md` (+ .docx) |
| 4 Build — web, engine | ✅ | `apps/web`, `packages/finance-core` |
| 4 Build — mobile | ⏳ | Capacitor shell uses the shared engine; Expo port pending (RSK-002) |
| 4b Payments | ✅ code / ⏳ live | `apps/api` (Razorpay + Play verify); live keys NEEDS HUMAN |
| 5 SEO | ✅ basic | metadata, canonical, robots, sitemap, JSON-LD |
| 6 Security | ✅ CI | secret guards, Gitleaks, Semgrep, OSV in `ci.yml` |
| 7 Testing | ✅ | 91 cases + 13 NFRs (`tests/cases/test-cases.xlsx`), unit + E2E automation |
| 8 Performance | ⏳ | Lighthouse/k6 configs copied; routes to tune |
| 9 Release | ⏳ | `docs/USER_MANUAL.md`; Play listing pending |

## NEEDS HUMAN
1. Create `development`, `staging`, `production` branches and make `development` the default (repo has only `main`).
2. Razorpay: live keys, yearly plans (₹399 / US$14.99), website review (Terms, Privacy, Refund, Contact are live on the site), international payments for USD.
3. Generate the licence key pair (`npm run licence:keys`) and set `LICENCE_SIGNING_KEY` (Worker secret) and `NEXT_PUBLIC_LICENCE_PUBLIC_KEY`.
4. Buy the product domain in the company Cloudflare account; set `CANONICAL_HOST` and `NEXT_PUBLIC_SITE_URL`.
5. Set `NEXT_PUBLIC_BUSINESS_ADDRESS` and confirm the support email.
6. GST invoicing for web sales (Razorpay is not a merchant of record).
7. Legal review of Privacy, Terms and Refund pages (Terms rewritten 9 Nov 2026 with stronger no-advice, accuracy and liability wording; still needs a lawyer, RSK-006).
8. Yearly: re-check every statutory rate in `packages/finance-core/src/finance.ts` and `world.ts` after each country's budget and update `RATES_LAST_CHECKED` (RSK-005).
