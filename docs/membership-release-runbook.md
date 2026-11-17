# Membership release runbook (trial integration)

**Status (27 October 2026):** branch `feat/membership-trial-integration`. The integration was verified against
Stripe **Sandbox**, a Clerk **development** instance and a **disposable local PostgreSQL** (section 3). Nothing has
been run against production, nothing from this work has been pushed, merged or deployed, and membership stays
**closed** until a separate, explicit launch authorisation. Two owner-paid hosted Checkout payments and a
delayed-webhook test followed the first run (section 3.2a). **The integration is NOT fully launch-ready:** section 3
lists what is verified, and sections 3.3 and 5 list what is not.

## 1. Migration `0012_add_membership_trial_grace_and_free_content`

Reviewed against the migration history (`0000`-`0010a`) and the schema, and exercised on **throwaway local
PostgreSQL 17 databases only**:

| Check                               | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Purely additive                     | Yes: 5 `ADD COLUMN` (all nullable or defaulted), 1 `CREATE TABLE`, 1 `CREATE INDEX`, 2 `ADD CONSTRAINT ... CHECK`. No drop, delete, update, rename, type or enum change (a test enforces this)                                                                                                                                                                                                                                                                                                                                                     |
| Existing data                       | Applied on top of a populated `0010a` database (free, legacy Lifetime and past-due rows, a practice): every existing row identical afterwards, new columns `NULL`, `practices.is_free` = `false`, legacy Lifetime row intact                                                                                                                                                                                                                                                                                                                       |
| Ordering                            | `main` already has `0010_add_interactive_practices` and `0010a_add_crm_outbox`; `0012` is dated after both (drizzle skips a migration older than the last applied; a test asserts the ordering). Full chain `0000`-`0012` applies from an empty database                                                                                                                                                                                                                                                                                           |
| Eligibility and concurrency support | `trial_claims.email_key` is the **primary key**, so concurrent claims for one email are decided by the database (unique violation `23505`); `email_key` must match `^[0-9a-f]{64}$` (an address cannot be stored by mistake); `trial_claims` has **no foreign key** to `users` so a claim outlives account deletion; `entitlements_trial_window` rejects a half-set or backwards trial window (`23514`); existing unique constraints on `entitlements.stripe_customer_id` / `stripe_subscription_id` stop one Stripe object resolving to two users |
| Index                               | `idx_trial_claims_user` (support lookups only); the claim path needs only the primary key                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Locking                             | `ADD COLUMN` with no volatile default and `CREATE TABLE` take brief locks; `ADD CONSTRAINT ... CHECK` on `entitlements` validates existing rows (all new columns are `NULL`, so it passes immediately). Not measured against production row counts                                                                                                                                                                                                                                                                                                 |

### Release procedure (all steps need separate authorisation; none done)

1. Take a restore point first (Neon branch or point-in-time recovery marker).
2. Apply with the **standard runner** from `packages/db`: `pnpm db:migrate` (`drizzle-kit migrate`), with the
   unpooled connection. `drizzle.config.ts` refuses a production host unless
   `ALLOW_PRODUCTION_DB_OPERATIONS=yes` is set explicitly for that one command. Never run the SQL by hand
   and never re-run it.
3. Verify: the new columns and `trial_claims` exist; `SELECT count(*) FROM trial_claims` is `0`; legacy Lifetime
   rows unchanged.
4. **Migrate first, then deploy the code.** The new code reads the new columns; the old code tolerates the new
   schema (additive), so the migration can be applied while the old code is still live.
5. Deploy with `REGULATION_SUITE_MEMBERSHIP_OPEN` unset (closed). Opening is a later, separate decision.

### Rollback / recovery

- **Preferred: roll forward / leave the schema.** The change is additive and, with membership closed, unused;
  old code ignores it. Rolling back the _code_ needs no database change.
