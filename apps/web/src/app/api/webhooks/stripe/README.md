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
events — this endpoint reads directly from Stripe's own event object shape
via the `stripe` SDK's types, not a custom projection.

## Checkout Session requirements

For the webhook to be able to link a completed checkout back to a TNSI
user, `apps/web/src/app/api/v1/billing/checkout/route.ts` sets
`metadata.userId` on every Checkout Session it creates. If a Checkout
Session is ever created by some other path without that metadata field,
this webhook safely skips it (see `planForCheckoutSessionCompleted` in
`packages/integrations/src/stripe/sync-plan.ts`) rather than guessing which
user it belongs to.

## Behaviour this endpoint implements

- **`checkout.session.completed`** (subscription mode): links the Stripe
  customer id to the purchasing user's `entitlements` row. The subscription
  itself is not yet authoritative at this point — `customer.subscription.created`
  (which Stripe sends around the same time) carries the actual
  status/price/period and is what grants access.
- **`checkout.session.completed`** (payment mode — the `lifetime` tier,
  which has no recurring price): grants `tier: lifetime`, `status: active`
  immediately once `payment_status` is `paid`.
- **`customer.subscription.created` / `.updated` / `.deleted`**: the single
  source of truth for a subscription's ongoing state. Maps Stripe's
  subscription `status` onto this repo's `entitlement_status` enum (see
  `mapStripeSubscriptionStatus`) and writes tier, status, period, and
  cancellation fields onto the `entitlements` row matched by
  `stripe_customer_id`. A `.deleted` event is handled by the same mapping —
  Stripe reports its `status` as `canceled`.
- **`invoice.payment_failed`**: defensively marks the associated customer's
  entitlement `past_due` and records the failure time. Usually redundant with
  a concurrent `customer.subscription.updated`, but handled explicitly since a
  failed payment is one of this endpoint's required scenarios.
- **Payment-failure grace period (7 days)**: the first time a subscription
  goes `past_due` (via either event above), `entitlements.payment_failed_at`
  is set to Stripe's own event time — and kept, never moved, by later retry
  failures (`COALESCE`), so the clock cannot restart. Membership access
  continues while `now < payment_failed_at + 7 days`
  (`PAYMENT_GRACE_PERIOD_DAYS` in `@tnsi/auth`); after that the existing
  inactive rule applies. When Stripe reports the subscription `active` or
  `trialing` again, `payment_failed_at` is cleared. The decision is computed
  on read, so nothing needs to "expire" the grace period.
- **Trial**: a subscription started with a 30-day trial arrives as status
  `trialing` (mapped 1:1, paid access). When the trial ends Stripe moves it
  to `active` (or `past_due` if the first payment fails) via
  `customer.subscription.updated` — no extra event is needed.
- **Cancellation**: cancelling in the billing portal sets
  `cancel_at_period_end`; the subscription stays `active` (access continues)
  until the paid period ends, when Stripe sends `customer.subscription.deleted`
  (status `canceled`).
- Every write is a plain `UPDATE ... WHERE`, never an insert — the
  `entitlements` row already exists for every user (created with the
  `free` tier on `user.created`, see
  `packages/auth/src/sync/user.ts`'s `DEFAULT_ENTITLEMENTS`). Replaying the
  same event twice therefore always converges to the same row state; there
  is no event-id tracking table because none is needed for correctness.
- An event referencing a Stripe customer id this app has never linked to a
  user (or a checkout session whose `userId` metadata doesn't match a real
  user) is a safe no-op, logged and acknowledged with `200`, never a guess
  at which account to modify.

## Auth

Requests are verified via Stripe's own `stripe.webhooks.constructEvent`
(HMAC, timestamp-tolerant) against the raw request body — see
`packages/integrations/src/stripe/verify.ts`. This route is listed in
`apps/web/src/middleware.ts`'s public/ignored routes (alongside
`/api/webhooks/clerk` and `/api/webhooks/sanity`) so Clerk doesn't
intercept it; the Stripe signature is the real authentication for this
endpoint.
