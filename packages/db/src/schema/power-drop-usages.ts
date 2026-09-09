import { pgTable, uuid, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';

/**
 * A record of a member using a PowerDrop — deliberately separate from
 * `practiceCompletions` (a PowerDrop is not a Practice; see
 * packages/cms/src/schema/documents/powerDrop.ts). PowerDrop content
 * itself lives in Sanity, not Postgres, so this stores Sanity's own
 * document `_id` (`powerDropId`) rather than a Postgres foreign key -
 * that `_id` is immutable for the life of the document, unlike its
 * `slug`, so historical usage rows stay unambiguous even if a PowerDrop
 * is later renamed/re-slugged. `powerDropSlug` is kept alongside it
 * purely for human-readable debugging/reporting - the `_id` is the
 * identifier queries should key off. No streaks, points, or completion
 * percentage — a member simply uses the same drop again later, and each
 * use is its own row.
 */
export const powerDropUsages = pgTable(
  'power_drop_usages',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    powerDropId: text('power_drop_id').notNull(),

    powerDropSlug: text('power_drop_slug').notNull(),

    usedAt: timestamp('used_at', { withTimezone: true }).notNull().defaultNow(),

    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    idxPowerDropUsagesUserPowerDrop: index('idx_power_drop_usages_user_power_drop').on(
      table.userId,
      table.powerDropId,
    ),
    idxPowerDropUsagesUserUsedAt: index('idx_power_drop_usages_user_used_at').on(
      table.userId,
      table.usedAt,
    ),
  }),
);

export type PowerDropUsage = typeof powerDropUsages.$inferSelect;
export type NewPowerDropUsage = typeof powerDropUsages.$inferInsert;
