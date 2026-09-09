import { defineField, defineType } from 'sanity';

/**
 * PowerDrops™ — short, practical interventions for a specific moment,
 * distinct from `practice` (a library to learn and practise over time).
 * A PowerDrop is consumed in one sitting: read the card, use it, return to
 * life. No progress/duration-tracking fields live here on purpose — see
 * `packages/db/src/schema/power-drop-usages.ts` for the separate, minimal
 * usage-event record this schema is paired with.
 *
 * Content is entered here by the product owner from the approved
 * PowerDrop card deck (Caroline Somatic healing cards PDF) — this schema
 * holds no seeded copy of its own.
 */
export const powerDrop = defineType({
  name: 'powerDrop',
  title: 'PowerDrop',
  type: 'document',
  fields: [
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
      name: 'category',
      type: 'string',
      description:
        'Controlled product taxonomy for browsing/filtering — leave unset if the source card does not clearly fit one of these. Do not guess a category for a card that has none.',
      options: {
        list: [
          { title: 'Regulation', value: 'Regulation' },
          { title: 'Grounding', value: 'Grounding' },
          { title: 'Release', value: 'Release' },
          { title: 'Focus', value: 'Focus' },
          { title: 'Transition', value: 'Transition' },
          { title: 'Boundaries', value: 'Boundaries' },
          { title: 'Connection', value: 'Connection' },
          { title: 'Reflection', value: 'Reflection' },
        ],
      },
    }),
    defineField({
      name: 'description',
      type: 'text',
      rows: 3,
      description: 'The short line under the card title (e.g. "Come back to yourself.").',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'cardImage',
      title: 'Card image',
      type: 'image',
      options: { hotspot: true },
      description:
        'The PowerDrop card artwork. Shown as-is in the app — this is a real content asset, not something the app recreates as native text.',
      fields: [defineField({ name: 'alt', type: 'string', title: 'Alt text' })],
    }),
    defineField({
      name: 'duration',
      type: 'string',
      description:
        'Free-text duration as given on the card (e.g. "90 seconds"). Leave blank if the card states none.',
    }),
    defineField({
      name: 'focus',
      type: 'string',
      description:
        'The card\'s own "Purpose" label (e.g. "Regulation", "Mental Unload", "Authenticity").',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'instructions',
      title: 'How to',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'The card\'s "HOW TO" steps, in order.',
    }),
    defineField({
      name: 'anchorStatement',
      type: 'string',
      description: 'The quoted anchor line on the card (e.g. "I return to myself.").',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'featured',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'sortOrder',
      type: 'number',
      description: 'Manual display order within the library. Lower first.',
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
  preview: {
    select: { title: 'title', subtitle: 'focus', media: 'cardImage' },
  },
});
