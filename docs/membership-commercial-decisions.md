# TNSI Membership & Billing — Commercial Decisions Needed

**Audience:** Caroline / project owner. This document is written in plain
business language, not engineering language — you should be able to read
and answer it without understanding any code.

**Status (updated 14 October 2026):** Section 0 is the current source of
truth: the owner-confirmed policy, what is implemented today, and what is
planned but not yet built. Nothing is live — membership is closed, no real
payment can happen, and no Stripe credentials are configured in the production
project. Sections 1–17 are the original question set, kept unchanged as the
historical record; where they conflict with Section 0, Section 0 wins.

---

## 0. Current policy and implementation status

Approved model v1 (8 October 2026) was **amended on 14 October 2026**: the trial
and Lifetime rules below replace the earlier ones. This section separates three
things so none is mistaken for another: **0.1** what the owner has decided,
**0.2** what the committed code does, **0.2a** what is implemented on the uncommitted feature branch, and **0.3** what is not yet done.

### 0.1 Decisions confirmed by the owner

| Decision                 | Confirmed                                                                                                                                                               |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Model                    | Free + paid membership, self-serve (no discovery call)                                                                                                                  |
| Monthly / annual         | £5.99 per month / £59 per year (about an 18% saving)                                                                                                                    |
| Trial                    | 30 days with **full paid-feature access**                                                                                                                               |
| Card for the trial       | **None.** No payment card is required to start a trial                                                                                                                  |
| When the trial ends      | The account **returns to Free automatically**. No charge and no automatic conversion to paid                                                                            |
| Becoming a paying member | Only by **explicitly choosing a plan and completing checkout**                                                                                                          |
| Trial eligibility        | **One trial per verified, normalised email address**, recorded durably. A person using a different email address could claim another trial; this limitation is accepted |
| Payment failure          | 7-day grace period (counted from the first failed payment)                                                                                                              |
| Cancellation             | Access continues to the end of the paid billing period                                                                                                                  |
| Refunds                  | None — nothing in the platform issues or promises refunds                                                                                                               |
| Free account             | Check-In, selected Practices/resources, 3 PowerDrops™                                                                                                                   |
| Paid                     | Full Practice and PowerDrops™ library                                                                                                                                   |
| Lifetime                 | **No new Lifetime purchases.** Existing, legitimate Lifetime members are grandfathered and keep access                                                                  |
| Life Beyond Trauma™      | Separate programme and separate commercial journey; not part of this membership                                                                                         |

**Superseded by the above:** the 8 October wording "Trial: 30 days, Stripe-native,
first subscription only" and the open question "Is a payment method required to
start the trial? Currently yes"; and "Lifetime tier: not part of the approved
model (price intentionally unset)".

### 0.2 Baseline behaviour (carried forward from the committed code)

- **Free and paid states.** Free, trial, active, cancelled-but-active, payment
  issue and ended are resolved from the member's entitlement row
  (`packages/auth/src/authorize/entitlements.ts`, `apps/web/src/lib/membership-view.ts`).
- **Ended membership → Free account.** A member whose paid access has ended
  (cancelled and period over, expired, or unpaid past the grace period) keeps
  the member area and free-designated content and loses paid-only content.
  `hasMemberAccess` now means "has an account"; paid access is decided
  separately by `resolveMembership` / `hasPaidAccess`.
- **7-day payment grace.** Counted from the first failed payment, never
  restarted by later retries, cleared when payment recovers. Access continues
  during grace.
