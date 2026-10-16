import { describe, expect, it, vi } from 'vitest';

vi.mock('@tnsi/db', () => ({ db: {}, crmOutbox: {} }));

const {
  OUTBOX,
  attemptLimit,
  assessmentPayload,
  contactFormPayload,
  describeSendFailure,
  newsletterPayload,
  retryDelayMs,
} = await import('./crm-outbox');
const { FLOWI_FIELD } = await import('@tnsi/integrations');

describe('retryDelayMs', () => {
  it('grows by doubling from two minutes', () => {
    expect(retryDelayMs(1)).toBe(2 * 60_000);
    expect(retryDelayMs(2)).toBe(4 * 60_000);
    expect(retryDelayMs(3)).toBe(8 * 60_000);
  });
  it('is capped', () => {
    expect(retryDelayMs(20)).toBe(OUTBOX.maxDelayMs);
  });
  it('never returns less than the first step', () => {
    expect(retryDelayMs(0)).toBe(2 * 60_000);
  });
});

describe('payloads', () => {
  it('contact form: name split, three custom fields, the contact tag', () => {
    const p = contactFormPayload({
      name: 'Ada Lovelace King',
      organisation: 'Analytical',
      subject: 'Hello',
      message: 'A long message',
    });
    expect(p.firstName).toBe('Ada');
    expect(p.lastName).toBe('Lovelace King');
    expect(p.tags).toEqual(['TNSI Website Contact Form']);
    const byId = Object.fromEntries((p.customFields ?? []).map((f) => [f.id, f.value]));
    expect(byId[FLOWI_FIELD.contactMessage.id]).toBe('A long message');
    expect(byId[FLOWI_FIELD.contactSubject.id]).toBe('Hello');
    expect(byId[FLOWI_FIELD.contactOrganisation.id]).toBe('Analytical');
  });

  it('newsletter: only the tag - the consent field is deliberately not set', () => {
    const p = newsletterPayload();
    expect(p.tags).toEqual(['TNSI Website Newsletter']);
    expect(JSON.stringify(p)).not.toContain(FLOWI_FIELD.marketingConsent.id);
  });

  it('assessment: the result tier name only - never answers or score', () => {
    const p = assessmentPayload({
      assessmentTitle: 'Capacity',
      crmPipeline: 'Pipeline X',
      resultTier: 'regulated',
    });
    expect(p.tags).toEqual(['TNSI Website Assessment', 'Pipeline X']);
    expect(p.customFields).toEqual([{ id: FLOWI_FIELD.assessmentResult.id, value: 'regulated' }]);
    const json = JSON.stringify(p);
    expect(json).not.toMatch(/answers|score/i);
  });

  it('assessment with no matching tier sends no result field', () => {
    expect(
      assessmentPayload({ assessmentTitle: 'C', crmPipeline: null, resultTier: null }).customFields,
    ).toEqual([]);
  });
});

describe('describeSendFailure', () => {
  it('reports the HTTP status or the error class only - never provider text', () => {
    expect(
      describeSendFailure(Object.assign(new Error('echoes email a@b.c'), { status: 422 })),
    ).toBe('HTTP 422');
    const text = describeSendFailure(new TypeError('fetch failed for https://x?key=SECRET'));
    expect(text).toBe('TypeError');
    expect(text).not.toContain('SECRET');
    expect(describeSendFailure('weird')).toBe('UnknownError');
  });
});

describe('attemptLimit', () => {
  it('rejected requests are not retried; config failures a few times; temporary ones more', () => {
    expect(attemptLimit('rejected')).toBe(1);
    expect(attemptLimit('config')).toBe(OUTBOX.maxConfigAttempts);
    expect(attemptLimit('temporary')).toBe(OUTBOX.maxAttempts);
    expect(OUTBOX.maxConfigAttempts).toBeLessThan(OUTBOX.maxAttempts);
  });
  it('the immediate attempt is about three seconds, far below the worker’s per-call limit', () => {
    expect(OUTBOX.immediateBudgetMs).toBeGreaterThanOrEqual(2000);
    expect(OUTBOX.immediateBudgetMs).toBeLessThanOrEqual(4000);
  });
  it('the time budget leaves room for a row’s two Flowi calls inside the 60 s route limit', () => {
    expect(OUTBOX.budgetMs + 2 * 8000).toBeLessThan(60_000);
  });
});