- **Schema rollback - DO NOT USE ONCE ANY TRIAL HAS BEEN CLAIMED.** It drops `trial_claims`, which deletes the
  one-trial-per-email records and would let everyone who has had a trial claim another. Before running it,
  confirm `SELECT count(*) FROM trial_claims` is `0`; if it is not, stop and roll forward instead. It is
  otherwise only for a failed migration before launch. Export first: `COPY trial_claims TO ...`. Tested on a disposable
  database (rows, legacy Lifetime row and the other 12 migration records preserved):

  ```sql
  BEGIN;
  ALTER TABLE "trial_claims" DROP CONSTRAINT IF EXISTS "trial_claims_email_key_format";
  ALTER TABLE "entitlements" DROP CONSTRAINT IF EXISTS "entitlements_trial_window";
  DROP INDEX IF EXISTS "idx_trial_claims_user";
  DROP TABLE IF EXISTS "trial_claims";
  ALTER TABLE "entitlements" DROP COLUMN IF EXISTS "stripe_synced_at";
  ALTER TABLE "entitlements" DROP COLUMN IF EXISTS "trial_ends_at";
  ALTER TABLE "entitlements" DROP COLUMN IF EXISTS "trial_started_at";
  ALTER TABLE "entitlements" DROP COLUMN IF EXISTS "payment_failed_at";
  ALTER TABLE "practices" DROP COLUMN IF EXISTS "is_free";
  DELETE FROM drizzle.__drizzle_migrations
   WHERE created_at = (SELECT max(created_at) FROM drizzle.__drizzle_migrations);
  COMMIT;
  ```

- If trials **have** been claimed, do not drop `trial_claims`; roll forward instead, or restore from the
  step-1 restore point if data is corrupted.
- Trial secrets: never delete an old `TRIAL_ELIGIBILITY_*` key version while `trial_claims` rows use it.

## 2. Trial security: what was reviewed and where it is tested

| Requirement                | Behaviour                                                                                                                                                                                                    | Evidence                                                           |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| Trusted identity           | Clerk session (`requireAuth`); eligibility uses the provider's own record, fetched server-side with the Clerk secret key, never `users.email`                                                                | `verify/email.ts`; `billing/trial/route.test.ts`                   |
| Missing / unverified email | Refused (403 `EMAIL_NOT_VERIFIED`), nothing written; provider unreachable or secret missing -> 503, nothing written                                                                                          | route tests                                                        |
| Normalisation              | Server-side NFKC + trim + lowercase **only**; plus-tags and Gmail dots are **not** stripped (owner decision), so `jane+x@...` is a different address; a route test shows two such addresses each get a trial | `trial/email.test.ts`; route test                                  |
| One trial per email        | HMAC-SHA-256 key as primary key; claim and trial dates in one transaction; 40 accounts racing for one email -> exactly one trial (real PostgreSQL)                                                           | `trial.integration.test.ts`                                        |
| Previously paid            | Refused for any paid tier (including ended and legacy Lifetime), any past Stripe subscription, any recorded trial                                                                                            | eligibility tests; route tests                                     |
| 30 days / no charge        | Exactly 30 days to the millisecond; no Stripe object; ends as Free; a test ties the display constant to the enforced one                                                                                     | `eligibility.test.ts`, `trial-constants.test.ts`                   |
| 7-day grace, cancellation  | Grace counted from the first failed payment; cancellation keeps access to the paid-through instant                                                                                                           | `membership-resolution.test.ts`; `stripe-sync.integration.test.ts` |
| Duplicate subscriptions    | Row-locked `startCheckout`, one Stripe customer, one payable session; a second live subscription is flagged `review_required` and **never auto-cancelled or refunded**                                       | `stripe-sync.integration.test.ts` (54 tests, real PostgreSQL)      |
| Lifetime                   | Not requestable; a one-time payment never creates one; existing rows untouched by every Stripe path                                                                                                          | integration + unit tests                                           |
| Webhook                    | Signature verified first; replayed, duplicate and out-of-order events converge on Stripe's current state                                                                                                     | route + integration tests                                          |
| Launch gate                | Closed unless `REGULATION_SUITE_MEMBERSHIP_OPEN` is exactly `true` **and** Stripe is fully configured; enforced in the checkout route, the trial route and inside the Stripe functions                       | route + unit tests                                                 |
| Secrets                    | `TRIAL_ELIGIBILITY_*` are read at request time on the server only (imported by the trial route and `@tnsi/auth` only), never `NEXT_PUBLIC`, never logged                                                     | grep review; log-redaction test                                    |