- **Cancellation.** A cancelling member keeps access until Stripe reports the
  paid period has ended (Stripe's cancel-at-period-end). The platform also
  enforces the paid-through date itself (see 0.2a).
- **Entitlements from Stripe.** Webhook events update the member's entitlement;
  a repeated event simply rewrites the same values.
- **Display prices.** £5.99 and £59 and the 18% saving are display constants in
  `packages/integrations/src/stripe/plans.ts` (a test recomputes the saving).
  The amount actually charged comes from Stripe Prices that have not been
  created yet.
- **Closed by default.** Membership stays dormant — website closed, no
  checkout, no content locked — until `REGULATION_SUITE_MEMBERSHIP_OPEN=true`
  _and_ Stripe is fully configured. No Stripe credentials are configured in the
  production project (checked 13 October 2026).
- **Membership page.** `/dashboard/billing` is the member's Regulation Suite™
  membership page (see 0.5).

### 0.2a Implemented on a feature branch — not committed, not deployed

The confirmed policy above is now **implemented in code**, first on the local
branch `feat/membership-trial-policy` (uncommitted there, preserved untouched)
and now, selectively, on the integration branch `feat/membership-trial-integration`
(PR for review; see 0.2b). It has not been reviewed by a person and is **not
deployed**. The database changes are in a single migration, `0012`, **not applied
anywhere shared**. Membership remains closed. What exists:

- **Card-free, app-managed 30-day trial** (`POST /api/v1/billing/trial`): trial
  start and end dates are stored on the account; no Stripe customer or
  subscription is involved.
- **Server-side expiry.** The account returns to Free when the trial end date
  passes, evaluated on every request from the dates alone (no scheduled job).
  No charge, no conversion. A paid state always outranks a trial.
- **Durable, transactional eligibility.** One trial per verified, normalised
  email. The key is the email lower-cased and trimmed (Unicode-normalised) -
  **plus-tags and Gmail dots are not stripped** - hashed with a dedicated
  server secret (HMAC-SHA-256). Missing secret means no trials (fail closed).
  The ledger (`trial_claims`) survives account deletion; a claim is made in one
  database transaction under a row lock, so simultaneous attempts cannot both
  succeed. Key rotation is supported by key version.
- **Checkout without a trial.** Subscriptions only (monthly £5.99, annual £59),
  never a trial. A member currently on the app-managed trial may buy. At most
  one payable checkout exists per member at a time: the server checks Stripe
  while holding the member's row lock, hands back the open session when the
  same plan is requested again, expires an earlier unpaid session when a
  different plan is chosen, and refuses a second purchase while an earlier
  completed checkout is still being confirmed. Abandoned sessions expire at
  Stripe after about 30 minutes. If Stripe cannot be read, nothing is created.
- **Returning from checkout.** The success URL carries Stripe's session id,
  treated as an unverified claim: the server re-reads the session from Stripe,
  checks it belongs to this member, and only a completed, paid session leads to
  recording the subscription (from Stripe's current state, the same code the
  webhook uses). Reaching the page proves nothing; pending, expired and
  unconfirmed states are shown honestly.
- **No new Lifetime purchases.** Lifetime Price and the one-time payment path
  are removed; existing Lifetime rows are never read or written by Stripe sync.
- **Webhook ordering and duplicates.** An event only identifies the
  subscription; Stripe's current state is read under a per-member row lock and
  written. Duplicates, replays and out-of-order delivery converge to the same
  result; failures answer 500 so Stripe retries. A second live subscription is
  flagged for manual review, never auto-cancelled.
- **Paid-through enforcement on the server.** When a paid period has ended but
  the record still says active, the platform asks Stripe before deciding. If
  Stripe answers, its answer decides. Only if Stripe is genuinely unreachable
  (connection failure, Stripe-side error, rate limit) is access held, and then
  only until 7 days after a valid paid-through date; with no valid date, never.
  This replaces the earlier "48 hours" idea, which is not used.
- **Wording.** Membership page, Regulation Suite page and the mobile membership
  screen describe the card-free trial and use the server-resolved fields
  (`trialAvailable`, `trialEndsAt`, `trialExpired`, `paidThrough`,
  `graceReason`).

**How far this has been verified.** Logic and database behaviour (trial claims,
concurrency, webhook ordering, Lifetime protection, outage rules) are tested
against a real local PostgreSQL 17. Stripe and Clerk are **simulated**: nothing
has been checked against live Stripe or Clerk, and no real payment has been
made. That still has to be done in Stripe test mode (see 0.4).

### 0.2b Integration branch (24 October 2026)

The membership work was integrated **selectively** onto a branch based on the
billing-guard PR (`feat/membership-trial-integration`), leaving the original
branch, its uncommitted files and its stash untouched (preserved as local refs
`refs/preserve/membership-wip-20261024` and `refs/preserve/membership-stash0-20261024`,
plus an unencrypted local archive in `~/tnsi-backups/`). Owner decisions applied:
trial eligibility is per verified, normalised email with plus-tags and dots NOT
stripped; ambiguous duplicate-subscription incidents go to the owner for manual
review and nothing is ever cancelled or refunded automatically; checkout stays
closed until the integrated implementation passes its required tests and a
separate launch authorisation is given.

Migration history: `main` already has `0010_add_interactive_practices` and
`0010a_add_crm_outbox`, so the branch's old `0010` (older timestamp, different
content) and `0011` could not be used as they were (drizzle would skip a
migration dated before the last one applied, and the file and snapshot names
collided). They were replaced by one regenerated migration, `0012`.

