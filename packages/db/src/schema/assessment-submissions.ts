import { pgTable, uuid, text, jsonb, real, timestamp, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';

/**
 * A single response to an assessment. Generic across every assessment the
 * Sanity `assessment` document type can define — see
 * docs/04-information-architecture.md's Assessment Centre (Capacity
 * Assessment is the first of several planned assessments), and
 * ARCHITECTURE.md's CMS-scope decision: the assessment definition itself
 * (questions, scoring rules, result copy) is Sanity's editorial content;
 * individual submissions are per-user/transactional and live here.
 */
export const assessmentSubmissions = pgTable(
  'assessment_submissions',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    /**
     * Which assessment this answers. Deliberately a plain string, not an
     * enum or a foreign key: the assessment catalog lives in Sanity, not
     * Postgres, and a fixed enum would need a migration every time a new
     * assessment is added — exactly what this repo's multi-assessment
     * direction is meant to avoid.
     */
    assessmentSlug: text('assessment_slug').notNull(),

    /**
     * The submitter's email. Required and independent of `userId`: Capacity
     * Assessment is a public, unauthenticated lead-generation tool per
     * docs/04's Visitor role ("take assessment" is listed for Visitor, not
     * only Member), so most submissions will have no account at all.
     */
    email: text('email').notNull(),

    /**
     * Raw submitted answers, keyed by question identifier. Shape is owned
     * by whichever assessment `assessmentSlug` refers to — not something
     * this column can usefully constrain further than "an object".
     */
    answers: jsonb('answers').$type<Record<string, unknown>>().notNull(),

    /** Computed by packages/core's scoring engine at submission time. Nullable: this table doesn't assume scoring always happens synchronously before insert. */
    score: real('score'),

    /** The matching result tier's key from the assessment definition, or null if none matched. */
    resultTier: text('result_tier'),

    /**
     * Nullable by design, and deliberately not populated by anything yet.
     * No anonymous-submission-to-account linking mechanism has been decided
     * (an open product/technical question, not an oversight) — this column
     * exists so that mechanism has somewhere to write once it's designed,
     * not to imply how or when it will run.
     */
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    idxAssessmentSubmissionsEmail: index('idx_assessment_submissions_email').on(table.email),
    idxAssessmentSubmissionsSlug: index('idx_assessment_submissions_assessment_slug').on(
      table.assessmentSlug,
    ),
    idxAssessmentSubmissionsUser: index('idx_assessment_submissions_user').on(table.userId),
  }),
);

export type AssessmentSubmission = typeof assessmentSubmissions.$inferSelect;
export type NewAssessmentSubmission = typeof assessmentSubmissions.$inferInsert;
