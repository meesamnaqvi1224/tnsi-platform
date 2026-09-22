import { defineField, defineType } from 'sanity';

/**
 * A Somatic Card Series (e.g. "Series 01 — Support, Pressure &
 * Proprioception") - the middle tier of the Collection → Series → Card
 * hierarchy. Genuinely separate from `practice` and `powerDrop`: no
 * field here references either, and none of them reference this. See
 * docs/TNSI_Somatic_Card_Schema_Design_v1.md for the full design
 * reasoning.
 *
 * `collection` is a plain string, not a reference - Collection is
 * deliberately not its own Sanity document in v1 (see the schema design
 * doc's §4). The only value in use today is "core-series".
 */
export const somaticSeries = defineType({
  name: 'somaticSeries',
  title: 'Somatic Series',
  type: 'document',
  fields: [
    defineField({
      name: 'seriesNumber',
      title: 'Series number',
      type: 'number',
      description: 'Editorial identity (e.g. 1 for "Series 01") - not the same as display order.',
      validation: (r) => r.required().integer().positive(),
    }),
    defineField({
      name: 'title',
      type: 'string',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'collection',
      type: 'string',
      description:
        'Which collection this Series belongs to. Plain text, not a reference - the only value in use today is "core-series".',
      initialValue: 'core-series',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'description',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'coreQuestion',
      title: 'Core question',
      type: 'string',
      description:
        'The Series\' authored core question (e.g. "Where am I in my body, and what is supporting me?").',
    }),
    defineField({
      name: 'visualTreatment',
      title: 'Visual treatment',
      type: 'string',
      description:
        'Default visual presentation for Cards in this Series, unless a Card overrides it.',
      options: {
        list: [
          { title: 'Single hero', value: 'singleHero' },
          { title: 'Hero with supporting images', value: 'heroWithSupportingImages' },
          { title: 'Movement sequence', value: 'movementSequence' },
          { title: 'Sensory comparison', value: 'sensoryComparison' },
          { title: 'Custom', value: 'custom' },
        ],
      },
    }),
    defineField({
      name: 'defaultLayout',
      title: 'Default layout',
      type: 'string',
      description:
        "Optional free-text layout hint for Cards in this Series that don't set their own.",
    }),
    defineField({
      name: 'status',
      type: 'string',
      options: {
        list: [
          { title: 'Published', value: 'published' },
          { title: 'Draft', value: 'draft' },
          { title: 'Archived', value: 'archived' },
        ],
        layout: 'radio',
      },
      initialValue: 'draft',
    }),
    defineField({
      name: 'sortOrder',
      title: 'Display order',
      type: 'number',
      description: 'Manual display order within the collection. Lower first.',
      initialValue: 0,
    }),
  ],
  orderings: [
    { title: 'Display order', name: 'orderAsc', by: [{ field: 'sortOrder', direction: 'asc' }] },
  ],
  preview: {
    select: { title: 'title', subtitle: 'coreQuestion' },
  },
});
