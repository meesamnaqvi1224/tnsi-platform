# Membership free-trial integration plan

**Status:** plan, now executed on the branch `feat/membership-trial-integration` (24 October 2026; see
section 6). Nothing here has been merged, deployed, migrated on any shared database or run
against Stripe or a production database.

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

_As recorded on 24 October 2026. The 27 October 2026 Sandbox verification
(section 7) changed the status of the Clerk, Stripe and PostgreSQL items below;
those bullets are marked. Nothing else here was resolved._

- The trial work is **uncommitted** and sits beside an unrelated stash.
- Migrations `0010`/`0011` have not been applied anywhere shared.
- **No non-production PostgreSQL was available in this environment**, so the
  database-backed trial and sync suites were not run. Earlier reports of them
  passing (trial 11/11, sync 30/30 on a local PostgreSQL 17) are not re-verified.
  _Update 27 October: a disposable local PostgreSQL 17 was used and the suites
  passed; see section 6 and section 7._
- Real Clerk (verified-email lookup) and Stripe test-mode behaviour are untested.
  _Update 27 October: partly tested against Stripe Sandbox and a Clerk
  development instance; see section 7 for what is verified and what is not._
- A secret for the trial email key must be generated and stored (server-side only,
  never in the repository); key rotation needs the previous secret kept.
  _Update 27 October: a test-only secret was generated for the local run. The
  production secrets are still to be generated._
- Mobile membership copy changed in the same working tree and needs its own check.
- Decisions: whether the plus-tag/dot limitation is acceptable; a named backup for
  manual duplicate-subscription review; counsel's review of the "no refunds" wording.

## 6. Execution record (24 October 2026)

- **Preserved, not modified:** `feat/membership-trial-policy` (HEAD `efc5157`), its
  86 uncommitted/untracked files, `stash@{0}` (`78384c0`). A snapshot commit of the
  working tree (`0245ca7`, including untracked files) is kept as the local ref
  `refs/preserve/membership-wip-20261024`, the stash as `refs/preserve/membership-stash0-20261024`,
  and an unencrypted temporary archive of the 86 files is in `~/tnsi-backups/`. A tree
  comparison afterwards showed the working tree byte-identical to the snapshot.
- **Integration branch:** `feat/membership-trial-integration`, based on PR #12's branch.
  Membership files were applied per file with a three-way merge (base = the original
  merge-base); 19 conflicted files were resolved with the membership version as the
  base and PR #12's safeguards re-applied. Unrelated work on the original branch
  (Google sign-in, PowerDrop artwork UI, Human Expansion, Somatic series 06, PROJECT.md,
  AUDIT_REPORT.md, `.gitignore`) was deliberately left out.
- **Migration:** the old `0010`/`0011` were replaced by one regenerated migration `0012`
  (see `docs/membership-commercial-decisions.md` 0.2b).
- **Ported from PR #12:** the launch gate and plan allow-list inside `createCheckoutSession`
  and `ensureStripeCustomer`, strict `"true"` matching, `MembershipClosedError` mapping,
  the optional `STRIPE_PORTAL_CONFIGURATION_ID`, and the route-level gate tests.
  **Not ported (superseded):** PR #12's own duplicate-subscription code (the membership
  row-lock design is stronger) and its Lifetime late-delivery cutoff (membership never
  grants Lifetime from Stripe at all).
- **Tested** against a throwaway PostgreSQL 17 run locally (not production): every
  migration `0000`-`0012` applied from empty, and the full web suite passed 716/716
  including the trial, Stripe-sync, CRM-outbox and somatic integration suites.
  Stripe was simulated; **no Stripe test-mode run has been done**. _(Superseded:
  a Sandbox run was done on 27 October 2026; see section 7.)_

## 7. Verification record (27 October 2026)

A local run on one machine, using the integration branch with the launch gate
open in that process only, a disposable local PostgreSQL 17 (migrations
`0000`-`0012` applied), Stripe **Sandbox**, the Stripe CLI forwarding the five
webhook events, and a Clerk **development** instance with throwaway users.
**No production configuration was changed and no production resource was used.**
The Sandbox customers and Clerk users created were deleted afterwards. The full
results table is in `membership-release-runbook.md` section 3.

**Live Sandbox** (a real Stripe operation producing a real signed webhook):
monthly and annual Checkout Session creation (correct Price, amount, no trial);
subscription payment and entitlement sync, where the payment was **substituted**
by subscribing the customer through the Stripe API with Stripe's test-card token;
duplicate-subscription flagging (entitlement unchanged, nothing cancelled or
refunded, repeat checkout refused); cancellation at period end (access continued
and resuming synced back); immediate cancellation (access ended at once); a
failed renewal (`past_due`, grace ending exactly 7 days later, access intact);
recovery after paying the failed invoice; Billing Portal session creation, with
the Sandbox portal configuration read back (payment methods, invoices and cancel
at period end on; plan switching, quantity, pausing and customer-information
editing off). 13 of 13 forwarded events returned HTTP 200. The card-free trial
was claimed through **live Clerk** (30.0 days, no Stripe object; repeat and
paid-plan claims refused).

**Locally forged** (built by the test harness, not sent by Stripe): six invalid
webhook signatures, all rejected with 400; a real event body re-signed and
re-delivered 3 times and 8 at once, leaving state identical; an older event
re-delivered after cancellation, which did not restore access.

**Simulated:** grace expiry, by backdating the failure time in the disposable
database (6 days: access; 8 days: none). It was not a live seven-day wait.

**Blocked:** the trial with an unverified primary email. Clerk's development
instance refuses to make an unverified address primary, so the account state
cannot be created; the case is covered only by route tests with a simulated
provider.

**Not tested; do not treat as passed:** the hosted Checkout page and
`checkout.session.completed` from a hosted payment; success-page reconciliation;
a natural renewal cycle; the lapse at the end of a paid period (Sandbox time
cannot be advanced for app-created customers); a Stripe-initiated webhook
resend; the interactive Billing Portal; and the cases not re-run in this cycle
(simultaneous different-plan requests, a Lifetime request, a plus-tag address,
a second account with the same email, Clerk failure failing closed).

**Operational requirement.** Duplicate-subscription handling currently relies on
a server log line and an entitlement metadata flag. A named owner and backup, an
alerting mechanism and an approved procedure are still required before launch
(runbook section 3.4).

**Status.** The integration is **not launch-ready**. Production stays closed; live-mode
Stripe configuration does not exist; production `TRIAL_ELIGIBILITY_*` secrets,
a restore point, an approved run of migration `0012`, counsel's review and a
separate launch authorisation are still required. As of 27 October 2026
nothing from this verification work has been pushed, merged or deployed.
