# Membership release runbook (trial integration)

**Status:** reviewed 24 October 2026 on branch `feat/membership-trial-integration`. Nothing here has been run
against a shared or production system. Membership stays **closed** until a separate, explicit launch
authorisation.

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

## 3. Integration checks that have NOT been run (do not treat as passed)

No authorised test credentials or test instances were available. Never use live credentials.

**Clerk (test instance)** - needs a Clerk test instance and its secret key:

1. Create three users: verified primary email; unverified primary email; verified `name+tag@...`.
2. With membership open **in a test deployment only**: unverified user -> `403 EMAIL_NOT_VERIFIED`; verified user -> `201`
   and 30 days; second attempt -> `409`; a second account with the same verified email -> `409`; `name+tag@` ->
   its own trial.

**Stripe (test mode)** - needs test keys, two recurring GBP Prices (no trial, no Lifetime), a webhook endpoint
(Stripe CLI `listen` works) and its signing secret:

1. Trial claim creates nothing in Stripe. 2. Explicit checkout with `4242...`; webhook activates the plan.
2. Second checkout while subscribed -> refused. 4. Two different-plan requests at once -> one payable session.
3. `4000 0000 0000 0341` (fails after attach) -> `past_due`, 7-day grace anchored to the first failure.
4. Cancel at period end -> access continues, then ends. 7. Replay a webhook from the CLI -> no change.
5. A Lifetime request -> `400`. 9. Confirm the abandoned-session expiry (about 31 minutes) and the session
   list's read-after-write behaviour, which are still assumptions.

**Restricted Billing Portal configuration** (Dashboard, test mode first): enable payment methods, invoice
history and cancellation at period end; disable plan switching and any product not sold; set the id as
`STRIPE_PORTAL_CONFIGURATION_ID`; confirm a portal session offers no plan change. The default configuration has
not been inspected.

## 4. Mobile scope

Server-side locking is complete: locked PowerDrops and practices return `403 MEMBERSHIP_REQUIRED` and the list
withholds the card artwork (`membership-gating.test.ts`), so the missing mobile "locked" screen is a
**user-experience gap, not an access-control gap**. The mobile PowerDrop locked-state UI depends on the
unmerged PowerDrop artwork work and is a separate follow-up. A web-only launch is safe.

## 5. Open items before launch

Stripe test mode, Clerk test instance, restricted portal configuration, `TRIAL_ELIGIBILITY_*` secrets generated
and stored, counsel's review of the "no refunds" wording and the privacy/cookie wording, a named backup for
manual duplicate-subscription review, Vercel Firewall rate-limit rules (section 6), approval to enable analytics,
a restore point and an approved run of migration `0012`, and a separate launch authorisation. (The
`somatic-prod` Vercel project's Preview configuration was fixed on 26 Oct 2026: Clerk and Sanity variables,
Next.js preset, `apps/web` root directory, and a separate Neon `Preview` branch for `DATABASE_URL`; its PR check
passes.)

## 6. External configuration checklist (names only; never paste a secret into chat or commit it)

Use a **non-production** environment for all of this: a local run or the `somatic-prod` Preview deployment, a
Clerk **development** instance, Stripe **test mode**, and a database that is not the production Neon branch.

| Where                                | Variable / action                                                                                                                                                                                                                                                  | Notes                                                                                                                                                                                              |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Clerk (development instance)         | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (`pk_test_`), `CLERK_SECRET_KEY` (`sk_test_`)                                                                                                                                                                                  | Already set for `somatic-prod` Preview. Rotate the secret that was pasted in chat.                                                                                                                 |
| Stripe test mode                     | `STRIPE_SECRET_KEY` (`sk_test_`)                                                                                                                                                                                                                                   | Server only.                                                                                                                                                                                       |
| Stripe test mode                     | Two recurring GBP Prices, **no trial**: £5.99 per month, £59 per year. Set `STRIPE_PRICE_ID_MONTHLY`, `STRIPE_PRICE_ID_ANNUAL`                                                                                                                                     | No Lifetime Price.                                                                                                                                                                                 |
| Stripe test mode                     | Webhook endpoint `<test-origin>/api/webhooks/stripe` with events `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`; set `STRIPE_WEBHOOK_SECRET` (`whsec_`) | A Preview URL is behind Vercel deployment protection, so Stripe cannot reach it; use the Stripe CLI (`stripe listen --forward-to localhost:3000/api/webhooks/stripe`) against a local run instead. |
| Stripe test mode                     | Billing Portal configuration: payment methods, invoice history, cancel at period end ON; plan switching and unsold products OFF. Set `STRIPE_PORTAL_CONFIGURATION_ID`                                                                                              | The default configuration has not been inspected.                                                                                                                                                  |
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