### 0.3 Not yet done

- Review of the integration branch, and applying migration `0012` (which carries
  what the old `0010` and `0011` did) to production before any deploy.
- Verification against real Stripe (test mode) and real Clerk accounts.
- A read-only check of production for legacy Lifetime rows (to be run, with
  approval, against an isolated copy).

### 0.4 Launch checklist (planned order)

Steps marked _planned_ are not yet done; the code for the rest is described in 0.2a.

1. **Apply the database migration** before deploying the code: `0012` (adds
   `entitlements.payment_failed_at`, `practices.is_free`, the trial columns,
   `stripe_synced_at` and the `trial_claims` table with its two CHECK constraints;
   purely additive; written, not yet applied anywhere shared).
2. **Stripe dashboard:** create the two recurring GBP Prices (£5.99/month,
   £59/year) with **no trial on either Price**; do **not** create a Lifetime
   Price; set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
   `STRIPE_PRICE_ID_MONTHLY`, `STRIPE_PRICE_ID_ANNUAL`; register the webhook;
   set the customer portal to cancel _at end of billing period_; align the
   retry schedule with the 7-day grace period. See
   `apps/web/src/app/api/webhooks/stripe/README.md`.
3. **Sanity:** the free flag is set on the three confirmed PowerDrops™ (see
   0.5). Still to designate: which Practices are free. Opening membership before
   the free content is flagged would make it paid.
4. **Test mode first:** trial with no card → trial expiry back to Free → a
   second trial attempt refused → explicit checkout → payment → payment failure
   and grace → cancel _(planned)_.
5. **Legacy Lifetime check:** confirm, read-only, that no legitimate Lifetime
   members exist, or identify them, before launch _(planned)_.
6. **Launch:** set `REGULATION_SUITE_MEMBERSHIP_OPEN=true` in production and
   redeploy (the Regulation Suite page reads it at build time).

### 0.5 Membership page (dashboard V1) and content status

`/dashboard/billing` is the member's Regulation Suite™ membership page
(`components/dashboard/membership/membership-overview.tsx`; the state wording
is derived from the real entitlement row by `lib/membership-view.ts`). It
covers free, trial, active, cancelled-but-active, payment issue (7-day grace)
and ended, reuses the existing checkout and billing-portal endpoints, and shows
no checkout while membership is closed. It does not change what is locked. On the
feature branch its trial wording describes the card-free trial (0.2a); the
committed version still describes the old Stripe-run trial.

- **Which PowerDrops™ (and which Practices) are free** is set in Sanity, with
  **Free for all members** (`freeAccess`) on each document — nothing is
  hardcoded. The figure "3" shown to members is `MEMBERSHIP_FREE_POWERDROPS`
  in `packages/integrations/src/stripe/plans.ts`.
- **Free PowerDrops™ — confirmed by the owner (8 October 2026):** The
  90-Second Exhale Drop, Micro Visualization: The Return, and The Powerdown
  Ritual. The other six are the paid depth. These three carry `freeAccess` in
  Sanity; it has no effect until membership opens.
- **The nine PowerDrops™ are now in Sanity (verified read-only, 14 October
  2026).** They were created on 9 October 2026 and are published, with the
  cleaned artwork attached and alt text on all nine; the three
  `[Placeholder]` PowerDrops are now drafts. The importer
  (`packages/cms/scripts/import-powerdrops.ts`) is idempotent: a dry run
  reports nothing to create. `content/powerdrops/powerdrops-v1.json` still
  records every PowerDrop as `draft`, so it no longer matches Sanity for
  status; the importer never updates existing documents.
- **Ended membership → Free account (implemented):** a member whose paid access
  has genuinely ended is treated as a Free Member — they keep the member area
  and free-designated content, lose paid-only content, and can start a new
  membership. They do not get a second trial; on the feature branch this
  is enforced by durable per-email eligibility (0.2a); the committed code only
  approximated it by "has had a Stripe subscription". Cancelling during a paid period and the 7-day grace period keep
  paid access.