## 3. Integration verification (27 October 2026)

Everything below ran on one machine, outside production. **Nothing was run against live Stripe, the production
Clerk instance or any production database.** The test harness (scripts, test users and secrets) lives outside the
repository and is not committed.

### 3.1 How it was run

- **App:** `next dev` on `localhost:3000` from this branch, `REGULATION_SUITE_MEMBERSHIP_OPEN=true` in that one
  process only (production is unchanged and closed).
- **Database:** disposable local PostgreSQL 17 (loopback only, empty), migrations `0000`-`0012` applied (13 records).
- **Stripe:** Sandbox (test-mode keys; both Prices non-live: monthly 599 GBP per month, annual 5999 GBP per year,
  no trial) and Stripe CLI 1.55.1 forwarding the five events to `localhost:3000/api/webhooks/stripe` with the CLI's
  own signing secret.
- **Clerk:** development instance (`*.clerk.accounts.dev`), throwaway users with verified test addresses, real
  session tokens accepted by the app.
- **Cleanup:** the Sandbox customers and Clerk users created were deleted afterwards; all local processes were stopped.

- **Manual hosted-Checkout tests (3.2a):** two payments on Stripe's hosted Checkout page, made by the owner with
  Stripe's test card `4242 4242 4242 4242` in Sandbox. For the second, the genuine Stripe webhook deliveries were
  held by a local holding proxy that never touches signatures (3.2a).

**Method labels** used in the table: **Live Sandbox** = a real Stripe Sandbox operation produced a real, signed
webhook that the app processed. **Locally forged** = a request built by the test harness, not sent by Stripe.
**Simulated** = a database or clock manipulation standing in for something that cannot be waited for.

### 3.2 Results

