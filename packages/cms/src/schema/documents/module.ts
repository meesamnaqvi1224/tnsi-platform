import { defineField, defineType } from 'sanity';

/**
 * A module belongs to one Program and orders a set of Lessons underneath
 * it - the middle tier of the (not-yet-implemented) Program → Module →
 * Lesson learning hierarchy. This document intentionally holds no
 * learner-facing data (completion, enrollment, progress) - those are
 * Phase 13+ decisions (Sanity-vs-Postgres responsibility not yet made).
 * This is a content-modeling foundation only.
 *
 * No `slug`: like `practice`, a module isn't a public page of its own -
 * nothing routes to it yet. The relationship to its lessons is the
 * reverse of `lesson.module` (a lesson points at its module) rather than
 * an array field here, so ordering/membership only ever needs updating in
 * one place.
 */
export const module = defineType({
  name: 'module',
  title: 'Module',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      type: 'string',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'program',
      title: 'Programme',
      type: 'reference',
      to: [{ type: 'program' }],
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'order',
      title: 'Display order',
      type: 'number',
      initialValue: 0,
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
    }),
  ],
  orderings: [
    { title: 'Display order', name: 'orderAsc', by: [{ field: 'order', direction: 'asc' }] },
  ],
  preview: {
    select: { title: 'title', subtitle: 'program.title' },
  },
});
