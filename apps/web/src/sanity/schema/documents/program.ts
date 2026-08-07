import { defineField, defineType } from 'sanity';

export const program = defineType({
  name: 'program',
  title: 'Program',
  type: 'document',
  groups: [
    { name: 'content', title: 'Content', default: true },
    { name: 'meta', title: 'Meta & SEO' },
  ],
  fields: [
    defineField({
      name: 'title',
      type: 'string',
      group: 'content',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'slug',
      type: 'slug',
      group: 'content',
      options: { source: 'title', maxLength: 96 },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'audience',
      title: 'Best for',
      type: 'string',
      description: 'e.g. "Individuals", "Professionals", "Organisations".',
      group: 'content',
    }),
    defineField({
      name: 'overview',
      title: 'Overview',
      type: 'text',
      rows: 3,
      group: 'content',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'heroImage',
      type: 'image',
      group: 'content',
      options: { hotspot: true },
      fields: [{ name: 'alt', type: 'string', title: 'Alt text' }],
    }),
    defineField({ name: 'format', type: 'string', group: 'content' }),
    defineField({ name: 'duration', type: 'string', group: 'content' }),
    defineField({ name: 'outcome', type: 'string', group: 'content' }),
    defineField({
      name: 'ctaLabel',
      title: 'Call-to-action label',
      type: 'string',
      initialValue: 'Explore Program',
      group: 'content',
    }),
    defineField({
      name: 'ctaHref',
      title: 'Call-to-action link',
      type: 'string',
      description: 'Path this program links to, e.g. /programs/practitioner-certification.',
      group: 'content',
    }),
    defineField({
      name: 'order',
      title: 'Display order',
      type: 'number',
      group: 'meta',
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
      group: 'meta',
    }),
    defineField({ name: 'seo', type: 'seo', group: 'meta' }),
  ],
  orderings: [
    { title: 'Display order', name: 'orderAsc', by: [{ field: 'order', direction: 'asc' }] },
  ],
  preview: { select: { title: 'title', subtitle: 'audience', media: 'heroImage' } },
});
