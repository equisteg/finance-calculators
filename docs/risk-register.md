# Risk register

| ID | Risk / deviation | How we tackle it | Done | Automatic response | Residual | Owner |
|---|---|---|---|---|---|---|
| RSK-001 | Pro gating is client-side | Accept (founder): features are local maths; tokens signed, ≤ 7 days | Signed tokens, tamper test TC-044 | Refund → token stops refreshing | UI unlock on attacker's own device | Founder |
| RSK-002 | Mobile is Capacitor, template requires Expo | Reduce: port to Expo in next PR reusing finance-core | Mobile uses shared engine | — | Play Billing not in app yet | Build |
| RSK-003 | Guidance read as investment advice | Eliminate product names; rules of thumb with sources; disclaimer on every result | Done in all tools (NFR-010) | — | Low | Build |
| RSK-004 | Overlap with PayCheckly | Reduce: lead with health score and plans | Positioning in brief | — | Low | Founder |
| RSK-005 | Rates and rules of thumb change yearly | Detect: dates in code, yearly re-check issue | Dates recorded | — | Low | Build |
| RSK-006 | Legal pages not reviewed by a lawyer | NEEDS HUMAN review before live payments | Drafted | — | Medium | Founder |
| RSK-007 | Activation counter is best effort | Accept as InvoiceKit RSK-104 | — | — | Two parallel activations can pass | Founder |
| RSK-008 | Android upload keystore and its passwords were committed in git history (old `android/` and `apps/mobile/android/`) | Eliminate: rotate the upload key (Play Console → App integrity → Request upload key reset) and keep the new .jks outside git | Done in this PR: .jks untracked, `*.jks` and `keystore.properties` ignored, gradle reads `FINEALTH_KEYSTORE*` env vars, `check:secrets` blocks new keystores | — | Old key usable by anyone with repo access until reset (NEEDS HUMAN) | Founder |
| RSK-009 | minimatch 3.x and 5.x (GHSA-g3hv-75wg-m249, medium) in dev-only tools: ESLint plugins and exceljs | Accept (founder, 3 Nov 2026) until upstream moves to minimatch 11; ignore in `osv-scanner.toml` ends 3 Feb 2027 | Every other OSV finding fixed in this PR (Next.js 16.4.4, Vitest 4, sharp 0.35, uuid/glob overrides) | OSV-Scanner fails CI again on 3 Feb 2027 if still present; Dependabot proposes updates monthly | Tools run only on dev machines and CI with repo-owned patterns; nothing shipped | Build |
