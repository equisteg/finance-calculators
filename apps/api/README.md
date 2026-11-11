# Finealth API (`apps/api`)

One Cloudflare Worker (`finealth`) serves the static web app (`apps/web/out`, via Workers Static Assets) and the API under `/api/*`. Static pages never run Worker code, so they stay free and keep working if the API is down.

## Why there is no database

Founder decision: **no accounts, no database, no stored user data.** The store is the only record of a purchase:

- Web Pro → **Razorpay** (payment gateway; Equisteg is the seller and issues GST invoices). The licence key is the Razorpay payment id `pay_…` (lifetime) or subscription id `sub_…` (yearly).
- Android Pro → **Google Play Billing** (purchase token).

The Worker is stateless. It asks the store "is this purchase valid right now?" and, if so, returns a **short-lived Ed25519-signed token** (`packages/finance-core/src/licence.ts`: at most 7 days, and never past a known subscription end). Clients check the token offline with the public key and refresh it in the background, so a refund, chargeback or cancellation takes effect within a week at most. There is no D1, KV, R2 or cron. Rate-limit counters are Cloudflare's own and hold no personal data.

Trust rules kept from the company template: the browser and app are untrusted, only a server-confirmed store purchase grants Pro, tokens are short-lived, checkout and verify endpoints are rate limited, prices come only from the server, and a bad key always gets the same answer (no enumeration).

## Routes

Every error looks like `{ "error": { "code": "...", "message": "..." } }`. Every response has `Cache-Control: no-store`, security headers and `x-request-id`.

| Route | Body | Success | Errors |
|---|---|---|---|
| `GET /api/v1/health` | – | `200 { ok: true, release, env, checks: { signingKey: "ok" \| "missing", razorpay: "ok" \| "missing" } }` (razorpay = key id + secret present and the right mode; no network call) | – |
| `POST /api/v1/checkout` | `{ plan: "pro_yearly" \| "pro_lifetime", currency: "INR" \| "USD" }` | `200 { provider: "razorpay", keyId, plan, currency, amount, orderId? (lifetime), subscriptionId? (yearly), name: "Finealth", description }` | `400 invalid_request`, `429 rate_limited`, `503 unavailable` (keys/signing key missing, wrong key mode, Razorpay down; USD yearly without a USD plan: "International payments are not enabled yet."; `KILL_SWITCHES` contains `checkout`: "Buying Pro is paused for a short while.") |
| `POST /api/v1/checkout/confirm` | `{ razorpay_payment_id, razorpay_signature, razorpay_order_id? , razorpay_subscription_id? }` (exactly one of the two ids) | `200 { token, key, plan }` — `key` = `pay_…` (lifetime) or `sub_…` (yearly) | `400 invalid_payment` ("We could not confirm this payment."), `400 invalid_request`, `400 invalid_key`, `403 refunded`, `403 expired`, `403 too_many_activations`, `409 pending`, `429`, `503` |
| `POST /api/v1/licence/verify` | `{ key: "pay_…" \| "sub_…", activate?: boolean, token?: string }` (`plan` is ignored). Refresh = no `activate`, with the browser's last `token` | `200 { token }` (src `razorpay`, claims `kh` + `env`); `200 { token, key }` when a subscription charge's `pay_…` resolved to its `sub_…` | `400 invalid_key` (same message for malformed and unknown keys), `400 invalid_request`, `403 refunded`, `403 expired`, `403 too_many_activations` (activation, or a refresh without a valid proof), `409 pending`, `429 rate_limited`, `503 unavailable` |
| `POST /api/v1/play/verify` | `{ purchaseToken: string, productId: "pro" \| "pro_lifetime", kind: "subscription" \| "product" }` | `200 { token }` (src `play`; plan `pro_monthly` / `pro_yearly` from the base plan, or `pro_lifetime`) | `400 invalid_key`, `400 invalid_request`, `403 refunded`, `403 expired`, `409 pending`, `429`, `503 unavailable` |
| `POST /api/v1/errors` | `{ platform: "web" \| "android" \| "ios", message, stack?, release?, route? }` (`url` still accepted for old clients; only the path is kept, query and fragment dropped), at most 4 KB | `204` | `400`, `413`, `429` |
| anything else under `/api` | – | – | `404 not_found` |

