import { defineArrayMember, defineField, defineType } from 'sanity';

/**
 * A Somatic Card - the bottom tier of the Collection → Series → Card
 * hierarchy, with its own structured content and visual assets.
 * Genuinely separate from `practice` and `powerDrop`: no field here
 * references either, and no Card-to-PowerDrop or Card-to-Practice
 * relationship is established (see
 * docs/TNSI_PowerDrops_Somatic_Cards_Relationship_Audit.md and
 * docs/TNSI_Somatic_Card_Schema_Design_v1.md).
 *
 * Structured content fields (`invitation`, `purpose`, `description`,
 * `orientation`, `gentleNote`, `anchor`) are plain string/text fields,
 * not `blockContent` - that Portable Text object is reserved for
 * Article's long-form body elsewhere in this schema set; these are all
 * short, single-register authored lines, the same register as
 * `powerDrop`'s `focus`/`anchorStatement`/`description` fields.
 *
 * The finished artwork (`cardArtwork`) is an associated visual asset,
 * not the source of the textual content - every structured field above
 * is independently authored and independently required to exist for
 * accessibility/search/future-reuse, per the approved architecture.
 */
export const somaticCard = defineType({
  name: 'somaticCard',
  title: 'Somatic Card',
  type: 'document',
  fields: [
    defineField({
      name: 'cardNumber',
      title: 'Card number',
      type: 'number',
      description:
        'Editorial identity (e.g. 1 for "Card 1") - not the same as display order. Unique within the Series\' collection.',
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
      name: 'series',
      type: 'reference',
      to: [{ type: 'somaticSeries' }],
      description:
        'The Series this Card belongs to. The full Series object is never duplicated here - only this reference.',
      validation: (r) => r.required(),
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
      description: 'Manual display order within the Series. Lower first.',
      initialValue: 0,
    }),

    // Structured content - the authored source of truth. The card
    // artwork below is a presentation of this content, never a
    // replacement for it.
    defineField({
      name: 'invitation',
      type: 'text',
      rows: 3,
      description: 'The primary invitation/opening line.',
    }),
    defineField({
      name: 'purpose',
      type: 'text',
      rows: 3,
      description: "Why this practice/card exists, in Caroline's authored language.",
    }),
    defineField({
      name: 'description',
      type: 'text',
      rows: 3,
      description:
        'A general, neutral summary of the card - distinct from Purpose (the authored "why").',
    }),
    defineField({
      name: 'orientation',
      type: 'string',
      description:
        'Free-text orientation/image-direction note where applicable (e.g. "seated", "standing"). Not a controlled clinical taxonomy.',
    }),
    defineField({
      name: 'practiceSteps',
      title: 'Practice steps',
      type: 'array',
      description: 'Ordered, variable-length - no fixed minimum or maximum number of steps.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'practiceStep',
          fields: [
            defineField({
              name: 'order',
              type: 'number',
              description: 'Explicit step order - never inferred from array position alone.',
              validation: (r) => r.required().integer().min(0),
            }),
            defineField({
              name: 'label',
              type: 'string',
              description: 'Optional short title for this step.',
            }),
            defineField({
              name: 'instruction',
              type: 'text',
              rows: 2,
              validation: (r) => r.required(),
            }),
          ],
          preview: {
            select: { title: 'label', subtitle: 'instruction' },
          },
        }),
      ],
    }),
    defineField({
      name: 'whatToNotice',
      title: 'What to notice',
      type: 'array',
      description:
        'An ordered collection of observations/prompts - illustrative, not a clinical taxonomy.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'noticePrompt',
          fields: [
            defineField({
              name: 'order',
              type: 'number',
              description: 'Explicit order - never inferred from array position alone.',
              validation: (r) => r.required().integer().min(0),
            }),
            defineField({
              name: 'text',
              type: 'text',
              rows: 2,
              validation: (r) => r.required(),
            }),
          ],
          preview: {
            select: { title: 'text' },
          },
        }),
      ],
    }),
    defineField({
      name: 'gentleNote',
      title: 'Gentle note',
      type: 'text',
      rows: 3,
      description:
        "Preserve Caroline's wording exactly when importing existing content - do not rewrite it.",
    }),
    defineField({
      name: 'anchor',
      type: 'string',
      description: 'The quoted anchor line - not a marketing tagline.',
    }),

    // Visual treatment + assets - associated presentation, independent
    // of the structured content above.
    defineField({
      name: 'visualTreatment',
      title: 'Visual treatment',
      type: 'string',
      options: {
        list: [
          { title: 'Single hero', value: 'singleHero' },
          { title: 'Hero with supporting images', value: 'heroWithSupportingImages' },
          { title: 'Movement sequence', value: 'movementSequence' },
          { title: 'Sensory comparison', value: 'sensoryComparison' },
          { title: 'Custom', value: 'custom' },
        ],
      },
      description: "Overrides the Series' default visual treatment for this Card, if set.",
    }),
    defineField({
      name: 'cardArtwork',
      title: 'Card artwork',
      type: 'image',
      options: { hotspot: true },
      description:
        'The finished 9:16 card artwork. Shown as-is in the app - this is a real content asset, not a substitute for the structured fields above.',
      fields: [defineField({ name: 'alt', type: 'string', title: 'Alt text' })],
    }),
    defineField({
      name: 'heroImage',
      title: 'Hero image',
      type: 'image',
      options: { hotspot: true },
      description: 'Primary photographic image - independent from the finished card artwork above.',
      fields: [defineField({ name: 'alt', type: 'string', title: 'Alt text' })],
    }),
    defineField({
      name: 'supportingImages',
      title: 'Supporting images',
      type: 'array',
      description: 'Ordered. Not every Card has supporting images.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'supportingImage',
          fields: [
            defineField({
              name: 'order',
              type: 'number',
              description: 'Explicit order - never inferred from array position alone.',
              validation: (r) => r.required().integer().min(0),
            }),
            defineField({
              name: 'image',
              type: 'image',
              options: { hotspot: true },
              validation: (r) => r.required(),
              fields: [defineField({ name: 'alt', type: 'string', title: 'Alt text' })],
            }),
            defineField({
              name: 'caption',
              type: 'string',
            }),
          ],
          preview: {
            select: { title: 'caption', media: 'image' },
          },
        }),
      ],
    }),
    defineField({
      name: 'demonstrationSequence',
      title: 'Demonstration sequence',
      type: 'array',
      description:
        'Ordered. May contain zero, one, or many frames - especially relevant for movement cards.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'demonstrationFrame',
          fields: [
            defineField({
              name: 'order',
              type: 'number',
              description: 'Explicit frame order - never inferred from array position alone.',
              validation: (r) => r.required().integer().min(0),
            }),
            defineField({
              name: 'image',
              type: 'image',
              options: { hotspot: true },
              validation: (r) => r.required(),
              fields: [defineField({ name: 'alt', type: 'string', title: 'Alt text' })],
            }),
            defineField({
              name: 'label',
              type: 'string',
            }),
            defineField({
              name: 'instruction',
              type: 'text',
              rows: 2,
            }),
          ],
          preview: {
            select: { title: 'label', media: 'image' },
          },
        }),
      ],
    }),
  ],
  orderings: [
    { title: 'Display order', name: 'orderAsc', by: [{ field: 'sortOrder', direction: 'asc' }] },
  ],
  preview: {
    select: { title: 'title', subtitle: 'series.title', media: 'cardArtwork' },
  },
});