| Scenario                                  | Result                     | Method                                     | What was observed                                                                                                                                                                                                                                                                                                                                                               |
| ----------------------------------------- | -------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Monthly checkout: session creation        | PASS                       | Live Sandbox                               | App created a real Checkout Session: monthly Price, 599 GBP, subscription mode, no trial, the app's own Stripe customer, user metadata, localhost return URL. Stripe accepted the roughly 31-minute `expires_at`.                                                                                                                                                               |
| Monthly checkout: payment and entitlement | PASS (payment substituted) | Live Sandbox                               | The hosted Checkout page was **not** used for this row; it was tested separately in 3.2a. The same customer was subscribed through the Stripe API with Stripe's test-card token. The real `customer.subscription.created` webhook (HTTP 200) moved the entitlement to monthly / active, paid through one month.                                                                 |
| Annual checkout                           | PASS (payment substituted) | Live Sandbox                               | Session: annual Price, 5999 GBP, yearly, no trial. Same substituted payment. Entitlement annual / active, paid through 27 Oct 2027.                                                                                                                                                                                                                                             |
| Invalid webhook signatures                | PASS                       | Locally forged                             | Six forged variants (no header, garbage, wrong signature, wrong secret, tampered body, 1-hour-old timestamp) all returned 400 and changed nothing. A correctly signed harmless event was accepted and skipped.                                                                                                                                                                  |
| Webhook replay safety                     | PASS                       | Locally forged re-delivery of a real event | A real event body fetched from Stripe was re-signed by the harness and delivered 3 times in sequence and 8 at once: always 200, entitlement identical, one row, one subscription. This was **not** a Stripe-initiated resend.                                                                                                                                                   |
| Out-of-order event                        | PASS                       | Locally forged re-delivery                 | Re-delivering the older "created" event after an immediate cancellation did not restore access.                                                                                                                                                                                                                                                                                 |
| Duplicate subscription                    | PASS                       | Live Sandbox                               | A second live subscription created through the API: entitlement stayed on the first, `duplicateStripeSubscriptions` recorded in the entitlement metadata, a "manual review needed" log line written, both subscriptions stayed active, no refund and no cancellation. A further checkout attempt returned 409 `ALREADY_A_MEMBER`.                                               |
| Cancellation at period end                | PASS                       | Live Sandbox                               | `cancelsAtPeriodEnd` became true and access continued to the paid-through date; resuming the subscription synced back. The lapse at the end of the period was **not** observed (3.3).                                                                                                                                                                                           |
| Immediate cancellation                    | PASS                       | Live Sandbox                               | Subscription ended, entitlement canceled, state inactive, no paid-through, access ended at once.                                                                                                                                                                                                                                                                                |
| Failed payment                            | PASS                       | Live Sandbox                               | A failing renewal invoice was produced by switching the subscription to Stripe's always-declining test card and resetting its billing cycle to now (not a natural renewal). Stripe set `past_due`; the app recorded the failure time; the member was in grace with access intact; the grace end was exactly 7 days after the failure.                                           |
| Grace expiry                              | PASS                       | **Simulated**                              | The failure timestamp was backdated in the disposable database: 6 days gave access (grace); 8 days gave no access even though the new billing period ran on. This is **not** a live seven-day wait.                                                                                                                                                                             |
| Failed-payment recovery                   | PASS                       | Live Sandbox                               | Paying the failed invoice with a working card restored the member to active and cleared the failure time.                                                                                                                                                                                                                                                                       |
| Entitlement synchronization               | PASS                       | Live Sandbox                               | Created, updated, deleted and failed-payment events all changed the entitlement correctly; 13 of 13 events forwarded by the Stripe CLI returned 200.                                                                                                                                                                                                                            |
| Billing Portal through the app            | PASS                       | Live Sandbox                               | Subscribers receive a `billing.stripe.com` session (200); a member with no billing history gets 400. The configuration was read back from Stripe: payment-method updates on, invoice history on, cancellation at period end on, plan switching and quantity changes off, pausing off, customer-information editing off. The portal screens themselves were not clicked through. |
| Card-free trial (live Clerk)              | PASS                       | Live Clerk, disposable database            | A verified member claimed a trial: 201, exactly 30 days, no Stripe customer or subscription created. A second claim and a claim by an account holding a paid plan both returned 409 `TRIAL_NOT_AVAILABLE`.                                                                                                                                                                      |
| Trial: unverified primary email           | **BLOCKED**                | n/a                                        | Clerk refuses to make an unverified address a primary email in this instance (`breaks_instance_invariant`), so the account state cannot be created and the case cannot be reproduced live. It is covered only by route tests with a simulated provider.                                                                                                                         |

### 3.2a Hosted Checkout and delayed-webhook tests (manual, owner-paid)

Two payments were made by the owner on **Stripe's hosted Checkout page** (Sandbox, test card), each for a fresh test
user and a Checkout Session created through the normal `POST /api/v1/billing/checkout` route. All Stripe events were
real and non-live. The test harness and logs live outside the repository, and **no secret was written to a log**.

**Test 1: normal order** (the webhook is processed within seconds of payment). **Test 2: delayed webhook.** The Stripe
CLI forwarder is not a registered endpoint, so **Stripe does not retry deliveries for it**; Stripe keeps the events in
its event log (30 days). To delay processing without touching verification, the CLI forwarded to a small local
**holding proxy** that stored each genuine delivery (original body and original `Stripe-Signature`, untouched) and
replayed it unchanged to the app on command. **Signature verification in the app was never disabled or changed**, and
production configuration was never touched. Stripe's 300-second timestamp tolerance still applied; the held
deliveries were released at 112-115 seconds of signature age.