Shared rules: POST bodies must be `application/json` (otherwise `415`). A foreign `Origin` gets `403 forbidden_origin`. Bodies over 16 KB get `413` (4 KB on `/errors`). Allowed origins are same-origin, `https://CANONICAL_HOST`, `ALLOWED_ORIGINS` (comma-separated), `finealth://app`, and localhost outside production. Limits: `RL_STRICT` allows 5 requests per minute per IP on the two verify routes, `/checkout` and `/checkout/confirm`, and `RL_API` allows 120 per minute elsewhere. Without the bindings (local tests) an in-memory window applies. In production, `/api/*` on any other host gets a 301 to `CANONICAL_HOST`.

How the store answers are read:

- **Razorpay** (`src/lib/razorpay.ts`, fetch only, HTTP Basic `RAZORPAY_KEY_ID:RAZORPAY_KEY_SECRET`, 8 s timeout; GETs retry once on a network error or 5xx, creates are sent once). Checked against razorpay.com/docs (Oct 2026).
  - **Checkout:** lifetime → `POST /v1/orders { amount, currency, receipt: "fh-<random>", notes: { product: "finealth", plan: "pro_lifetime" } }` with the price from `src/config/skus.ts` (₹499 = 99900 paise, US$29 = 2900 cents); yearly → `POST /v1/subscriptions { plan_id: RAZORPAY_PLAN_ID_YEARLY_INR|USD, total_count: 10, customer_notify: true, notes }`. The browser never sends a price.
  - **Confirm:** signature = hex `HMAC_SHA256(order_id + "|" + payment_id)` (order) or `HMAC_SHA256(payment_id + "|" + subscription_id)` (subscription) with the key secret, compared in constant time (`crypto.subtle.verify`). Then the same checks as verify, plus the payment's `order_id` must be the signed order. Counts as activation #1 once per payment (`notes.fh_confirmed`; a retried confirm does not count again). A lifetime payment still `authorized` that matches its Finealth order is captured (`POST /v1/payments/:id/capture { amount, currency }`); a failed capture → `409 pending`.
  - **Verify `pay_…`:** `GET /v1/payments/:id`. A payment with `invoice_id` is a subscription charge → `GET /v1/invoices/:id` → `subscription_id` → answered as that `sub_…`. Otherwise it must have an `order_id` and **its order** (`GET /v1/orders/:order_id`) must carry `notes.product = "finealth"`, `notes.plan = "pro_lifetime"`, the same `amount` and `currency` as the payment and status `paid`/`attempted`; otherwise `invalid_key`. Payment notes are never trusted for product/plan, and today's SKU price is not compared (older prices stay valid). Any refund (`status refunded`, `amount_refunded > 0`, `refund_status` set) → `refunded`. Disputes are not checked (no per-payment dispute API; RSK-119). `authorized` → `409 pending`; not `captured` → `invalid_key`. `exp = now + 7 d`.
  - **Verify `sub_…`:** `GET /v1/subscriptions/:id`. Must have `notes.product = "finealth"` and a yearly `plan_id` from `RAZORPAY_PLAN_ID_YEARLY_INR|USD` or `RAZORPAY_PLAN_IDS_YEARLY_LEGACY`. `active` or `pending` (renewal retrying) → `exp = min(now + 7 d, current_end + 3 d)`; `created`/`authenticated` → `409 pending`; `cancelled` with `ended_at` ≤ now (immediate cancel) → `expired`, else Pro until `current_end`; `halted`, `completed`, `expired`, `paused` or cancelled in the past → `expired`. Then the latest paid charge (`GET /v1/invoices?subscription_id=` → `GET /v1/payments/:id`) is checked for refunds → `refunded`; unreadable → `503`.
  - **Refresh proof:** a call without `activate: true` is free only when `token` is a token we signed (expiry ignored) with `iat` ≤ 30 days ago, `src razorpay`, `kh` = first 16 bytes of SHA-256(key) base64url, and `env` = `ENVIRONMENT`; anything else counts as an activation.
  - **Errors:** Razorpay 400/404 on a fetch by id → `invalid_key` (same message as a malformed key). Any other 4xx (401, 429…), 5xx or network error → `503 unavailable`, upstream status logged.
  - **Activation limit (stateless):** on confirm (once per payment), `activate: true`, and refreshes without a valid proof. The counter is `notes.fh_activations` on a payment: at `MAX_ACTIVATIONS` (default 5) → `403 too_many_activations` ("This licence key has been activated on too many browsers. Contact support to reset it."); otherwise `PATCH /v1/payments/:id { notes: { …existing, fh_activations: n + 1 } }`. Razorpay cannot update subscription notes, so a `sub_…` key counts on the subscription's first paid payment (from `GET /v1/invoices?subscription_id=…`; on confirm, the signed payment). If that cannot be read the limit is skipped and logged; a failed PATCH is logged and still grants Pro. Proven refreshes never read or write the counter; the read-modify-write is best effort (two simultaneous activations can both pass, RSK-104). Support resets it by editing the payment notes in the dashboard.
  - **Key mode:** production accepts only `rzp_live_…`, dev/staging only `rzp_test_…`; otherwise every Razorpay route answers 503 and logs `key_mode_mismatch`.
