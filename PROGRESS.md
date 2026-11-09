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
| 7 Testing | ✅ | 94 cases + 13 NFRs (`tests/cases/test-cases.xlsx`), unit + E2E automation |
| 8 Performance | ⏳ | Lighthouse/k6 configs copied; routes to tune |
| 9 Release | ⏳ | `docs/USER_MANUAL.md`; Play listing pending |

## NEEDS HUMAN
1. Create `development`, `staging`, `production` branches and make `development` the default (repo has only `main`).
2. Razorpay: live keys, yearly plans (₹199 / US$7.99), website review (Terms, Privacy, Refund, Contact are live on the site), international payments for USD.
3. Generate the licence key pair (`npm run licence:keys`) and set `LICENCE_SIGNING_KEY` (Worker secret) and `NEXT_PUBLIC_LICENCE_PUBLIC_KEY`.
4. Domain is `finealth.teiqtools.com` (code already uses it). In Cloudflare: Workers & Pages → finealth → Settings → Domains & Routes → Add → Custom domain → `finealth.teiqtools.com` (the teiqtools.com zone must be in the same account). Then add `google.com, pub-1503863859594756, DIRECT, f08c47fec0942fa0` to `https://teiqtools.com/ads.txt` (AdSense checks the root domain) and add `teiqtools.com` under AdSense → Sites.
5. Set `NEXT_PUBLIC_BUSINESS_ADDRESS` and confirm the support email.
6. GST invoicing for web sales (Razorpay is not a merchant of record).
7. Legal review of Privacy, Terms and Refund pages (Terms rewritten 9 Nov 2026 with stronger no-advice, accuracy and liability wording; still needs a lawyer, RSK-006).
9. AdSense: create four display ad units (Ads → By ad unit → Display ads) named finealth-top, finealth-mid, finealth-bottom, finealth-calculator; put their slot ids in `NEXT_PUBLIC_ADSENSE_SLOT_TOP/MID/BOTTOM/CALCULATOR` (GitHub → Settings → Secrets and variables → Actions → Variables) and redeploy. Until then no ads show on the live site. Set `NEXT_PUBLIC_AD_PLACEHOLDERS=1` on dev/staging only.
10. Play Console: set the new prices (monthly ₹29 / US$0.99, yearly ₹199 / US$7.99, lifetime ₹499 / US$19.99) to match `apps/api/src/config/skus.ts`.
8. Yearly: re-check every statutory rate in `packages/finance-core/src/finance.ts` and `world.ts` after each country's budget and update `RATES_LAST_CHECKED` (RSK-005).