| Check                                                                            | Result                                                        | Method                                  | What was observed                                                                                                                                                                                                                                                                                                                                                                                        |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hosted Checkout page shows the correct price                                     | PASS on Stripe data; **not independently confirmed visually** | Live Sandbox                            | The Checkout Session and its line item are "Regulation Suite - Monthly Membership", £5.99 GBP, the configured monthly Price. No screenshot of the hosted page was captured.                                                                                                                                                                                                                              |
| Genuine `checkout.session.completed`                                             | PASS                                                          | Live Sandbox                            | Delivered by Stripe in both payments, together with `customer.subscription.created` and `customer.subscription.updated`.                                                                                                                                                                                                                                                                                 |
| Webhook signature valid and handler accepted                                     | PASS                                                          | Live Sandbox                            | HTTP 200 for all three deliveries in each test; no 400.                                                                                                                                                                                                                                                                                                                                                  |
| Subscription and entitlement synchronized (test 1)                               | PASS                                                          | Live Sandbox                            | One active subscription on the monthly Price, entitlement monthly / active, paid-through date identical in Stripe and the app (27 Nov 2026).                                                                                                                                                                                                                                                             |
| Success page reconciled, webhook already processed (test 1)                      | PASS (see the redirect limitation)                            | Live Sandbox                            | The page showed "Active Membership", Monthly £5.99 per month, Active, next billing 27 November 2026, matching Stripe and the database.                                                                                                                                                                                                                                                                   |
| Replay of the real `checkout.session.completed` (test 1)                         | PASS                                                          | Locally forged re-delivery              | The real event body was re-signed by the harness and delivered 3 times in sequence and 8 at once: always 200, entitlement identical, one row, one subscription, one invoice. This was not a Stripe-initiated resend.                                                                                                                                                                                     |
| **Success page recorded the subscription while the webhooks were held (test 2)** | **PASS**                                                      | Live Sandbox                            | The three genuine deliveries were held from 09:31:19. When the success page loaded 109 seconds after payment, the entitlement went from free to **monthly / active** with the subscription recorded, while **zero webhooks had been processed by the app**.                                                                                                                                              |
| Held genuine webhooks released unchanged (test 2)                                | PASS                                                          | Live Sandbox (delivery delayed locally) | Three genuine deliveries released unaltered: signature ages 112-115 s, all HTTP 200 (`sync-subscription`), valid signatures.                                                                                                                                                                                                                                                                             |
| Consistency and no duplicate side effects after release (test 2)                 | PASS                                                          | Live Sandbox                            | The entitlement was identical before and after release apart from its sync timestamps. Final state: **one Stripe subscription, one entitlement row (one row referencing the subscription), one paid invoice.**                                                                                                                                                                                           |
| Stripe-to-localhost browser redirect after payment                               | **NOT VERIFIED**                                              | n/a                                     | After the first payment the owner's browser showed Clerk's sign-in form (it is not known whether that browser had been signed in). After the second, the in-app browser, **signed in beforehand**, also returned to Clerk's sign-in page instead of the success page. It looks like a Clerk **development-mode** cross-site session issue; it was **not** checked with a production Clerk configuration. |

**What this does and does not show.** The success page was then tested by signing in again and loading the exact
success URL (109 seconds after payment in test 2). So the **reconciliation logic passed**, including the case where
the webhook is late, but the **complete Stripe-to-localhost browser redirect remains unverified**, and its behaviour
under a production Clerk configuration is unknown. If a member did land on sign-in, they would sign in and the
webhook would still record the subscription.

### 3.3 Not verified: do not treat as passed

- **The Stripe-to-localhost browser redirect.** After payment the browser returned to Clerk's sign-in page instead of
  the success page in both manual payments (3.2a). The success page was tested by loading the exact URL after signing
  in again, so the reconciliation logic passed but the complete redirect is **unverified**, and it has **not** been
  verified with a production Clerk configuration.
- **The visible price on the hosted Checkout page.** Stripe's session and line-item data confirm £5.99, but the page
  itself was not independently confirmed from a screenshot.
