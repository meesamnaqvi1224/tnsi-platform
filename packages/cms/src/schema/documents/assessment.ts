import { defineField, defineType } from 'sanity';

/**
 * Duplicate-key detection shared by `questions`, `choices` (per question),
 * and `resultTiers` below. Scoring (packages/core) matches answers to
 * choices and picks a result tier purely by `key` equality — a duplicate
 * key would make that match ambiguous, so it's rejected at the content
 * layer rather than left to fail silently at scoring time.
 */
function findDuplicateKey(items: Array<{ key?: string }> | undefined): string | undefined {
  const seen = new Set<string>();
  for (const item of items ?? []) {
    if (!item?.key) continue;
    if (seen.has(item.key)) return item.key;
    seen.add(item.key);
  }
  return undefined;
}

/**
 * Result tiers are selected by the first range containing the score
 * (see packages/core/src/assessment/scoring.ts), so overlapping ranges
 * would make selection depend on authoring order rather than the score
 * itself. Rejected here rather than merely documented in a description.
 */
function findOverlappingRange(
  tiers: Array<{ key?: string; minScore?: number; maxScore?: number }> | undefined,
): string | undefined {
  const ranged = (tiers ?? []).filter(
    (t): t is { key?: string; minScore: number; maxScore: number } =>
      typeof t.minScore === 'number' && typeof t.maxScore === 'number',
  );
  const sorted = [...ranged].sort((a, b) => a.minScore - b.minScore);
  for (let i = 0; i < sorted.length; i++) {
    const tier = sorted[i];
    if (!tier) continue;
    if (tier.minScore > tier.maxScore) {
      return `Tier "${tier.key ?? '(untitled)'}" has a minScore greater than its maxScore`;
    }
    const previous = sorted[i - 1];
    if (previous && tier.minScore <= previous.maxScore) {
      return `Tiers "${previous.key ?? '(untitled)'}" and "${tier.key ?? '(untitled)'}" have overlapping score ranges`;
    }
  }
  return undefined;
}

/**
 * Generic assessment definition — reusable for Capacity Assessment and any
 * future assessment (Leadership Capacity, Burnout Risk, Practitioner
 * Readiness — see docs/04-information-architecture.md's Assessment Centre).
 * Deliberately holds no question content, scoring weights, or result copy
 * for any specific assessment — that's real content, authored here once
 * product decisions are made, not something this schema invents.
 *
 * Field shape follows ARCHITECTURE.md's own "Assessment" content model:
 * title, questions, logic, results, recommendation, emailSequence,
 * crmPipeline. `emailSequence`/`crmPipeline` are plain identifier strings
 * for now — nothing reads them yet; Flowi sync and email automation are out
 * of scope for this phase (see packages/integrations/src/flowi.ts for the
 * existing adapter this would eventually reuse).
 */
export const assessment = defineType({
  name: 'assessment',
  title: 'Assessment',
  type: 'document',
  groups: [
    { name: 'content', title: 'Content', default: true },
    { name: 'scoring', title: 'Scoring' },
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
      name: 'questions',
      type: 'array',
      group: 'content',
      of: [
        {
          type: 'object',
          name: 'question',
          fields: [
            defineField({
              name: 'key',
              type: 'string',
              description:
                'Stable identifier for this question — submitted answers are matched against it. Do not change once responses exist.',
              validation: (r) => r.required(),
            }),
            defineField({
              name: 'text',
              title: 'Question text',
              type: 'string',
              validation: (r) => r.required(),
            }),
            defineField({
              name: 'choices',
              type: 'array',
              of: [
                {
                  type: 'object',
                  name: 'choice',
                  fields: [
                    defineField({
                      name: 'key',
                      type: 'string',
                      description: 'Stable identifier for this choice.',
                      validation: (r) => r.required(),
                    }),
                    defineField({
                      name: 'label',
                      type: 'string',
                      validation: (r) => r.required(),
                    }),
                    defineField({
                      name: 'value',
                      title: 'Score value',
                      type: 'number',
                      validation: (r) => r.required(),
                    }),
                  ],
                  preview: { select: { title: 'label', subtitle: 'value' } },
                },
              ],
              validation: (r) =>
                r.min(1).custom((choices: Array<{ key?: string }> | undefined) => {
                  const duplicate = findDuplicateKey(choices);
                  return duplicate
                    ? `Duplicate choice key "${duplicate}" — keys must be unique within a question`
                    : true;
                }),
            }),
          ],
          preview: { select: { title: 'text', subtitle: 'key' } },
        },
      ],
      validation: (r) =>
        r.custom((questions: Array<{ key?: string }> | undefined) => {
          const duplicate = findDuplicateKey(questions);
          return duplicate ? `Duplicate question key "${duplicate}" — keys must be unique` : true;
        }),
    }),
    defineField({
      name: 'scoringLogic',
      title: 'Scoring logic',
      type: 'object',
      group: 'scoring',
      description:
        'How question/choice values combine into a total score. Structured data, not code — only "sum" is currently implemented by the scoring engine (packages/core).',
      fields: [
        defineField({
          name: 'method',
          type: 'string',
          options: { list: [{ title: 'Sum of selected choice values', value: 'sum' }] },
          initialValue: 'sum',
          validation: (r) => r.required(),
        }),
      ],
    }),
    defineField({
      name: 'resultTiers',
      title: 'Result tiers',
      type: 'array',
      group: 'scoring',
      description:
        'Score ranges (inclusive) and the copy shown for each. Keep ranges non-overlapping.',
      of: [
        {
          type: 'object',
          name: 'resultTier',
          fields: [
            defineField({
              name: 'key',
              type: 'string',
              description: 'Stable identifier for this tier.',
              validation: (r) => r.required(),
            }),
            defineField({ name: 'title', type: 'string', validation: (r) => r.required() }),
            defineField({ name: 'minScore', type: 'number', validation: (r) => r.required() }),
            defineField({ name: 'maxScore', type: 'number', validation: (r) => r.required() }),
            defineField({
              name: 'description',
              title: 'Description / recommendation',
              type: 'text',
              rows: 4,
            }),
          ],
          preview: { select: { title: 'title', subtitle: 'key' } },
        },
      ],
      validation: (r) =>
        r
          .min(1)
          .custom(
            (tiers: Array<{ key?: string; minScore?: number; maxScore?: number }> | undefined) => {
              const duplicate = findDuplicateKey(tiers);
              if (duplicate) return `Duplicate tier key "${duplicate}" — keys must be unique`;
              return findOverlappingRange(tiers) ?? true;
            },
          ),
    }),
    defineField({
      name: 'emailSequence',
      title: 'Email sequence identifier',
      type: 'string',
      group: 'meta',
      description: 'Reference for a future email automation trigger. Not wired to anything yet.',
    }),
    defineField({
      name: 'crmPipeline',
      title: 'CRM pipeline / tag',
      type: 'string',
      group: 'meta',
      description:
        'Reference for a future Flowi sync (e.g. a tag or pipeline name). Not wired to anything yet.',
    }),
    defineField({
      name: 'status',
      type: 'string',
      group: 'meta',
      options: {
        list: [
          { title: 'Published', value: 'published' },
          { title: 'Draft', value: 'draft' },
        ],
        layout: 'radio',
      },
      initialValue: 'published',
    }),
    defineField({ name: 'seo', type: 'seo', group: 'meta' }),
  ],
  preview: {
    select: { title: 'title', subtitle: 'slug.current' },
  },
});
