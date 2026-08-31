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
  entitlement `past_due`. Usually redundant with a concurrent
  `customer.subscription.updated`, but handled explicitly since a failed
  payment is one of this endpoint's required scenarios.
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