- **Lapse at the end of a paid period.** A subscription cancelled at period end was not observed running out; the
  Sandbox cannot advance time for customers the app creates (the app has no test-clock hook).
- **A real renewal cycle.** The failure above was forced by resetting the billing cycle; a natural renewal, and the
  period-boundary behaviour around it, were not tested.
- **Grace expiry in real time** (simulated only), and Stripe's own retry and dunning schedule.
- **The trial with an unverified primary email.** **BLOCKED** (3.2): Clerk's development instance does not allow that
  account state. Covered only by route tests with a simulated provider.
- **Duplicate-subscription escalation** is verified only as a flag (3.4); the owner, backup, alerting and approved
  procedure it needs do not exist yet.
- **A Stripe-initiated webhook resend**, and a **registered Dashboard endpoint** (retries, the live account's API
  version). The CLI delivered events (API version 2023-10-16). The app re-reads state from the Stripe API, which
  limits the risk.
- **Not re-run in this cycle** (covered earlier only by tests that simulate Stripe): two different-plan requests at
  once leaving one payable session; a Lifetime request returning 400; a plus-tag address receiving its own trial; a
  second account with the same email; Clerk failure failing closed.
- **Abandoned-session expiry.** Stripe accepted a 31-minute `expires_at`, but expiry at 31 minutes and the session
  list's read-after-write behaviour were not observed.
- **Interactive Billing Portal.** Only the configuration and session creation were checked.

### 3.4 Duplicate-subscription manual review: required before launch

Verified behaviour: the second subscription is **flagged and never cancelled or refunded**. Today the only signals
are one server log line ("duplicate live subscription ignored; manual review needed") and the
`duplicateStripeSubscriptions` list in `entitlements.metadata`. Nothing tells a person. Before launch this needs:

1. **A named owner and a named backup.** The TNSI account owner/operator owns the runbook; a named backup must be
   assigned.
2. **An alerting mechanism.** A flagged case must reach a person without anyone reading logs or querying the
   database (for example an email, or a task, to the owner). The mechanism is a decision and is not built.
3. **A documented procedure.** Proposed, for the owner to approve: find the member from the flag; look at both
   subscriptions and their payments in Stripe; keep the first, with the member's agreement; end the duplicate
   according to the approved billing policy (refunds only where the policy or law requires, with counsel's wording
   settled); clear the flag; record the case and outcome. No step is automatic.

## 4. Mobile scope

Server-side locking is complete: locked PowerDrops and practices return `403 MEMBERSHIP_REQUIRED` and the list
withholds the card artwork (`membership-gating.test.ts`), so the missing mobile "locked" screen is a
**user-experience gap, not an access-control gap**. The mobile PowerDrop locked-state UI depends on the
unmerged PowerDrop artwork work and is a separate follow-up. A web-only launch is safe.

## 5. Open items before launch

**Not launch-ready.** Verified: see section 3.2. Outstanding release requirements:

- **Untested paths** listed in section 3.3, above all the Stripe-to-localhost browser redirect under a production
  Clerk configuration, a natural renewal cycle and the lapse at the end of a paid period.
- **Live-mode Stripe configuration** (none exists or has been touched): live Prices at **£5.99 per month** and
  **£59.99 per year** with no trial and no Lifetime Price, a restricted live Billing Portal configuration like the
  Sandbox one, a live webhook endpoint with its own signing secret, and a retry schedule that covers the 7-day grace.
- **`TRIAL_ELIGIBILITY_*` production secrets**, generated separately from the test ones and stored safely.
- **Duplicate-subscription manual review**: named owner and backup, an alerting mechanism and an approved
  procedure (section 3.4).
- **Counsel's review** of the "no refunds" wording and the privacy and cookie wording; **approval** to enable
  analytics; **Vercel Firewall rate-limit rules** (section 6).
- **A restore point and an approved run of migration `0012`** on the production database (separately authorised).
- **A separate launch authorisation**, after which `REGULATION_SUITE_MEMBERSHIP_OPEN` is set for Production.
  Until then production stays closed.

