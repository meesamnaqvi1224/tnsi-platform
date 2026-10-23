# Membership free-trial integration plan

**Status:** plan only. Written 24 October 2026 from a read-only inspection of the
unreleased membership branch. Nothing here has been merged, deployed, migrated or
run against Stripe or a production database.

## 1. Where the trial lives today

- **`main` has no trial.** There is no `/api/v1/billing/trial` route, no trial
  columns or claims table, and checkout creates no trial. The public Regulation
  Suite page (PR #11) states the owner-approved 30-day card-free trial "when
  membership opens", so the trial must land before launch.
- **The trial exists only on `feat/membership-trial-policy`** (in the main
  checkout `~/tnsi-platform`, HEAD `efc5157`), split across:
  - **committed** (`efc5157` and its ancestors): the dormant membership stack,
    including migration `0010` (payment-failed timestamp, `practices.is_free`);
  - **uncommitted** (about 85 files, plus one stash): the trial itself - the
    `billing/trial` route, `@tnsi/auth/trial/*` (eligibility and email-key
    modules), the trial schema (`trial_started_at`, `trial_ends_at`,
    `stripe_synced_at`, the `trial_claims` table), **migration `0011` (untracked,
    unapplied)**, the checkout and webhook rewrites, and their tests.

The uncommitted work was not touched, copied, stashed or reset during this review.

## 2. What the design does (read, not executed)

| Rule                                                         | Where                                                                                                                                                                                                                           | Assessment                                                                            |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 30 days exactly, to the millisecond                          | `TRIAL_DURATION_DAYS` and `trialWindow` in `packages/auth/src/trial/eligibility.ts`; a test ties the display constant to it                                                                                                     | Matches the approved terms                                                            |
| No card, no Stripe object, no automatic charge or conversion | Trial is app-managed; the route never creates a subscription; checkout has no trial and no one-time mode                                                                                                                        | Matches                                                                               |
| Ends as Free                                                 | Server-side expiry in membership resolution (`packages/auth/src/authorize/entitlements.ts`)                                                                                                                                     | Matches (DB-backed run needed)                                                        |
| One trial per person                                         | `trial_claims.email_key` primary key = HMAC-SHA-256 of the verified, normalised primary email (Unicode NFKC, trimmed, lowercased), keyed by a server secret with key versions; claim and trial dates written in one transaction | Sound. Accepted limitation: plus-tags and dots give another address, so another trial |
| Verified email only                                          | Identity-provider lookup (`fetchProviderUserEmails`); our own copy of the email is never used                                                                                                                                   | Sound; fails closed                                                                   |
| Not for people who held a paid plan                          | Refused for any paid tier (including ended and legacy Lifetime), any past Stripe subscription, any recorded trial                                                                                                               | Matches                                                                               |
| Failed payment                                               | 7-day grace counted from the first failed payment (`PAYMENT_GRACE_PERIOD_DAYS`), `payment_failed_at`                                                                                                                            | Matches the approved model. **`main` only marks `past_due` with no end date**         |
| Cancellation                                                 | Access to the end of the paid period                                                                                                                                                                                            | Matches                                                                               |
| Launch gate                                                  | The route uses the same `isMembershipOpen()` as checkout                                                                                                                                                                        | Matches (see 3)                                                                       |

## 3. Overlap with PR #12 (billing guard)

The membership working tree and PR #12 independently implement the same
safeguards, which is reassuring but means the two will conflict:

| Safeguard                    | PR #12 (`main`-based)                                                                               | Membership working tree                                                     |
| ---------------------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Launch gate                  | `isMembershipOpen()` in `@tnsi/integrations`, enforced in the route **and** `createCheckoutSession` | `isMembershipOpen()` in `lib/membership.ts` (route)                         |
| One Stripe customer per user | `ensureStripeCustomer` (key `customer:<id>`), compare-and-set `UPDATE`                              | `ensureStripeCustomer` (key `tnsi-customer:<id>`), **entitlement row lock** |
| Duplicate subscriptions      | local 409 + Stripe live-subscription check + open-session reuse/expiry + webhook flag               | local 409 + open-session handling + webhook flag                            |
| Idempotency / session expiry | key inside `createCheckoutSession`, 30-minute expiry                                                | key built by the route from user, plan and a time window                    |
| Lifetime                     | rejected in schema and function; late-delivery grant with a 23 Oct cutoff; never overwritten        | one-time mode removed; sync "does not read or write existing Lifetime rows" |
| Portal                       | optional `STRIPE_PORTAL_CONFIGURATION_ID`                                                           | unchanged route                                                             |

Files expected to conflict: `apps/web/src/lib/membership.ts`, `billing/checkout/route.ts`
(and its test), `dashboard/billing/page.tsx` (and test), `lib/sync-stripe-entitlement.ts`
(and test), `packages/integrations/src/stripe/{checkout,config,tier-mapping,sync-plan}.ts`
(and tests), `packages/integrations/src/index.ts`, `validation.ts`, `.env.example`.

## 4. Recommended integration order

1. **The owner (or an explicitly authorised session) commits the membership working
   tree** on its own branch, in logical commits (schema + migrations, auth/trial,
   integrations, web routes and pages, mobile, docs). It must not be reset or
   stashed away first.
2. **Review and merge PR #12** (small, tested) so `main` carries the guard.
3. **Bring `main` into the membership branch** with a normal merge. Resolve
   conflicts with the **membership version as the base** (it is the superset:
   row lock, trial, grace, Stripe sync) and re-apply only what PR #12 has that it
   lacks:
   - the gate inside `createCheckoutSession` (defence in depth);
   - the Stripe-side live-subscription check before creating a session;
   - the Lifetime late-delivery cutoff and the "never overwrite Lifetime" rules, or
     confirm the membership sync already guarantees them;
   - `STRIPE_PORTAL_CONFIGURATION_ID`;
   - the new tests (checkout function, portal, webhook route, sync executor), run
     against the merged code.
     Keep one customer-creation helper and one idempotency-key scheme.
4. **Apply migrations `0010` and `0011` only to a throwaway non-production
   PostgreSQL** and run the DB-backed suites (`trial.integration`,
   `stripe-sync.integration`, the two somatic suites, the CRM outbox suite).
5. **Stripe test mode** (not the live account): trial with no card -> expiry back to
   Free -> second trial refused -> explicit checkout -> payment -> failed payment
   and the 7-day grace -> cancel at period end -> second-subscription attempt
   refused -> Lifetime attempt refused. Needs test-mode keys and a test Clerk.
6. Ship in a separate, explicitly authorised release: migrations, then code, then
   (later, separately) `REGULATION_SUITE_MEMBERSHIP_OPEN=true`.

## 5. Blockers (nothing here was resolved by this review)

- The trial work is **uncommitted** and sits beside an unrelated stash.
- Migrations `0010`/`0011` have not been applied anywhere shared.
- **No non-production PostgreSQL was available in this environment**, so the
  database-backed trial and sync suites were not run. Earlier reports of them
  passing (trial 11/11, sync 30/30 on a local PostgreSQL 17) are not re-verified.
- Real Clerk (verified-email lookup) and Stripe test-mode behaviour are untested.
- A secret for the trial email key must be generated and stored (server-side only,
  never in the repository); key rotation needs the previous secret kept.
- Mobile membership copy changed in the same working tree and needs its own check.
- Decisions: whether the plus-tag/dot limitation is acceptable; a named backup for
  manual duplicate-subscription review; counsel's review of the "no refunds" wording.