- **Google Play**: the service-account JWT (RS256) is exchanged for an OAuth token with scope `androidpublisher`, cached in memory. Subscriptions use `GET …/applications/{pkg}/purchases/subscriptionsv2/tokens/{token}`. They count as active when the state is `ACTIVE`, `IN_GRACE_PERIOD`, or `CANCELED` with `expiryTime` still in the future, and `exp = min(now + 7 d, expiryTime)`. Products use `GET …/purchases/products/{productId}/tokens/{token}`. `purchaseState` 0 grants `pro_lifetime`. 1, or `refundableQuantity` 0, means `refunded`. 2 means `pending`. A 410 response means `expired`, and a 400/404 means `invalid_key`. A 401/403 from Google, or a missing service account, means `503`.

## Setup (click by click)

1. **Signing keys**: from the repo root run `node scripts/gen-licence-keys.mjs`.
   - It writes the private key to `apps/api/.licence-signing-key.secret` (git-ignored) and prints the public key.
   - Run `cd apps/api && npx wrangler secret put LICENCE_SIGNING_KEY --env production < .licence-signing-key.secret`. Repeat with `--env staging` and `--env dev`, or use separate keys per environment.
   - Delete the `.secret` file afterwards.
   - Put the printed public key in the GitHub variable `LICENCE_PUBLIC_KEY`. Web and mobile read it as `NEXT_PUBLIC_LICENCE_PUBLIC_KEY` / `EXPO_PUBLIC_LICENCE_PUBLIC_KEY`.
2. **Razorpay** (click by click: `docs/MIGRATION-cloudflare.md` §7):
   - Dashboard → Test Mode → Account & Settings → API Keys → *Generate Key*. Key Id → GitHub variable `RAZORPAY_KEY_ID_TEST` (deploy passes it as the Worker var `RAZORPAY_KEY_ID`); secret → `npx wrangler secret put RAZORPAY_KEY_SECRET --env dev` and `--env staging`. Live mode: `RAZORPAY_KEY_ID` (`rzp_live_…`) and `--env production`.
   - Account & Settings → Payment capture → *Automatic*.
   - Subscriptions → Plans → *Create Plan*: yearly, every 1, ₹199 INR and US$7.99 USD (USD after international payments are approved). Put the `plan_…` ids in `wrangler.jsonc` as `RAZORPAY_PLAN_ID_YEARLY_INR` / `_USD` per env (test and live plans differ). Lifetime needs no plan.
3. **Google Play**:
   - In Google Cloud Console, go to the project linked to Play → IAM & Admin → Service accounts → **Create service account** (no roles needed).
   - Open it → Keys → **Add key → JSON** and download it.
   - Enable the **Google Play Android Developer API** for that project.
   - In Play Console go to **Users and permissions → Invite new users**, enter the service-account email, and on the app grant **View app information** and **View financial data, orders and cancellation survey responses**. Older consoles call this Setup → API access → link the project → Grant access.
   - Run `npx wrangler secret put GOOGLE_PLAY_SA_KEY --env production` and paste the whole JSON file.
   - Create the subscription `pro` with base plans `monthly` and `yearly`, and the one-time product `pro_lifetime`, matching `PLAY_SUBSCRIPTION_ID` / `PLAY_LIFETIME_PRODUCT_ID`.
   - New service accounts can take up to 24 h before the API accepts them.
