import { describe, expect, it } from 'vitest';
import { buildPracticeSyncPlan, normalizeSanityId } from './sync-plan';
import type { SanityPracticeWebhookPayload } from './schema';

function publishedEvent(
  overrides: Partial<SanityPracticeWebhookPayload['document']> = {},
): SanityPracticeWebhookPayload {
  return {
    _id: 'practice.morning-breath',
    _type: 'practice',
    operation: 'update',
    document: {
      title: 'Morning Breath',
      description: 'A short breathwork practice.',
      contentType: 'breathwork',
      mediaUrl: 'https://example.com/audio.mp3',
      thumbnailUrl: 'https://example.com/thumb.jpg',
      durationSeconds: 300,
      category: 'regulation',
      tags: ['morning', 'breath'],
      difficulty: 1,
      status: 'published',
      ...overrides,
    },
  };
}

describe('normalizeSanityId', () => {
  it('strips the drafts. prefix', () => {
    expect(normalizeSanityId('drafts.foo')).toBe('foo');
  });

  it('leaves a non-draft id unchanged', () => {
    expect(normalizeSanityId('foo')).toBe('foo');
  });

  it('does not strip unrelated prefixes', () => {
    expect(normalizeSanityId('draft-but-not-really.foo')).toBe('draft-but-not-really.foo');
  });
});

describe('buildPracticeSyncPlan', () => {
  it('maps a published document to an upsert plan', () => {
    const plan = buildPracticeSyncPlan(publishedEvent());
    expect(plan.action).toBe('upsert');
    if (plan.action !== 'upsert') throw new Error('expected upsert');
    expect(plan.sanityId).toBe('practice.morning-breath');
    expect(plan.values).toMatchObject({
      sanityId: 'practice.morning-breath',
      title: 'Morning Breath',
      description: 'A short breathwork practice.',
      contentType: 'breathwork',
      mediaUrl: 'https://example.com/audio.mp3',
      thumbnailUrl: 'https://example.com/thumb.jpg',
      durationSeconds: 300,
      category: 'regulation',
      tags: ['morning', 'breath'],
      difficulty: 1,
      isPublished: true,
    });
  });

  it('normalizes a drafts.-prefixed id in the plan', () => {
    const event = publishedEvent();
    const plan = buildPracticeSyncPlan({ ...event, _id: `drafts.${event._id}` });
    expect(plan.sanityId).toBe('practice.morning-breath');
  });

  it('stores the full received document in sanityData, uncurated', () => {
    const event = publishedEvent();
    const plan = buildPracticeSyncPlan(event);
    if (plan.action !== 'upsert') throw new Error('expected upsert');
    expect(plan.values.sanityData).toEqual(event.document);
  });

  it('defaults difficulty to 1 and tags to [] when absent', () => {
    const event = publishedEvent({ difficulty: null, tags: null });
    const plan = buildPracticeSyncPlan(event);
    if (plan.action !== 'upsert') throw new Error('expected upsert');
    expect(plan.values.difficulty).toBe(1);
    expect(plan.values.tags).toEqual([]);
  });

  it('produces a deactivate plan when status is not published', () => {
    const plan = buildPracticeSyncPlan(publishedEvent({ status: 'draft' }));
    expect(plan).toEqual({ action: 'deactivate', sanityId: 'practice.morning-breath' });
  });

  it('produces a deactivate plan for a delete operation', () => {
    const plan = buildPracticeSyncPlan({
      _id: 'practice.morning-breath',
      _type: 'practice',
      operation: 'delete',
      document: null,
    });
    expect(plan).toEqual({ action: 'deactivate', sanityId: 'practice.morning-breath' });
  });

  it('never produces a delete action — deactivate only, preserving the row', () => {
    const events: SanityPracticeWebhookPayload[] = [
      { _id: 'a', _type: 'practice', operation: 'delete', document: null },
      publishedEvent({ status: 'draft' }),
      { _id: 'b', _type: 'practice', operation: 'update', document: undefined },
    ];
    for (const event of events) {
      expect(buildPracticeSyncPlan(event).action).not.toBe('delete');
    }
  });

  it('is deterministic — repeated identical events produce an identical plan (idempotency)', () => {
    const event = publishedEvent();
    const first = buildPracticeSyncPlan(event);
    const second = buildPracticeSyncPlan(event);
    expect(first).toEqual(second);
  });
});
