import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';

/**
 * A member's first-use acknowledgement for My Reflections (decision Q1, 16 Nov 2026): a separate,
 * affirmative step before the first reflection is written, NOT bundled with the Terms. One row per
 * member holding the CURRENT state: the notice version they accepted, when, and when (if ever) they
 * withdrew. Writing (creating or changing a reflection) requires a row whose version is the current
 * one and which has not been withdrawn; reading and deleting never require it.
 *
 * This table records that a member acknowledged a notice. It holds no journal text and no email.
 *
 * LEGAL: the wording of the notice, the Article 6 / Article 9 basis it relies on, what withdrawal
 * means, and whether a history of past versions must be kept are NOT decided - see
 * docs/my-reflections-consent.md. One row means an earlier version's record is replaced when the member
 * accepts a newer one; if legal needs the history, that is an additive follow-up.
 *
 * Its own table (not a `users` column) for the same reason as `account_deletion_requests`: every
 * authenticated request reads `users`, so a deployment that runs ahead of its migration must not break
 * sign-in. Only the journal routes read this table, and they fail closed.
 */
export const journalConsents = pgTable('journal_consents', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),

  /** The notice version the member accepted (see JOURNAL_CONSENT_VERSION in @tnsi/core). */
  policyVersion: text('policy_version').notNull(),

  consentedAt: timestamp('consented_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),

  /** Set when the member withdraws permission to write; cleared when they accept again. */
  withdrawnAt: timestamp('withdrawn_at', { withTimezone: true }),
});

export type JournalConsent = typeof journalConsents.$inferSelect;
