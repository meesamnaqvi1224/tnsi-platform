import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  unique,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { practiceContentTypeEnum } from './enums';

export const practices = pgTable(
  'practices',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    sanityId: text('sanity_id').notNull(),

    title: text('title').notNull(),

    description: text('description'),

    contentType: practiceContentTypeEnum('content_type').notNull(),

    mediaUrl: text('media_url'),

    thumbnailUrl: text('thumbnail_url'),

    durationSeconds: integer('duration_seconds'),

    category: text('category'),

    tags: text('tags')
      .array()
      .notNull()
      .default(sql`'{}'`),

    difficulty: integer('difficulty').notNull().default(1),

    sanityData: jsonb('sanity_data').notNull(),

    isPublished: boolean('is_published').notNull().default(true),

    // Editorial access flag, mirrored from the Sanity `practice` document's
    // `freeAccess` field. Only consulted once Regulation Suite™ membership
    // is open (see `isMembershipOpen` in the web app): then free members
    // get the practices flagged here and paid members get the full library.
    // Defaults to false — nothing is "free" until editorial designates it.
    isFree: boolean('is_free').notNull().default(false),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),

    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniquePracticesSanityId: unique('unique_practices_sanity_id').on(table.sanityId),
    idxPracticesCategory: index('idx_practices_category').on(table.category),
    idxPracticesContentType: index('idx_practices_content_type').on(table.contentType),
    idxPracticesPublished: index('idx_practices_published').on(table.isPublished),
    difficultyRange: check('practices_difficulty_range', sql`${table.difficulty} BETWEEN 1 AND 3`),
  }),
);

export type Practice = typeof practices.$inferSelect;
export type NewPractice = typeof practices.$inferInsert;