4. **Rate-limit namespaces**: the `namespace_id`s in `wrangler.jsonc` (4101/4102, 4201/4202, 4301/4302) must be unique in the Cloudflare account. Change them if another Worker already uses them.
5. **Domain**: set `CANONICAL_HOST` (production) and uncomment the `routes` custom-domain entry once the zone exists.
6. **Local dev**: create `apps/api/.dev.vars` (git-ignored) with `LICENCE_SIGNING_KEY=…`, `RAZORPAY_KEY_ID=rzp_test_…`, `RAZORPAY_KEY_SECRET=…` (test mode) and optionally `GOOGLE_PLAY_SA_KEY=…` (JSON on one line). Then run `npm run dev` from `apps/api`; it needs `apps/web/out` built first.
7. **Deploy**: automatic from GitHub (`.github/workflows/deploy.yml`). A merge into `development` deploys staging and a merge into `production` deploys `finealth`.
   - In GitHub go to repo Settings → Secrets and variables → Actions. Add the secrets `CLOUDFLARE_API_TOKEN` (Cloudflare → My Profile → API Tokens → *Create Token* → template **Edit Cloudflare Workers**) and `CLOUDFLARE_ACCOUNT_ID` (Cloudflare dashboard → Workers & Pages, right-hand side).
   - Add the variables `RELEASE_APPROVERS` (your GitHub login), `STAGING_URL` (`https://finealth-staging.<subdomain>.workers.dev`), `PRODUCTION_URL` (`https://finealth.teiqtools.com`) and `LICENCE_PUBLIC_KEY`. `PRODUCTION_WRANGLER_ENV` stays unset (`prelaunch`) until launch. Optional public variables: `RAZORPAY_ENABLED`, `BUSINESS_ADDRESS`, `PLAY_URL`, `KILL_SWITCHES`, `API_BASE`, `ADSENSE_SLOT_TOP/MID/BOTTOM/CALCULATOR`; copy any that were set in Workers Builds' build variables before disconnecting it.
   - If the Worker is also connected to Git in the Cloudflare dashboard (Workers Builds), disconnect it there (Worker → Settings → Build) so each merge deploys once.
   - By hand: `npx wrangler deploy --env <staging|prelaunch|production> --var RELEASE:$(git rev-parse --short HEAD)`.
8. **Check**: `curl https://<domain>/api/v1/health` should show `"signingKey":"ok"` and `"razorpay":"ok"`.

## What is logged (Workers Logs, 3-day retention)

Nothing else is stored anywhere.

- One line per API request: request id, method, path (no query string), status, duration. **No IP, no body.**
- Checkout, confirm and verify outcomes: route, plan, currency, result (`ok`, `invalid`, `bad_signature`, `refunded`, `expired`, `pending`, `too_many_activations`, `upstream_error`…), upstream status, and an 8-hex-character SHA-256 prefix of the licence key or purchase token (`keyRef` / `tokenRef`) for support correlation. **Never the key, token, signature or Razorpay key secret.**
- Client error reports and unexpected server errors, after `scrub()` (`src/lib/scrub.ts`). It removes emails, bearer tokens and JWTs, query strings, Razorpay ids (`pay_`, `sub_`, `order_`, `plan_`, `rzp_…` key ids), licence-key-like dash groups, GSTIN and other uppercase letter-plus-digit tax ids, long opaque tokens, and any number with 6 or more digits (cards, phones, ABN, bank). The 500 response itself never includes details.

## Scripts

`npm run dev` · `npm run typecheck` · `npm test` (vitest, fetch mocked, no network) · `npx wrangler deploy --dry-run --outdir .wrangler/dry --env dev` (bundle check; needs `../web/out` to exist).
