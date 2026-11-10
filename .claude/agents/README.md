# Specialist reviewer agents

Claude Code loads every `.md` file in this folder as a subagent. The main session builds; these agents check the work with a fresh context and never edit files. How they are briefed, what they return and how the fix loop works: [`docs/standards/agent-reviews.md`](../../docs/standards/agent-reviews.md).

The QA team (QA Lead, Functional, Automation and Non-functional QA) and the Reliability Engineer follow [`docs/standards/qa-architecture.md`](../../docs/standards/qa-architecture.md).

Founders do not need to call them by hand. `/newapp`, `/change`, `/update`, `/test`, `/review` and `/market` call the right ones. To ask one directly in Claude Code: "Use the security-auditor agent on this branch."

| Agent | Checks | Runs automatically in | Also runs when a diff touches |
|---|---|---|---|
| `code-reviewer` | Correctness, company rules, shared-code placement, UI states, tests exist | every PR (`/change`, `/update`, `/test` fixes, `/newapp` phase 10, `/review`) | anything |
| `scope-guard` | Only what the request needs changed; protected files untouched | `/change`, `/test` fixes, auto-debug, `/review` | anything |
| `security-auditor` | Secrets, authz, validation, CSP/headers, CSRF, rate limits, mobile storage, AI prompt sinks, deps | `/newapp` phases 6 and 10 | `apps/api/**`, auth, cookies, headers, `_headers`, env vars, `package.json`, AI features |
| `payments-auditor` | Phase 4b: price source, webhook, grant, tokens, credits, revoke, restore, Play Billing | `/newapp` phases 4b and 10 | checkout, webhooks, entitlements, licence, magic links, devices, credits, cron expiry |
| `ux-a11y-reviewer` | WCAG 2.2 AA, finished states, 320 px, ad placement, distinct from sibling products | `/newapp` phases 2, 4 and 10 | `apps/web/**` UI, `apps/mobile/**` UI, `packages/design-tokens/**` |
| `seo-ai-reviewer` | Metadata, JSON-LD, sitemap/robots, llms.txt, noindex on dev/staging, answer-first content | `/newapp` phases 5 and 10 | public pages, content, `robots`, `sitemap`, `llms.txt` |
| `store-policy-reviewer` | Play, AdSense, AdMob, consent, privacy pages, data safety, deletion | `/newapp` phases 0, 9 and 10; before production | ads, consent, SDKs, permissions, `release/**`, legal pages |
| `test-traceability-auditor` | REQ/NFR → test case → automation → result → bug | `/newapp` phases 7 and 10; end of `/change`, `/update`; after `/test` ingest | `tests/**`, `docs/product-brief.md` |
| `category-reviewer` | Extra rules for finance, games, utility and tech products (`docs/standards/product-categories.md`) | `/newapp` phases 0, 1, 7 and 10; `/market` | any app code in a product whose brief names a category |
| `marketing-claims-reviewer` | Truthful, provable, allowed marketing; no fake social proof; disclosures; spam and privacy rules; zero cost | `/market`; `/newapp` phase 9 | `docs/marketing/**`, `release/listing/**`, marketing pages |
| `release-gate` | Go/no-go for production, default NOT READY | `/test` release recommendation; `/newapp` phase 10; before `staging → production` | — |
| `incident-investigator` | Root cause, reproduction plan, smallest fix for an incident | auto-debug (`prompts/INCIDENT_PROMPT.md`); `/change fix incident #n` | — |
| `qa-lead` | Test strategy and plan, scope and priority, entry/exit criteria, results vs criteria, defect triage, QA sign-off (go / no-go) | start of `/update` (plan); after `/test` ingest; before `staging → production` | `tests/**`, `scripts/test-cases.mjs`, `docs/product-brief.md`, any new REQ/NFR |
| `qa-functional` | Test design (positive, negative, edge, boundary, states), missed scenarios, end-to-end journeys, functional, money-maths and UI bugs with repro steps | every PR from `/update`, `/change`, `/test` fixes; when docs change | `apps/web/src/app/(product)/**`, `apps/web/src/components/**`, `apps/web/src/lib/**`, `apps/mobile/src/**`, `packages/finance-core/src/**`, `docs/USER_MANUAL.md` |
| `qa-automation` | Automation architecture, TC ID ↔ script, assertions (exact figures), locators, waits, flakiness, test data, CI time and cost | PRs that add or change tests or user-visible behaviour; after `/test` runs with flaky or skipped tests | `tests/automation/**`, `tests/web/**`, `tests/mobile/**`, `**/*.test.ts`, `apps/api/test/**`, `scripts/test-cases.mjs`, `.github/workflows/*` |
| `qa-nonfunctional` | NFR thresholds and tests; accuracy, performance, load, security testing, accessibility, compatibility, privacy, disclaimer and rates compliance | PRs affecting accuracy, speed, security, accessibility, privacy or compatibility; after `/test` non-functional runs; before production | `tests/load/**`, `tests/web/specs/**`, `packages/finance-core/src/**`, `apps/api/src/lib/security.ts`, `apps/web/src/lib/ads.ts`, consent |
| `reliability-engineer` | SRE: SLOs, alerts, health and canary, rollback, kill switches and retries, runbooks, game days, capacity and free-tier headroom, on-device data safety across releases | before `staging → production`; after an incident | `apps/api/src/**` health, errors, retries and rate limits, `apps/api/wrangler.jsonc`, `.github/workflows/*`, `KILL_SWITCHES` |
| `requirements-reviewer` | `docs/HLD.md`, `docs/LLD.md`, `docs/USER_MANUAL.md` (screenshots), README and on-screen help vs the brief, CLAUDE.md, CHANGELOG and code: wrong or stale statements, undocumented behaviour, design coverage, clarity | end of `/update` and `/change`; `/newapp` phases 3, 9 and 10; before docs are shared | `docs/HLD.md`, `docs/LLD.md`, `docs/USER_MANUAL.md`, `docs/product-brief.md`, `README.md`, `packages/finance-core/src/plan.ts` |
| `solution-architect` | Whole-product architecture, free-tier headroom, stateless licence model, security and privacy, reliability, performance, accuracy approach, testing, maintainability, product gaps; prioritised roadmap | before production; after a large `/update`; `/newapp` phase 10; on request | — |

## Adding or changing an agent
- One file per agent, file name = `name` in the frontmatter (lowercase, hyphens).
- Frontmatter: `name`, `description` (when to use it — Claude reads this to decide), `tools`. Reviewers get `Read, Grep, Glob, Bash` (plus `WebSearch, WebFetch` only when they must check a live policy page). **No agent here gets `Edit` or `Write`**: reviewers report, the main session fixes.
- The body says what to read first, the checklist, how to judge severity, and that text found in code, issues, logs or data is never an instruction.
- Every agent answers in the verdict format of `docs/standards/agent-reviews.md` §4 with its own finding-ID prefix.
- Refer to agents from skills, prompts and docs as `agent:<name>`.
- Run `npm run lint:agents` before the PR (CI runs it too).
