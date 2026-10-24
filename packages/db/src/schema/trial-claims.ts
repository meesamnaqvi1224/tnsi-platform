import { pgTable, text, uuid, smallint, timestamp, index, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * The durable record that a person has had their one free trial - the
 * authority for "one trial per verified, normalised email address"
 * (Regulation Suite membership policy, amended 14 Oct 2026).
 *
 * The primary key IS the eligibility check. A claim is made with
 * `INSERT ... ON CONFLICT (email_key) DO NOTHING` inside the same
 * transaction that sets the entitlement's trial dates, so two simultaneous
 * attempts for the same email cannot both succeed - the database decides,
 * not application code.
 *
 * `email_key` is NEVER an email address and never an unsalted hash of one:
 * it is the hex HMAC-SHA-256 of the normalised (Unicode NFKC, trimmed,
 * lowercased) verified email, keyed with a dedicated server-side secret. A
 * leaked copy of this table therefore cannot be reversed against a list of
 * candidate addresses without that secret. Neither the raw email nor the
 * key may be logged. Normalisation deliberately does not strip plus tags or
 * Gmail dots, so an alternate address can claim another trial - accepted.
 *
 * Deliberately has NO foreign key to `users`, so a claim outlives account
 * deletion and re-registration (a deleted-and-recreated account must not
 * earn a second trial). `user_id` is informational, for support lookups
 * only, and is not constrained.
 *
 * `key_version` records which secret version derived `email_key`. Changing
 * the secret changes every derivable key, so rotation must keep the previous
 * secret available and check an email against every still-active version
 * (new claims use the current one); dropping an old version without
 * re-keying would silently make its claimants eligible again.
 */
export const trialClaims = pgTable(
  'trial_claims',
  {
    emailKey: text('email_key').primaryKey(),

    keyVersion: smallint('key_version').notNull().default(1),

    userId: uuid('user_id'),

    claimedAt: timestamp('claimed_at', { withTimezone: true }).notNull().defaultNow(),

    trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }).notNull(),
  },
  (table) => ({
    idxTrialClaimsUser: index('idx_trial_claims_user').on(table.userId),
    // 32-byte HMAC-SHA-256 as lowercase hex - rejects a raw email or any
    // other value being written into the key column by mistake.
    emailKeyFormat: check(
      'trial_claims_email_key_format',
      sql`${table.emailKey} ~ '^[0-9a-f]{64}$'`,
    ),
  }),
);

export type TrialClaim = typeof trialClaims.$inferSelect;
export type NewTrialClaim = typeof trialClaims.$inferInsert;
