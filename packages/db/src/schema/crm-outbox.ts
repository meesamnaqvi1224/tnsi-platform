import { pgTable, uuid, text, jsonb, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * Durable queue of changes to push to the CRM (Flowi). A website form is stored
 * here in the SAME transaction as the visitor's own submission, so it can never
 * be lost because the CRM was slow, down or misconfigured; a worker then sends
 * it with retries. The CRM is a mirror for the team to work from: nothing in
 * this table decides anyone's access, and a CRM change never flows back.
 *
 * `payload` holds exactly what will be sent (contact fields and tags) and must
 * never hold secrets. `last_error` is an error CLASS or HTTP status only - never
 * text copied from a provider response, which can echo request parameters.
 *
 * Statuses: `pending` (waiting, possibly for a retry), `sending` (claimed by a
 * worker until `locked_until`; a crashed worker's claim simply expires),
 * `sent`, and `failed` (gave up: too many attempts, or a permanent rejection
 * that retrying cannot fix - left here for a person to look at).
 */
export const crmOutbox = pgTable(
  'crm_outbox',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    /** Which form or event produced this: `contact_form`, `newsletter`, `assessment`. */
    kind: text('kind').notNull(),

    email: text('email').notNull(),

    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),

    status: text('status').notNull().default('pending'),

    /**
     * The Flowi contact this row's upsert produced. Saved as soon as the upsert
     * succeeds, so if adding the tags then fails, the retry only re-adds tags and
     * does not repeat the upsert (and whatever Flowi does on a contact update).
     */
    contactId: text('contact_id'),

    attempts: integer('attempts').notNull().default(0),

    nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }).notNull().defaultNow(),

    lockedUntil: timestamp('locked_until', { withTimezone: true }),

    lastError: text('last_error'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),

    sentAt: timestamp('sent_at', { withTimezone: true }),
  },
  (table) => ({
    // The worker's one query: due rows that are waiting, oldest first.
    idxCrmOutboxDue: index('idx_crm_outbox_due').on(table.status, table.nextAttemptAt),
  }),
);

export type CrmOutboxRow = typeof crmOutbox.$inferSelect;
export type NewCrmOutboxRow = typeof crmOutbox.$inferInsert;
