import { defineField, defineType } from 'sanity';

/**
 * Editorial source for a practice (an audio/video/meditation/breathwork/
 * movement/journal exercise). Fields are a direct 1:1 mirror of the
 * existing `practices` table (packages/db/src/schema/practices.ts) and its
 * `practice_content_type` enum — nothing here goes beyond what that
 * existing Postgres/API contract already expects.
 *
 * No `slug`, `author`, or `seo` fields: practices aren't public pages the
 * way articles/programs are, and Postgres has no columns for them.
 *
 * This schema establishes the editorial source. A Sanity → Postgres sync
 * exists via the `/api/webhooks/sanity` webhook
 * (apps/web/src/lib/sync-practice.ts, packages/cms/src/webhook/sync-plan.ts)
 * — publishing or unpublishing a practice document here updates the
 * `practices` table automatically.
 */
export const practice = defineType({
  name: 'practice',
  title: 'Practice',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      type: 'string',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'description',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'contentType',
      title: 'Content type',
      type: 'string',
      options: {
        list: [
          { title: 'Audio', value: 'audio' },
          { title: 'Video', value: 'video' },
          { title: 'Meditation', value: 'meditation' },
          { title: 'Breathwork', value: 'breathwork' },
          { title: 'Movement', value: 'movement' },
          { title: 'Journal', value: 'journal' },
        ],
      },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'mediaUrl',
      title: 'Media URL',
      type: 'url',
      description:
        'Direct link to the audio/video file. Whether this becomes a native Sanity asset or a Mux asset is a future decision (ARCHITECTURE.md defers Mux) — a plain URL matches what Postgres already stores.',
    }),
    defineField({
      name: 'thumbnailUrl',
      title: 'Thumbnail URL',
      type: 'url',
    }),
    defineField({
      name: 'durationSeconds',
      title: 'Duration (seconds)',
      type: 'number',
      validation: (r) => r.min(0),
    }),
    defineField({
      name: 'category',
      type: 'string',
      description:
        'Free text — matches the existing free-text `category` column in Postgres. No fixed category list exists yet; do not invent one here.',
    }),
    defineField({
      name: 'tags',
      type: 'array',
      of: [{ type: 'string' }],
    }),
    defineField({
      name: 'difficulty',
      type: 'number',
      initialValue: 1,
      validation: (r) => r.min(1).max(3),
    }),
    defineField({
      name: 'status',
      type: 'string',
      options: {
        list: [
          { title: 'Published', value: 'published' },
          { title: 'Draft', value: 'draft' },
        ],
        layout: 'radio',
      },
      initialValue: 'published',
      description: 'Maps to the `is_published` flag on the Postgres row once a sync exists.',
    }),
  ],
  preview: {
    select: { title: 'title', subtitle: 'contentType' },
  },
});
