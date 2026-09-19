# TNSI Membership & Billing — Commercial Decisions Needed

**Audience:** Caroline / project owner. This document is written in plain
business language, not engineering language — you should be able to read
and answer it without understanding any code.

**Status:** Nothing described here has been turned on. No prices exist, no
real payments can happen, and nothing changes until you make the decisions
below and engineering is asked to implement them.

---

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