### 0.5a Verification status and release blockers

Kept deliberately separate so one is never mistaken for another. As of the date
of the latest update to this section the branch is uncommitted and undeployed.

| Statement                                                                                             | Owner-approved policy | Verified in code | Automated tests | Real PostgreSQL | Real Stripe/Clerk test service |
| ----------------------------------------------------------------------------------------------------- | --------------------- | ---------------- | --------------- | --------------- | ------------------------------ |
| £5.99/month, £59/year; no new Lifetime; existing Lifetime kept                                        | yes                   | yes              | yes             | yes             | no                             |
| 30-day card-free app-managed trial; expiry returns to Free; no charge                                 | yes                   | yes              | yes             | yes             | no                             |
| One trial per verified, normalised email; missing secret fails closed                                 | yes                   | yes              | yes             | yes             | no (Clerk email check pending) |
| 7-day failed-payment grace; cancellation through paid-through date                                    | yes                   | yes              | yes             | partly          | no                             |
| Stripe outage exception (max 7 days past a valid paid-through date, only after a real failed attempt) | yes                   | yes              | yes             | partly          | no                             |
| One payable checkout per member; plan switch expires only the member's own unpaid, open session       | yes                   | yes              | yes             | yes             | no                             |
| Completed checkout reconciled before a second purchase; return page verifies the session              | yes                   | yes              | yes             | yes             | no                             |
| Duplicate live subscription: flagged, checkout paused, never auto-cancelled                           | yes                   | yes              | yes             | yes             | no                             |
| 24-hour reconciliation lookback; ~30-minute abandoned-session expiry                                  | defaults only         | yes              | yes             | lookback only   | **no - to be confirmed**       |

**Outstanding assumptions and release blockers**

- Live Stripe test-mode verification (procedure in the Stripe webhook README) and
  live Clerk verification (verified primary email only; unverified or missing
  email refused; normalisation as designed; a second account with the same
  normalised email cannot get another trial) have not been done.
- The ~30-minute abandoned-session expiry and read-after-write behaviour of
  Stripe's session list are assumptions until confirmed in test mode.
- Migration `0012` must be applied (by the migration runner, once) before
  deploying; it must not be re-run by hand.
- A read-only check for legacy Lifetime rows in production has not been run; it
  needs an approved isolated copy. Fields required: `tier`, `status`,
  `stripe_subscription_id`, `current_period_end` for rows with `tier = 'lifetime'`.
- A named backup for duplicate-subscription review must be assigned.
- `packages/db` has no test runner; its schema is covered by tests in `apps/web`
  and a migration check run against a throw-away database.
- Nothing is approved for deployment. Membership stays closed.

### 0.6 Open questions

- ~~A member whose paid access has ended should keep the free account?~~
  **Resolved:** yes.
- ~~Is a payment method required to start the trial?~~ **Resolved:** no. The
  trial needs no card and never converts automatically.
- ~~Should Lifetime remain available?~~ **Resolved:** no new purchases; existing
  legitimate Lifetime members are grandfathered. Whether any exist in
  production has not been verified.
- Which Practices (beyond the three PowerDrops™) are free?
- The model lists "Practice history and progress" under paid but does not say
  free members lose it; it is currently recorded for any practice a member can
  open.
- "Selected educational resources" has no member-gated content type behind it
  (articles are public); nothing is gated for it.
- Refund wording for the website terms needs approved copy.

---

> **Historical record — sections 1–17.** Everything below is the original
> question set, kept unchanged so the decision history stays visible. It is
> **superseded by Section 0** wherever they differ, notably: the Lifetime
> tier and pricing questions (Sections 3, 6), the trial and payment-method
> questions (Section 7), the PowerDrops™ free/paid question (Section 11), and
> the "currently implemented access" table (Section 4), which described a
> platform with no free/paid distinction.

## 1. Executive Summary

The technical groundwork for paid membership is already built and sitting
ready, but switched off. Specifically:

- Three paid membership types — **Monthly**, **Annual**, and **Lifetime**
  — already exist as concepts in the system, alongside a **Free** tier.
