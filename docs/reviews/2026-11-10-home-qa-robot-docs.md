# Specialist review — home page, ClearFile test format, Robot automation, HLD/LLD/manual (10 Nov 2026)

Branch `claude/project-thread-ptb1eg` → `development`. Rules: `docs/standards/agent-reviews.md`. Two rounds.

| Reviewer | Round 1 | Round 2 | Open S1–S3 |
|---|---|---|---|
| code-reviewer | PASS WITH NOTES (1 S3: VAT 67 on the hero; 5 S4) | PASS WITH NOTES (3 S4) | none |
| scope-guard | PASS WITH NOTES (3 S4) | — (no new scope) | none |
| ux-a11y-reviewer | Home page PASS WITH NOTES; older S1 ad consent (RSK-017), S2 Android inputs unnamed, S3 touch targets, ad placement, Android look | fixes verified by code-reviewer round 2 | RSK-017 (NEEDS HUMAN), Android look → RSK-011 |
| qa-lead | NO-GO until full run, bug log, check | **GO for development**, NO-GO for production | BUG-0001 (S3, CSP) → RSK-015 |
| qa-automation | PASS WITH NOTES (5 S3: host check, no CI run, always-skip cases, sleeps, click retries) | fixes verified by code-reviewer round 2 | staging workflow → RSK-021 |
| reliability-engineer | PASS WITH NOTES (S2 no monitor/rollback, 3 S3 test gaps) | tests fixed (REL-003…007) | RSK-019 launch gate, RSK-022 accept pending founder |
| requirements-reviewer | PASS WITH NOTES (7 S3 doc corrections) | corrections applied | www redirect → RSK-020 |

Accepted S4 notes, not fixed here: "36 calculators" is written out in the meta description and price card (correct today; the
hero counts it); ScoreRing uses `role="img"` on a `<figure>` (axe minor); planner cards read the pill before the title;
`export_cases.py --check` rewrites `docs/test-cases.md` by design (`npm run cases` regenerates it); REL-007 simulates the 503 in
the page rather than through a real proxy.