(The `somatic-prod` Vercel project's Preview configuration was fixed on 26 Oct 2026: Clerk and Sanity variables,
Next.js preset, `apps/web` root directory, and a separate Neon `Preview` branch for `DATABASE_URL`; its PR check
passes.)

## 6. External configuration checklist (names only; never paste a secret into chat or commit it)

Use a **non-production** environment for all of this: a local run or the `somatic-prod` Preview deployment, a
Clerk **development** instance, Stripe **test mode**, and a database that is not the production Neon branch.

| Where                                | Variable / action                                                                                                                                                                                                                                                  | Notes                                                                                                                                                                                              |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Clerk (development instance)         | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (`pk_test_`), `CLERK_SECRET_KEY` (`sk_test_`)                                                                                                                                                                                  | Already set for `somatic-prod` Preview. Rotate the secret that was pasted in chat.                                                                                                                 |
| Stripe test mode                     | `STRIPE_SECRET_KEY` (`sk_test_`)                                                                                                                                                                                                                                   | Server only.                                                                                                                                                                                       |
| Stripe test mode                     | Two recurring GBP Prices, **no trial**: £5.99 per month, £59.99 per year. Set `STRIPE_PRICE_ID_MONTHLY`, `STRIPE_PRICE_ID_ANNUAL`                                                                                                                                  | No Lifetime Price.                                                                                                                                                                                 |
| Stripe test mode                     | Webhook endpoint `<test-origin>/api/webhooks/stripe` with events `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`; set `STRIPE_WEBHOOK_SECRET` (`whsec_`) | A Preview URL is behind Vercel deployment protection, so Stripe cannot reach it; use the Stripe CLI (`stripe listen --forward-to localhost:3000/api/webhooks/stripe`) against a local run instead. |
| Stripe test mode                     | Billing Portal configuration: payment methods, invoice history, cancel at period end ON; plan switching, quantity changes, pausing, customer-information editing and unsold products OFF. Set `STRIPE_PORTAL_CONFIGURATION_ID`                                     | Sandbox configuration set and read back on 27 Oct 2026 (it is the Sandbox account's default configuration). **A separate live-mode configuration is still needed.**                                |
| Test environment only                | `TRIAL_ELIGIBILITY_SECRET` (at least 32 chars; `openssl rand -base64 48`), `TRIAL_ELIGIBILITY_KEY_VERSION=1`                                                                                                                                                       | Use a **different** secret from production. Never reuse a test secret in production.                                                                                                               |
| Test environment only                | `REGULATION_SUITE_MEMBERSHIP_OPEN=true`                                                                                                                                                                                                                            | Read at build time. Leave unset in Production.                                                                                                                                                     |
| Vercel Firewall (Production project) | Add rate-limit rules (below)                                                                                                                                                                                                                                       | Currently no custom rules exist.                                                                                                                                                                   |

**Vercel Firewall rate limits** (checked 26 Oct 2026: the `tnsi-platform` project has no custom rules). The
in-app limits (`form-guard.ts`: 5 submissions per email per hour, 300 per form per 10 minutes) are a second layer,
not a replacement. Suggested rules, per client IP, action "Rate limit" with a 429 response:

| Path (POST)                                         | Limit                                                |
| --------------------------------------------------- | ---------------------------------------------------- |
| `/api/contact`                                      | 5 requests per 10 minutes                            |
| `/api/newsletter`                                   | 5 requests per 10 minutes                            |
| `/api/assessments/submit`                           | 10 requests per 10 minutes                           |
| `/api/v1/billing/trial`, `/api/v1/billing/checkout` | 10 requests per 10 minutes (once membership is open) |

**Safest way to share test secrets with the verification run:** create a file **outside** the repository (for
example `~/tnsi-verification/test-secrets.env`, `chmod 600`) holding only the test-mode values above, and tell
the engineer it exists. The run loads it into the process environment without printing it.