- The Stripe payment system (checkout and a self-service billing portal)
  is fully wired up in the code, but it is **not connected to real Stripe
  prices or real payment processing** — no one can actually be charged
  today.
- **No real prices exist anywhere** — not in the code, not on the
  website.
- **No paid-tier benefits have been defined** — right now, a paying
  member and a free member would get exactly the same access to
  everything in the app.
- The public website's current sales approach is a **consultation/
  application model** (book a call, apply, get in touch) — it does not
  currently offer or link to any self-serve sign-up-and-pay flow at all.

**Because of this, Stripe should not be switched on until you've made the
decisions in this document.** Turning it on today would let someone
attempt to pay for a membership that grants nothing beyond what's already
free, at a price that doesn't exist yet.

This document does not recommend which direction to take — it lays out
the real options and the specific questions only you can answer.

---

## 2. Commercial Model Decision

There are three possible ways TNSI could sell membership. None of these
has been chosen yet — the code is built in a way that could support any
of them.

### Option A — Self-Serve Membership

**Example flow:** Visitor → Signs Up → Chooses a Membership → Pays via
Stripe Checkout → Gets Member Access, immediately, with no human
involved.

What this would mean operationally: a visitor could go from "never heard
of TNSI" to "paying member" entirely on their own, at any hour, without
Caroline or anyone on the team talking to them first. This is the model
the _code_ is currently built for (checkout buttons, a billing portal).

### Option B — Consultation / Application

**Example flow:** Visitor → Learns about a program → Books a Discovery
Call or submits an application → Enrollment is arranged separately
(by a person, not automatically).

This is the model the **website currently uses**. Every commercial path
on the public site today — Life Beyond Trauma™, Practitioner
Certification, Executive Advisory — ends in "Book a Discovery Call,"
"Contact the Institute," or (for certification) a page that explains
there's no online application yet and a real conversation is the next
step. Nothing on the public site links to a self-serve checkout.

### Option C — Hybrid

**Example flow:** Visitor → Either books a Discovery Call/applies, OR
qualifies for self-serve membership → Whichever path fits, leads to the
right enrollment.

