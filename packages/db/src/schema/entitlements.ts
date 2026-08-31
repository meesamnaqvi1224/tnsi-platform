import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  jsonb,
  unique,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';
import { entitlementTierEnum, entitlementStatusEnum } from './enums';

export const entitlements = pgTable(
  'entitlements',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    tier: entitlementTierEnum('tier').notNull().default('free'),

    status: entitlementStatusEnum('status').notNull().default('active'),

    programs: text('programs')
      .array()
      .notNull()
      .default(sql`'{}'`),

    certifications: text('certifications')
      .array()
      .notNull()
      .default(sql`'{}'`),

    features: text('features')
      .array()
      .notNull()
      .default(sql`'{}'`),

    stripeCustomerId: text('stripe_customer_id'),

    stripeSubscriptionId: text('stripe_subscription_id'),

    currentPeriodStart: timestamp('current_period_start', {
      withTimezone: true,
    }),

    currentPeriodEnd: timestamp('current_period_end', {
      withTimezone: true,
    }),

    cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),

    canceledAt: timestamp('canceled_at', { withTimezone: true }),

    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),

    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId] }),
    // Unique, not just indexed: a Stripe customer/subscription must never
    // resolve to more than one of our users — that's the exact invariant
    // the webhook path depends on when it looks up "which user does this
    // event belong to" by these ids. Postgres unique indexes permit
    // multiple NULLs, so this doesn't constrain the (common) rows that
    // have never had a Stripe customer at all.
    uniqueEntitlementsStripeCustomer: unique('unique_entitlements_stripe_customer').on(
      table.stripeCustomerId,
    ),
    uniqueEntitlementsStripeSubscription: unique('unique_entitlements_stripe_subscription').on(
      table.stripeSubscriptionId,
    ),
  }),
);

export type Entitlement = typeof entitlements.$inferSelect;
export type NewEntitlement = typeof entitlements.$inferInsert;
