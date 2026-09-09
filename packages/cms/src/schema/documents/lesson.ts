import { defineField, defineType } from 'sanity';

/**
 * A lesson belongs to one Module and points at the existing content it
 * teaches through - a Practice or an Article - rather than duplicating
 * either one's fields here. The bottom tier of the (not-yet-implemented)
 * Program → Module → Lesson learning hierarchy; holds no learner-facing
 * data (completion, reflection) - those are Phase 13+ decisions.
 *
 * No `slug`: like `practice`/`module`, a lesson isn't a public page of
 * its own yet - nothing routes to it.
 */
export const lesson = defineType({
  name: 'lesson',
  title: 'Lesson',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      type: 'string',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'module',
      type: 'reference',
      to: [{ type: 'module' }],
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'order',
      title: 'Display order',
      type: 'number',
      initialValue: 0,
    }),
    defineField({
      name: 'content',
      title: 'Content',
      description: 'The existing Practice or Article this lesson teaches through.',
      type: 'reference',
      to: [{ type: 'practice' }, { type: 'article' }],
      validation: (r) => r.required(),
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
    select: { title: 'title', subtitle: 'module.title' },
  },
});