This would need explicit rules for which visitors or which
products/programs use which path, and how the two paths connect to each
other (for example: does a Discovery Call sometimes end with "here's your
checkout link"?). Nothing like that exists yet.

**OWNER DECISION:** __________________________

---

## 3. Membership Tiers

| Tier     | Exists in Code | Intended Type | Price | What It Includes | Decision |
| -------- | -------------- | ------------- | ----- | ---------------- | -------- |
| Free     | Yes            | Free          | TBD   | TBD              | Owner    |
| Monthly  | Yes            | Recurring     | TBD   | TBD              | Owner    |
| Annual   | Yes            | Recurring     | TBD   | TBD              | Owner    |
| Lifetime | Yes            | One-time      | TBD   | TBD              | Owner    |

**Should all four tiers remain?**

- [ ] Keep all four
- [ ] Remove Monthly
- [ ] Remove Annual
- [ ] Remove Lifetime
- [ ] Other: __________

---

## 4. Paid Membership Benefits

Right now, the system does not distinguish between what a free member and
a paying member can access — everything below is currently available to
any signed-up member, paying or not. That is the **currently implemented
access** (left column below). What you decide in the "Owner Decision"
column is a separate, future question about what _should_ change once
paid tiers mean something.

| Feature / Content          | Currently Implemented Access                                                                                         | Owner Decision |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------- | -------------- |
| Today (daily home screen)  | Free to any signed-up member                                                                                         |                |
| Daily Check-In             | Free to any signed-up member                                                                                         |                |
| Practices (library)        | Free to any signed-up member                                                                                         |                |
| Practice Player            | Free to any signed-up member                                                                                         |                |
| Practice Completion        | Free to any signed-up member                                                                                         |                |
| Reflections                | Free to any signed-up member                                                                                         |                |
| Practice History           | Free to any signed-up member                                                                                         |                |
| My Journey                 | Free to any signed-up member                                                                                         |                |
| Saved Practices            | Free to any signed-up member                                                                                         |                |
| PowerDrops                 | Free to any signed-up member (not yet connected to membership tiers at all — see Section 11)                         |                |
| Any future premium content | Does not exist yet                                                                                                   |                |
| Life Beyond Trauma™ Method | Not connected to the app's membership system at all — handled entirely through Discovery Calls / an external website |                |
| Regulation Suite™          | Described on the website as a "membership," but its own page says it isn't open for enrollment yet                   |                |
| Other programs/content     | Not connected to the app's membership system                                                                         |                |

---

## 5. Programs / Certifications / Features

The system has a place to store three kinds of "extra access" a paid
member could be granted:

- **Programs** — e.g. access to a specific program
- **Certifications** — e.g. recognition of completing a certification
- **Features** — e.g. access to a specific tool or capability

**None of these currently have real names/identifiers, and none are
given to any member today** — this part of the system is an empty,
ready-to-use shelf, not a populated list.

### Programs

| Program | Identifier | Included With |
| ------- | ---------- | ------------- |
|         |            |               |

### Certifications

| Certification | Identifier | Included With |
| ------------- | ---------- | ------------- |
|               |            |               |

### Features

| Feature | Identifier | Included With |
| ------- | ---------- | ------------- |
|         |            |               |

---

## 6. Pricing Decisions

| Tier     | Price | Currency | Billing Frequency | Notes |
| -------- | ----- | -------- | ----------------- | ----- |
| Monthly  | TBD   | TBD      | Monthly           |       |
| Annual   | TBD   | TBD      | Annual            |       |
| Lifetime | TBD   | TBD      | One-time          |       |

Please decide:

- **Currency:** __________
- **Monthly price:** __________
- **Annual price:** __________
- **Lifetime price:** __________
- **Should Annual be discounted compared to paying Monthly 12 times?**
  Yes / No / Amount: __________
- **Should Lifetime remain available at all?** Yes / No

---

## 7. Trial Decision

**What exists today:**

- The system has a place to record "this person is on a trial," but
  nothing currently puts anyone into that state.
- Checkout does not currently offer a trial.
- Nothing on the website mentions a trial.

**Does TNSI offer a trial?**

- [ ] No trial
- [ ] Yes — trial length: ______ days
- [ ] Other: __________

**If yes:**

- Which tier gets the trial? __________
- Does a payment method need to be collected before the trial starts?
  Yes / No
- What happens when the trial ends? __________
- Does the user automatically convert to paid membership at the end?
  Yes / No

---

## 8. Payment Failure / Grace Period

**What exists today:**

- If a payment fails, the system can record the member as "payment
  overdue."
- While marked "payment overdue," the member currently does **not**
  have paid access.
- There is no grace period built in — the restriction is immediate.

**Payment failure policy:**

- [ ] Immediate access restriction (current behavior)
- [ ] Grace period
- [ ] Other: __________

**If grace period:** Grace period length: ______ days

**What should the member see during this period?** __________

---

## 9. Cancellation

**What already exists (this is already built and working):**

- A member can cancel through Stripe's own self-service billing portal.
- Access continues for as long as the subscription is still active.
- If they cancel, the system records that a cancellation is coming, but
  keeps their access until the period they already paid for ends.
- Access ends once Stripe reports the subscription is no longer active.

**Does this match what you want?**

OWNER DECISION: Yes / No / Changes required

**If changes are required:**

Details: __________________________

---

## 10. Refund Policy

**Nothing related to refunds exists in the system today.**

Please decide:

- Are refunds offered? __________
- Full or partial? __________
- Within how many days? __________
- Who approves refunds? __________
- What happens to membership access after a refund? __________
- Are Lifetime purchases refundable? __________
- Are Annual purchases refundable? __________
- Are Monthly purchases refundable? __________

---

## 11. PowerDrops

PowerDrops is currently available to any signed-up member and is not
connected to the membership/paid-tier system at all — this was a
deliberate "not decided yet" choice already made in the code, not an
oversight.

**Owner decision:**

- [ ] Free
- [ ] Paid membership
- [ ] Specific tier: __________
- [ ] Separate purchase
- [ ] Not yet decided

---

## 12. Public Website vs Member App

These two parts of TNSI currently tell two different commercial stories.

**Public website currently communicates:**

- Programs/pathways (Life Beyond Trauma™, Practitioner Certification,
  Executive Advisory, Regulation Suite™, etc.)
- "Book a Discovery Call"
- "Apply" (with a note that there's no online application form yet —
  the next step is a real conversation)
- "Contact the Institute"
- A link out to an external Life Beyond Trauma website
- **No pricing shown anywhere**
- **No link to Stripe checkout or sign-up-to-pay anywhere**

**Member app currently contains:**

- A Billing page
- Monthly / Annual / Lifetime "subscribe" buttons (which do not yet work,
  since no real prices are configured)
- A self-service Stripe billing portal (for canceling, updating payment
  method, viewing invoices)
- Free / Monthly / Annual / Lifetime membership states

**Commercial Journey Decision**

How should a visitor move from the public website into the right
membership/program experience?

Owner answer:

---

---

## 13. What Happens After a Discovery Call?

This matters most if you choose the Hybrid model (Option C).

After a Discovery Call, should the customer:

- [ ] Receive a Stripe checkout link?
- [ ] Be manually enrolled?
- [ ] Receive an invitation to create an account?
- [ ] Be assigned a specific program/tier?
- [ ] Follow another process: __________

Owner decision:

---

---

## 14. What Happens When Someone Signs Up for Free?

Right now, anyone who creates an account automatically gets a Free
membership with the access described in Section 4.

Please decide:

- What should a free account actually receive? __________
- Is free access meant to be permanent? __________
- Is free registration meant as a lead-generation tool (a way to capture
  interested people, not a destination in itself)? __________
- Should some content be preview-only for free members? __________
- Should free users eventually be encouraged toward paid membership, and
  if so, how? __________

---

## 15. Final Decision Checklist

**Commercial model**

- [ ] Self-serve
- [ ] Consultation/application
- [ ] Hybrid

**Tiers**

- [ ] Free
- [ ] Monthly
- [ ] Annual
- [ ] Lifetime

**Pricing**

- Currency: ______
- Monthly: ______
- Annual: ______
- Lifetime: ______

**Paid benefits**

- [ ] Defined
- [ ] Not yet defined

**Trial**

- [ ] No trial
- [ ] Trial: ______ days

**Payment failure**

- [ ] Immediate restriction
- [ ] Grace period: ______ days

**Refunds**

- Policy: __________________

**PowerDrops**

- Access rule: __________________

**Public website → membership journey**

- Decision: __________________

**Discovery Call → enrollment**

- Decision: __________________

**Free account**

- Included access: __________________

---

## 16. What Engineering Will Implement After Owner Approval

**Nothing in this section has been built yet — this is a preview of the
next phase, once the decisions above are made.** Once you've answered the
questions in this document, engineering can translate your decisions
into:

1. Real Stripe Products
2. Real Stripe Prices
3. Mapping each TNSI tier to the correct Stripe Price
4. Actual rules for what a paid entitlement unlocks
5. Real program/certification/feature identifiers
6. Trial configuration, if you decide to offer one
7. Payment-failure and grace-period behavior
8. Updates to the Billing page so it actually shows prices and what each
   tier includes
9. A public pricing/checkout journey, if the self-serve or hybrid model
   is chosen
10. Additional webhook/entitlement safety hardening
11. Final rules for exactly what content requires which membership tier

These are all future implementation work — nothing here happens
automatically, and none of it starts until you've made the decisions
above.

---

## 17. Verification

- **Files inspected this session:** `packages/db/src/schema/entitlements.ts`,
  `packages/auth/src/authorize/entitlements.ts`, `packages/integrations/src/stripe/*`,
  `apps/web/src/lib/{billing,sync-stripe-entitlement,validation}.ts`,
  `apps/web/src/app/api/webhooks/stripe/route.ts`,
  `apps/web/src/app/api/v1/billing/{checkout,portal}/route.ts`,
  `apps/web/src/app/dashboard/billing/page.tsx`,
  `apps/web/src/components/dashboard/billing-actions.tsx`, the public
  marketing pages and their content files, `apps/web/src/lib/nav-links.ts`
  — all previously inspected during the read-only audit this document is
  based on; re-verified where needed to write this document accurately.
- **No code changes.**
- **No database changes.**
- **No migrations.**
- **No Stripe API calls.**
- **No Stripe products/prices created.**
- **No environment variables changed.**
- **No website content changed.**
- **No commits.**

The only file created this milestone is this document itself:
`docs/membership-commercial-decisions.md`.

---

## Final Assessment

**COMMERCIAL DECISIONS REQUIRED BEFORE STRIPE IMPLEMENTATION**
