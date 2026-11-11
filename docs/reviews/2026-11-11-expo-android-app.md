# Review — Expo Android app (branch claude/project-thread-z2obyl)

Reviewers (fresh context, read-only), three rounds at most (`docs/standards/agent-reviews.md`).

| Reviewer | Round 1 | Final | Rounds | Open S1–S3 |
|---|---|---|---|---|
| scope-guard | PASS (S4 SCP-1 dead re-exports, fixed) | PASS | 1 | none |
| security-auditor | NEEDS WORK (SEC-1, SEC-2 S3) | PASS | 2 | none |
| payments-auditor | NEEDS WORK (PAY-1, PAY-2, PAY-10 S2; PAY-3..5 S3) | PASS | 2 | none |
| code-reviewer | NEEDS WORK (REV-1, REV-2 S2; REV-3..10 S3) | PASS | 3 | none |

Fixed: SEC-1 (backup range checks, loop caps), SEC-2/PAY-2/REV-2 (production build guard, Buy hidden without key),
PAY-1/3 (quiet Play sync at start and resume), PAY-4/REV-7 (restore message), PAY-5 (base-plan offer), PAY-6 (dev API, strict env),
PAY-10 (purchase tests), REV-1 (free backup), REV-3/4 (number fields), REV-5 (serialised Pro operations), REV-6 (pending),
REV-8 (prices on buy), REV-9 (unverifiable answer), REV-11 (changelog), REV-12 (unused dependency), REV-14 (Play wording),
REV-16 (15 s request timeout), REV-17 (no Remove for Play), REV-18, REV-19, SEC-4 (https in production).

Accepted / logged: SEC-3, PAY-9 → RSK-026; PAY-7, PAY-8 → RSK-001; REV-10 → RSK-027 (NEEDS HUMAN).
Open S4, not blocking: REV-13 (locked debts stay editable), REV-20 (timeout does not cover the body read),
PAY-11 (superseded by REV-17), PAY-12 (clock more than 7 days fast shows the "could not verify" text),
PAY-13 (start-up sync ordering), a −100 % return shows Infinity in "corpus needed".
