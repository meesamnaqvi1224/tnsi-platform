# Stripe → Postgres entitlement sync webhook

Registering this webhook is a one-time action in the Stripe dashboard
(`https://dashboard.stripe.com` → Developers → Webhooks) — it can't be done
from this repository. This note documents the exact configuration this
endpoint expects.

## Configuration

- **URL**: `https://thenervoussysteminstitute.com/api/webhooks/stripe`
  (production domain — see `apps/web/src/lib/seo.ts` / `NEXT_PUBLIC_SITE_URL`)
- **HTTP method**: `POST`
- **Events to send**:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`
- **Signing secret**: copy the endpoint's signing secret into
  `STRIPE_WEBHOOK_SECRET` (Vercel env var — never commit it). Test mode and
  live mode each have their own webhook endpoint and signing secret; a
  staging deployment needs its own test-mode endpoint pointed at its own
  URL.

## Stripe dashboard settings this behaviour depends on

These cannot be set from the repository:

- **Customer portal → Cancellations**: "Cancel at end of billing period"
  (not "immediately"), so a cancelling member keeps access to the end of the
  period they paid for.
- **Billing → Subscriptions and emails → retry/dunning rules**: the retry
  schedule should run for at least the 7-day grace period; the platform
  enforces the 7 days itself, independent of when Stripe finally gives up.
- **No refund automation**: the commercial model is no refunds — nothing in
  this platform issues refunds; do not add refund flows to the customer portal.

No payload/projection configuration is needed beyond selecting those five
events — the events are used only to identify the subscription; its state is read from Stripe's API.

## Checkout Session requirements

For the webhook to be able to link a completed checkout back to a TNSI
user, `apps/web/src/lib/start-checkout.ts` creates the member's Stripe
customer once (tagged with `metadata.userId`) and stamps `metadata.userId` on
every Checkout Session and on the subscription it creates. If a Checkout
Session is ever created by some other path without that metadata, this
webhook safely skips it (see `planForCheckoutSessionCompleted` in
`packages/integrations/src/stripe/sync-plan.ts`) rather than guessing which
user it belongs to. Checkout is subscription-only (monthly and annual) and
never carries a trial. Each session also carries `metadata.tier` and expires
about 30 minutes after creation if abandoned.

`startCheckout` allows at most one payable session per member: under the member's
row lock it asks Stripe for the customer's open and recently completed sessions,
reuses an open session for the same plan, expires an open session for another
plan, and will not start a new one while an earlier completed session is
unrecorded or its payment is still pending. The success URL carries
`session_id={CHECKOUT_SESSION_ID}`; the billing page passes it to
`reconcileCheckoutReturn`, which re-reads the session from Stripe, checks that it
belongs to the signed-in member and their Stripe customer, and only for a
completed, paid session applies the subscription's current state via the same
`refreshSubscription` this webhook uses (so the two cannot disagree or overwrite
each other with older state).

## How events are processed (design)

**An event only says WHICH subscription changed. Stripe's current state decides
what is written.** Stripe delivers events at least once and in no guaranteed
order, and a payload can already be stale on arrival, so no state is taken from
the event itself and no event timestamp is used to order anything.
`refreshSubscription` (`apps/web/src/lib/sync-stripe-entitlement.ts`):

1. opens one database transaction and **locks the member's `entitlements` row**
   (`SELECT ... FOR UPDATE`, found by Stripe customer id; a not-yet-linked
   customer is linked from the checkout `metadata.userId`, only if that member
   has no Stripe customer yet);
2. skips a **legacy Lifetime** row entirely (never read from or written to);
3. **reads the subscription's current state from Stripe**, while holding the
   lock;
4. keeps a **second live subscription from replacing the first**: it is recorded
   in `entitlements.metadata.duplicateStripeSubscriptions` and logged for manual
   review - never auto-cancelled;
5. maps the state (never guessing a tier for an unrecognised price) and writes it,
   with `stripe_synced_at`.

Consequences: a duplicate or replayed event rewrites the same values; a stale
event delivered late cannot overwrite newer state; two events (or an event and a
read-time refresh) for one member are serialised by the row lock, each reading
Stripe after the previous one committed. A failure anywhere (Stripe unreachable,
a database error) rolls the whole transaction back and answers `500`, so Stripe
retries the delivery. A subscription Stripe does not know (`resource_missing`) is
a logged no-op, not an endless retry.

## Behaviour this endpoint implements

- **`checkout.session.completed`** (subscription mode): refreshes the new
  subscription immediately (linking the customer), without waiting for
  `customer.subscription.created`.
- **`checkout.session.completed`** (payment mode): **ignored.** Lifetime is
  closed to new purchases; no one-time purchase can create or change a
  membership.
- **`customer.subscription.created` / `.updated` / `.deleted`** and
  **`invoice.payment_failed`**: refresh that subscription from Stripe as above.
  Stripe's `status` is mapped onto `entitlement_status` (see
  `mapStripeSubscriptionStatus`); tier, period and cancellation fields are
  written onto the row.
- **Payment-failure grace period (7 days)**: the first time a subscription is
  `past_due`, `entitlements.payment_failed_at` is set to the triggering event's
  Stripe time (or, for a read-time refresh with no event, the time we first saw
  it) - and kept, never moved, by later retries (`COALESCE`), so the clock cannot
  restart. Access continues while `now < payment_failed_at + 7 days`
  (`PAYMENT_GRACE_PERIOD_DAYS` in `@tnsi/auth`). When Stripe reports the
  subscription healthy again, `payment_failed_at` is cleared. The decision is
  computed on read.
- **Cancellation**: cancelling in the billing portal sets `cancel_at_period_end`;
  the subscription stays `active` and access continues to the paid-through date
  (`current_period_end`), which the platform also enforces itself, so access does
  not depend on a webhook arriving. Stripe later sends
  `customer.subscription.deleted` (status `canceled`).
- **Read-time reconciliation**: if a Stripe-backed membership's paid period has
  ended but the row still says `active` (a renewal webhook is delayed), the
  platform asks Stripe before deciding access (`getAuthUser`, `getBillingState`;
  `apps/web/src/lib/reconcile-subscription.ts`). If Stripe answers, its answer
  decides immediately. Only if Stripe is genuinely unavailable (a connection
  failure, a Stripe-side error or throttling - not any other error) may access be
  held, until seven days after a valid paid-through date and never without one.
- **The free trial is not a Stripe trial.** It is app-managed
  (`POST /api/v1/billing/trial`): no card, no Stripe customer or subscription is
  created, and when it ends the account is simply Free again. A subscription
  that still arrives as `trialing` (none can be created now) is mapped 1:1.
- An event referencing a Stripe customer id this app has never linked to a user
  is a safe no-op, logged and acknowledged with `200`, never a guess at which
  account to modify.

## Auth

Requests are verified via Stripe's own `stripe.webhooks.constructEvent`
(HMAC, timestamp-tolerant) against the raw request body, before any event data is used (an unverifiable request is answered `400` and never processed) — see
`packages/integrations/src/stripe/verify.ts`. This route is listed in
`apps/web/src/middleware.ts`'s public/ignored routes (alongside
`/api/webhooks/clerk` and `/api/webhooks/sanity`) so Clerk doesn't
intercept it; the Stripe signature is the real authentication for this
endpoint.

## Engineering defaults for checkout (not commercial policy)

Both live in `packages/integrations/src/stripe/checkout-windows.ts`:

- **24-hour reconciliation lookback.** When a member starts a checkout, a
  _completed_ session from the last 24 hours is applied first if the webhook has
  not recorded it. This is a technical lookback only - not an entitlement
  window and not a statement of how long a session stays valid.
- **About 30-minute abandoned-session expiry** (31 minutes requested, Stripe's
  minimum being 30). **Not yet confirmed against real Stripe test-mode
  behaviour; confirm before release.**

## Duplicate-subscription manual-review procedure

A second live paid subscription for one member is never cancelled, refunded or
deleted automatically. It is recorded in the member's
`entitlements.metadata.duplicateStripeSubscriptions` and checkout is paused for
that member (`REVIEW_REQUIRED`, HTTP 409). To resolve it:

1. **Pause** - already automatic: no further checkout can start for the member.
2. **Inspect** the Stripe customer: both subscriptions, their invoices and
   payment states.
3. **Confirm with the customer** which subscription they intend to keep.
4. **Reconcile** the entitlement to the verified Stripe state (the next webhook
   or read-time refresh does this once Stripe is in the intended state).
5. **Cancel or refund** only under the approved billing policy.
6. **Record** the decision and outcome (who, when, what).
7. **Resume**: clear the `duplicateStripeSubscriptions` key for that member
   (a deliberate, logged operator action) so normal checkout is allowed again.

Operational owner for now: the TNSI account owner/operator. **A named backup
must be assigned before launch** - none is named here.

## Test-mode verification still required (not done)

Everything above is verified with simulated Stripe and a local PostgreSQL only.
Before release, with explicitly configured NON-PRODUCTION Stripe test
credentials and a non-production deployment, verify and record:

1. Checkout session creation and retrieval; `{CHECKOUT_SESSION_ID}` is
   substituted in the success URL.
2. Listing a customer's open and completed sessions, and **read-after-write**
   behaviour of the list immediately after a session is created or completed.
3. Expiring an unpaid session; confirm a paid/completed session **cannot** be
   expired and that the error is what the code expects.
4. The abandoned-session expiry time actually applied (the ~30-minute default).
5. An asynchronous payment method: delayed success and delayed failure, and
   what the session and subscription look like meanwhile.
6. Webhook retries, duplicate delivery and out-of-order delivery
   (`stripe events resend`); the row converges to Stripe's current state.
7. Subscription reconciliation: renewal, cancellation through the paid-through
   date, failed payment and the 7-day grace period, and recovery.
8. A second subscription for one customer lands in manual review, unchanged.

## Environment and migration safety

- Never run a database command without proving the target. `packages/db/.env`
  can hold the production URL, and drizzle-kit reads it automatically. Always set
  `TNSI_TEST_DATABASE_URL` (the one variable `drizzle.config.ts` trusts above all
  others) for non-production work, and never let it be unset.
- Migrations `0010` and `0011` are additive and journal-ordered. They are
  applied once by the migration runner; `0011` is **not** safe to re-run by hand
  (its `ADD COLUMN`/`ADD CONSTRAINT` statements fail if they already exist). They
  must be applied before the code that needs them is deployed.
