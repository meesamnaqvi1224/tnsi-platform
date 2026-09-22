import { describe, expect, it } from 'vitest';
import {
  buildSomaticSeriesSyncPlan,
  prepareSomaticCardSync,
  normalizeSomaticSanityId,
} from './sync-plan-somatic';
import type {
  SanitySomaticCardWebhookPayload,
  SanitySomaticSeriesWebhookPayload,
} from './schema-somatic';

function seriesEvent(
  overrides: Partial<NonNullable<SanitySomaticSeriesWebhookPayload['document']>> = {},
  eventOverrides: Partial<SanitySomaticSeriesWebhookPayload> = {},
): SanitySomaticSeriesWebhookPayload {
  return {
    _id: 'somaticSeries.01',
    _type: 'somaticSeries',
    operation: 'update',
    document: {
      seriesNumber: 1,
      title: 'Support, Pressure & Proprioception',
      slug: 'support-pressure-proprioception',
      collection: 'core-series',
      description: 'Series one.',
      coreQuestion: 'Where am I in my body?',
      visualTreatment: 'singleHero',
      defaultLayout: null,
      status: 'published',
      sortOrder: 0,
      ...overrides,
    },
    ...eventOverrides,
  };
}

function cardEvent(
  overrides: Partial<NonNullable<SanitySomaticCardWebhookPayload['document']>> = {},
  eventOverrides: Partial<SanitySomaticCardWebhookPayload> = {},
): SanitySomaticCardWebhookPayload {
  return {
    _id: 'somaticCard.01',
    _type: 'somaticCard',
    operation: 'update',
    document: {
      cardNumber: 1,
      title: 'Ground + Press Drop',
      slug: 'ground-press-drop',
      seriesId: 'somaticSeries.01',
      seriesCollection: 'core-series',
      status: 'published',
      sortOrder: 0,
      invitation: null,
      purpose: null,
      description: null,
      orientation: null,
      gentleNote: null,
      anchor: null,
      visualTreatment: null,
      cardArtworkUrl: null,
      cardArtworkAlt: null,
      heroImageUrl: null,
      heroImageAlt: null,
      practiceSteps: [{ order: 0, instruction: 'Press your feet into the floor.' }],
      whatToNotice: [],
      supportingImages: [],
      demonstrationSequence: [],
      ...overrides,
    },
    ...eventOverrides,
  };
}

describe('normalizeSomaticSanityId', () => {
  it('strips the drafts. prefix', () => {
    expect(normalizeSomaticSanityId('drafts.somaticSeries.01')).toBe('somaticSeries.01');
  });
  it('leaves a non-draft id unchanged', () => {
    expect(normalizeSomaticSanityId('somaticSeries.01')).toBe('somaticSeries.01');
  });
});

describe('buildSomaticSeriesSyncPlan', () => {
  it('maps a published document to an upsert plan carrying its real status', () => {
    const plan = buildSomaticSeriesSyncPlan(seriesEvent());
    expect(plan.action).toBe('upsert');
    if (plan.action !== 'upsert') throw new Error('expected upsert');
    expect(plan.sanityId).toBe('somaticSeries.01');
    expect(plan.values.status).toBe('published');
    expect(plan.values.collection).toBe('core-series');
  });

  it('upserts a draft-status document too - Sanity being published does not force editorial status to published', () => {
    const plan = buildSomaticSeriesSyncPlan(seriesEvent({ status: 'draft' }));
    expect(plan.action).toBe('upsert');
    if (plan.action !== 'upsert') throw new Error('expected upsert');
    expect(plan.values.status).toBe('draft');
  });

  it('upserts an archived-status document with status=archived, not deleted', () => {
    const plan = buildSomaticSeriesSyncPlan(seriesEvent({ status: 'archived' }));
    expect(plan.action).toBe('upsert');
    if (plan.action !== 'upsert') throw new Error('expected upsert');
    expect(plan.values.status).toBe('archived');
  });

  it('skips a Sanity draft document regardless of its own status field', () => {
    const plan = buildSomaticSeriesSyncPlan(
      seriesEvent({ status: 'published' }, { _id: 'drafts.somaticSeries.01' }),
    );
    expect(plan).toEqual({ action: 'skip', sanityId: 'somaticSeries.01', reason: 'sanity-draft' });
  });

  it('archives (never inserts) on a delete operation with no document', () => {
    const plan = buildSomaticSeriesSyncPlan(
      seriesEvent({}, { operation: 'delete', document: null }),
    );
    expect(plan).toEqual({ action: 'archive', sanityId: 'somaticSeries.01' });
  });

  it('defaults missing status to draft, never silently to published', () => {
    const plan = buildSomaticSeriesSyncPlan(seriesEvent({ status: null }));
    if (plan.action !== 'upsert') throw new Error('expected upsert');
    expect(plan.values.status).toBe('draft');
  });
});

