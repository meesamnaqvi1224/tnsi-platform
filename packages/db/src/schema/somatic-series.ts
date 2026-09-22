import { pgTable, uuid, text, integer, timestamp, jsonb, unique, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { somaticPublicationStatusEnum } from './enums';

/**
 * A Somatic Card Series (e.g. "Series 01 — Support, Pressure &
 * Proprioception") - a genuinely separate domain from `practices` and
 * `powerDrop`/`power_drop_usages` (see
 * docs/TNSI_PowerDrops_Somatic_Cards_Relationship_Audit.md and
 * docs/TNSI_Somatic_Card_Schema_Design_v1.md - no table here references,
 * or is referenced by, either of those). Synced from Sanity the same way
 * `practices` is: `sanityId` is the idempotent upsert key, `sanityData`
 * is the full raw document as an escape hatch for anything not
 * flattened into its own column.
 *
 * `collection` is a plain string, not a foreign key - Collection is
 * deliberately not a database entity in v1 (see the schema design doc's
 * §4); the only value in use today is `"core-series"`. `cardNumber`
 * uniqueness on the future `somatic_cards` table is scoped to
 * `(collection, cardNumber)` for the same reason.
 */
export const somaticSeries = pgTable(
  'somatic_series',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    sanityId: text('sanity_id').notNull(),

    seriesNumber: integer('series_number').notNull(),

    title: text('title').notNull(),

    slug: text('slug').notNull(),

    collection: text('collection').notNull(),

    description: text('description'),

    coreQuestion: text('core_question'),

    visualTreatment: text('visual_treatment'),

    defaultLayout: text('default_layout'),

    status: somaticPublicationStatusEnum('status').notNull().default('draft'),

    sortOrder: integer('sort_order').notNull().default(0),

    sanityData: jsonb('sanity_data').notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),

    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueSomaticSeriesSanityId: unique('unique_somatic_series_sanity_id').on(table.sanityId),
    uniqueSomaticSeriesSlug: unique('unique_somatic_series_slug').on(table.slug),
    uniqueSomaticSeriesCollectionNumber: unique(
      'unique_somatic_series_collection_series_number',
    ).on(table.collection, table.seriesNumber),
    idxSomaticSeriesCollectionStatus: index('idx_somatic_series_collection_status').on(
      table.collection,
      table.status,
    ),
    idxSomaticSeriesCollectionSort: index('idx_somatic_series_collection_sort').on(
      table.collection,
      table.sortOrder,
    ),
  }),
);

export type SomaticSeries = typeof somaticSeries.$inferSelect;
export type NewSomaticSeries = typeof somaticSeries.$inferInsert;
