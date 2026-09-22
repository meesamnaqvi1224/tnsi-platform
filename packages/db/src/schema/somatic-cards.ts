import { pgTable, uuid, text, integer, timestamp, jsonb, unique, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { somaticPublicationStatusEnum } from './enums';
import { somaticSeries } from './somatic-series';

/**
 * A Somatic Card - a genuinely separate domain from `practices` and
 * `powerDrop`/`power_drop_usages` (see
 * docs/TNSI_PowerDrops_Somatic_Cards_Relationship_Audit.md). No column
 * here references, or is referenced by, either of those systems.
 *
 * `seriesId` is `onDelete: 'restrict'`, not `cascade` (unlike
 * `practice_saves` → `practices`): a Series delete must never silently
 * take its Cards with it - the normal editorial lifecycle for retiring
 * a Card is `status = 'archived'`, not a destructive delete.
 *
 * `collection` is a deliberate denormalization from `somatic_series.collection`,
 * kept in sync by whatever future process upserts a Card row (the sync
 * layer, not implemented in this milestone) - not an independently
 * editable field. It exists solely so `(collection, card_number)`
 * uniqueness - a locked product requirement ("cardNumber must be unique
 * within a Collection, not globally") - can be a real, single-table
 * Postgres `unique` constraint. Collection itself is still not a
 * database entity (see `somatic-series.ts`'s own comment); Postgres has
 * no cross-table constraint mechanism (short of a trigger, which no
 * table in this codebase uses) to keep this column consistent with its
 * Series' `collection` value - that consistency is a sync-layer
 * responsibility, not something this schema can enforce by itself.
 *
 * Structured content fields (`invitation`, `purpose`, `description`,
 * `orientation`, `gentleNote`, `anchor`) are plain nullable `text`
 * columns, not Portable Text - matches every short authored-line field
 * elsewhere in this codebase (`powerDrop.anchorStatement`,
 * `powerDrop.description`), never the `blockContent` object reserved
 * for Article's long-form body. Nullable, matching how `practices`'
 * own flattened content columns (`description`, `category`) are
 * nullable rather than assuming content is always fully authored by the
 * time a row is synced (e.g. a `draft`-status Card may not have every
 * field filled in yet).
 *
 * `practiceSteps`, `whatToNotice`, `supportingImages`,
 * `demonstrationSequence` are `jsonb`, following `practices.sanityData`'s
 * precedent for variable-length/structured content that Postgres never
 * needs to query into - not normalized child tables (see
 * docs/TNSI_Somatic_Card_Schema_Design_v1.md §11 for the full reasoning).
 * Each defaults to an empty JSON array rather than being nullable,
 * mirroring `practices.tags`' `.default(sql\`'{}'\`)` pattern - "no
 * items yet" is a normal, expected state (the architecture is explicit
 * that not every Card has supporting images or demonstration frames),
 * not an error state requiring null-checking downstream.
 *
 * Shape validation for the four jsonb columns lives in
 * `@tnsi/validation`'s somatic-card schemas, applied before persistence
 * by whatever future code writes to this table (the sync layer) - not
 * enforced by Postgres itself, consistent with how `sanityData`'s shape
 * is trusted-not-constrained elsewhere in this codebase too.
 */
export const somaticCards = pgTable(
  'somatic_cards',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    sanityId: text('sanity_id').notNull(),

    cardNumber: integer('card_number').notNull(),

    title: text('title').notNull(),

    slug: text('slug').notNull(),

    seriesId: uuid('series_id')
      .notNull()
      .references(() => somaticSeries.id, { onDelete: 'restrict' }),

    collection: text('collection').notNull(),

    status: somaticPublicationStatusEnum('status').notNull().default('draft'),

    sortOrder: integer('sort_order').notNull().default(0),

    invitation: text('invitation'),

    purpose: text('purpose'),

    description: text('description'),

    orientation: text('orientation'),

    gentleNote: text('gentle_note'),

    anchor: text('anchor'),

    visualTreatment: text('visual_treatment'),

    cardArtworkUrl: text('card_artwork_url'),

    cardArtworkAlt: text('card_artwork_alt'),

    heroImageUrl: text('hero_image_url'),

    heroImageAlt: text('hero_image_alt'),

    practiceSteps: jsonb('practice_steps')
      .notNull()
      .default(sql`'[]'::jsonb`),

    whatToNotice: jsonb('what_to_notice')
      .notNull()
      .default(sql`'[]'::jsonb`),

    supportingImages: jsonb('supporting_images')
      .notNull()
      .default(sql`'[]'::jsonb`),

    demonstrationSequence: jsonb('demonstration_sequence')
      .notNull()
      .default(sql`'[]'::jsonb`),

    sanityData: jsonb('sanity_data').notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),

    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueSomaticCardsSanityId: unique('unique_somatic_cards_sanity_id').on(table.sanityId),
    uniqueSomaticCardsSlug: unique('unique_somatic_cards_slug').on(table.slug),
    uniqueSomaticCardsCollectionCardNumber: unique(
      'unique_somatic_cards_collection_card_number',
    ).on(table.collection, table.cardNumber),
    idxSomaticCardsSeriesStatus: index('idx_somatic_cards_series_status').on(
      table.seriesId,
      table.status,
    ),
    idxSomaticCardsSeriesSort: index('idx_somatic_cards_series_sort').on(
      table.seriesId,
      table.sortOrder,
    ),
  }),
);

export type SomaticCard = typeof somaticCards.$inferSelect;
export type NewSomaticCard = typeof somaticCards.$inferInsert;