describe('prepareSomaticCardSync', () => {
  it('resolves to needs-series-resolution for a normal published card, carrying the series sanity id', () => {
    const prepared = prepareSomaticCardSync(cardEvent());
    expect(prepared.action).toBe('needs-series-resolution');
    if (prepared.action !== 'needs-series-resolution')
      throw new Error('expected needs-series-resolution');
    expect(prepared.seriesSanityId).toBe('somaticSeries.01');
    expect(prepared.candidateValues.cardNumber).toBe(1);
    expect(prepared.candidateValues.status).toBe('published');
  });

  it('normalizes a drafts.-prefixed series reference the same way as a top-level id', () => {
    const prepared = prepareSomaticCardSync(cardEvent({ seriesId: 'drafts.somaticSeries.01' }));
    if (prepared.action !== 'needs-series-resolution')
      throw new Error('expected needs-series-resolution');
    expect(prepared.seriesSanityId).toBe('somaticSeries.01');
  });

  it('skips a Sanity draft card regardless of its own status field', () => {
    const prepared = prepareSomaticCardSync(
      cardEvent({ status: 'published' }, { _id: 'drafts.somaticCard.01' }),
    );
    expect(prepared).toEqual({
      action: 'skip',
      sanityId: 'somaticCard.01',
      reason: 'sanity-draft',
    });
  });

  it('archives (never inserts) on a delete operation with no document', () => {
    const prepared = prepareSomaticCardSync(cardEvent({}, { operation: 'delete', document: null }));
    expect(prepared).toEqual({ action: 'archive', sanityId: 'somaticCard.01' });
  });

  it('preserves variable-length practice steps with no imposed limit', () => {
    const sixSteps = Array.from({ length: 6 }, (_, i) => ({ order: i, instruction: `Step ${i}` }));
    const prepared = prepareSomaticCardSync(cardEvent({ practiceSteps: sixSteps }));
    if (prepared.action !== 'needs-series-resolution')
      throw new Error('expected needs-series-resolution');
    expect(prepared.candidateValues.practiceSteps).toHaveLength(6);
  });

  it('preserves an empty supporting images array - no optional images is a valid state', () => {
    const prepared = prepareSomaticCardSync(cardEvent({ supportingImages: [] }));
    if (prepared.action !== 'needs-series-resolution')
      throw new Error('expected needs-series-resolution');
    expect(prepared.candidateValues.supportingImages).toEqual([]);
  });

  it('preserves a populated demonstration sequence', () => {
    const frames = [
      {
        order: 0,
        imageUrl: 'https://cdn.example.com/f1.jpg',
        imageAlt: 'A person shifting weight forward.',
      },
    ];
    const prepared = prepareSomaticCardSync(cardEvent({ demonstrationSequence: frames }));
    if (prepared.action !== 'needs-series-resolution')
      throw new Error('expected needs-series-resolution');
    expect(prepared.candidateValues.demonstrationSequence).toEqual(frames);
  });
});
