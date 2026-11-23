import { defineArrayMember, defineField, defineType } from 'sanity';

/**
 * A guided exercise: a short interactive practice drawn by one reusable screen on the website and
 * in the app (see `packages/core/src/exercises/exercise.ts` for the exact shape the apps accept and
 * validate). Editing this document changes the exercise everywhere, with no code change or release.
 *
 * It is the CONTENT of the exercise. The practice a member finds in the library is a separate
 * `practice` document with Content type "Interactive" and Interactive practice set to the matching
 * "Exercise: ..." option, which carries its tags, access and publish status. Nothing a member
 * types or rates is stored: answers exist only during the session.
 */
export const guidedExercise = defineType({
  name: 'guidedExercise',
  title: 'Guided Exercise',
  type: 'document',
  fields: [
    defineField({
      name: 'slug',
      type: 'slug',
      description:
        'Lowercase words joined with hyphens, e.g. early-warning-signs. Must match the practice\'s "Exercise: ..." option. Do not change it once the practice is published.',
      options: { source: 'title', maxLength: 64 },
      validation: (r) => r.required(),
    }),
    defineField({ name: 'title', type: 'string', validation: (r) => r.required().max(120) }),
    defineField({ name: 'subtitle', type: 'string', validation: (r) => r.max(160) }),
    defineField({
      name: 'intro',
      type: 'text',
      rows: 4,
      description:
        'The opening screen. Say what the exercise is for and that they can stop at any time.',
      validation: (r) => r.required().max(1200),
    }),
    defineField({
      name: 'durationLabel',
      type: 'string',
      description: 'For example "About 3 minutes".',
      validation: (r) => r.max(40),
    }),
    defineField({
      name: 'steps',
      type: 'array',
      description: 'Shown in this order, one at a time.',
      validation: (r) => r.required().min(1).max(40),
      of: [
        defineArrayMember({
          type: 'object',
          name: 'exerciseStep',
          title: 'Step',
          fields: [
            defineField({
              name: 'id',
              type: 'string',
              description:
                'A short unique name for this step, letters, numbers, - or _ (for example "before"). The summary refers to steps by it.',
              validation: (r) => r.required().regex(/^[A-Za-z0-9_-]{1,64}$/),
            }),
            defineField({
              name: 'type',
              type: 'string',
              options: {
                layout: 'radio',
                list: [
                  { title: 'Prompt (just read, then continue)', value: 'prompt' },
                  { title: 'Choice (pick one or several)', value: 'choice' },
                  { title: 'Scale (1 to 5)', value: 'scale' },
                  { title: 'Written answer (optional)', value: 'text' },
                  { title: 'Pause (do something, then continue)', value: 'pause' },
                ],
              },
              validation: (r) => r.required(),
            }),
            defineField({
              name: 'title',
              type: 'string',
              description: 'Prompt and Pause only.',
              hidden: ({ parent }) => parent?.type !== 'prompt' && parent?.type !== 'pause',
            }),
            defineField({
              name: 'body',
              type: 'text',
              rows: 4,
              description: 'Prompt and Pause only: the text shown.',
              hidden: ({ parent }) => parent?.type !== 'prompt' && parent?.type !== 'pause',
            }),
            defineField({
              name: 'actionLabel',
              type: 'string',
              description:
                'Pause only: the button, e.g. "I have finished". Defaults to "Continue".',
              hidden: ({ parent }) => parent?.type !== 'pause',
            }),
            defineField({
              name: 'question',
              type: 'string',
              description: 'Choice, Scale and Written answer.',
              hidden: ({ parent }) =>
                parent?.type !== 'choice' && parent?.type !== 'scale' && parent?.type !== 'text',
            }),
            defineField({
              name: 'help',
              type: 'text',
              rows: 2,
              description: 'Optional smaller text under the question.',
              hidden: ({ parent }) =>
                parent?.type !== 'choice' && parent?.type !== 'scale' && parent?.type !== 'text',
            }),
            defineField({
              name: 'multiple',
              type: 'boolean',
              description: 'Choice only: allow more than one option.',
              initialValue: false,
              hidden: ({ parent }) => parent?.type !== 'choice',
            }),
            defineField({
              name: 'options',
              type: 'array',
              description: 'Choice only: two to twelve options.',
              hidden: ({ parent }) => parent?.type !== 'choice',
              of: [
                defineArrayMember({
                  type: 'object',
                  name: 'exerciseOption',
                  fields: [
                    defineField({
                      name: 'id',
                      type: 'string',
                      description: 'A short unique name, e.g. "tight-jaw".',
                      validation: (r) => r.required().regex(/^[A-Za-z0-9_-]{1,64}$/),
                    }),
                    defineField({
                      name: 'label',
                      type: 'string',
                      validation: (r) => r.required().max(160),
                    }),
                  ],
                  preview: { select: { title: 'label' } },
                }),
              ],
            }),
            defineField({
              name: 'max',
              type: 'number',
              description: 'Scale only: the highest number, 3 to 7. Defaults to 5.',
              initialValue: 5,
              validation: (r) => r.integer().min(3).max(7),
              hidden: ({ parent }) => parent?.type !== 'scale',
            }),
            defineField({
              name: 'lowLabel',
              type: 'string',
              description: 'Scale only: what 1 means, e.g. "Not at all".',
              hidden: ({ parent }) => parent?.type !== 'scale',
            }),
            defineField({
              name: 'highLabel',
              type: 'string',
              description: 'Scale only: what the top number means, e.g. "Very".',
              hidden: ({ parent }) => parent?.type !== 'scale',
            }),
            defineField({
              name: 'placeholder',
              type: 'string',
              description: 'Written answer only: faint hint text in the box.',
              hidden: ({ parent }) => parent?.type !== 'text',
            }),
          ],
          preview: {
            select: { type: 'type', title: 'title', question: 'question', body: 'body' },
            prepare: ({ type, title, question, body }) => ({
              title: question || title || (body ? String(body).slice(0, 60) : 'Step'),
              subtitle: type,
            }),
          },
        }),
      ],
    }),
    defineField({
      name: 'summary',
      type: 'object',
      description:
        'Optional closing summary that shows the member their own answers back. Leave empty to skip it.',
      fields: [
        defineField({ name: 'heading', type: 'string', validation: (r) => r.max(160) }),
        defineField({ name: 'intro', type: 'text', rows: 2, validation: (r) => r.max(600) }),
        defineField({
          name: 'showAnswers',
          type: 'boolean',
          initialValue: true,
          description: 'Show every answer back to the member.',
        }),
        defineField({
          name: 'compare',
          type: 'array',
          description:
            'Pairs of Scale steps shown side by side (e.g. before and after). Both scales must have the same highest number.',
          of: [
            defineArrayMember({
              type: 'object',
              name: 'exerciseComparison',
              fields: [
                defineField({ name: 'label', type: 'string', validation: (r) => r.required() }),
                defineField({
                  name: 'beforeStepId',
                  type: 'string',
                  description: 'The id of the first Scale step.',
                  validation: (r) => r.required(),
                }),
                defineField({
                  name: 'afterStepId',
                  type: 'string',
                  description: 'The id of the second Scale step.',
                  validation: (r) => r.required(),
                }),
              ],
              preview: { select: { title: 'label' } },
            }),
          ],
        }),
      ],
    }),
    defineField({
      name: 'closing',
      type: 'object',
      description: 'The quiet last screen. No scores or praise: just a settled close.',
      validation: (r) => r.required(),
      fields: [
        defineField({
          name: 'heading',
          type: 'string',
          validation: (r) => r.required().max(160),
        }),
        defineField({
          name: 'message',
          type: 'text',
          rows: 3,
          validation: (r) => r.required().max(1200),
        }),
      ],
    }),
  ],
  preview: { select: { title: 'title', subtitle: 'durationLabel' } },
});
