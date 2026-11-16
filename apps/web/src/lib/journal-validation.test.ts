import { describe, expect, it } from 'vitest';
import {
  journalEntryCreateSchema,
  journalEntryUpdateSchema,
  journalEntriesListQuerySchema,
  journalValidationDetails,
} from './validation';

const UUID = '3f2b6c1e-8a4d-4c7e-9b1a-2d5e6f708192';

describe('journalEntryCreateSchema', () => {
  it('defaults to an empty independent draft', () => {
    const parsed = journalEntryCreateSchema.parse({});
    expect(parsed).toMatchObject({ content: '', status: 'draft', entryType: 'independent' });
  });

  it('accepts a saved entry with text, an optional title and a client id', () => {
    const parsed = journalEntryCreateSchema.parse({
      id: UUID,
      title: '  A quiet morning  ',
      content: 'I slept better.',
      status: 'saved',
    });
    expect(parsed.id).toBe(UUID);
    expect(parsed.title).toBe('A quiet morning');
  });

  it('turns a blank title into null', () => {
    expect(journalEntryCreateSchema.parse({ title: '   ' }).title).toBeNull();
  });

  it('never reads a user id from the body: unknown keys are dropped', () => {
    const parsed = journalEntryCreateSchema.parse({ content: 'x', userId: UUID, user_id: UUID });
    expect(parsed).not.toHaveProperty('userId');
    expect(parsed).not.toHaveProperty('user_id');
  });

  it('allows exactly 20,000 characters and rejects 20,001', () => {
    expect(journalEntryCreateSchema.safeParse({ content: 'a'.repeat(20_000) }).success).toBe(true);
    expect(journalEntryCreateSchema.safeParse({ content: 'a'.repeat(20_001) }).success).toBe(false);
  });

  it('allows a 200-character title and rejects 201', () => {
    expect(journalEntryCreateSchema.safeParse({ title: 'a'.repeat(200) }).success).toBe(true);
    expect(journalEntryCreateSchema.safeParse({ title: 'a'.repeat(201) }).success).toBe(false);
  });

  it('rejects a saved entry with no text, but allows an empty draft', () => {
    expect(journalEntryCreateSchema.safeParse({ status: 'saved', content: '   ' }).success).toBe(
      false,
    );
    expect(journalEntryCreateSchema.safeParse({ status: 'draft', content: '' }).success).toBe(true);
  });

  it('rejects a NUL byte (Postgres cannot store it)', () => {
    expect(journalEntryCreateSchema.safeParse({ content: 'a\u0000b' }).success).toBe(false);
    expect(journalEntryCreateSchema.safeParse({ title: 'a\u0000b' }).success).toBe(false);
  });

  it('rejects an unknown status, entry type, condition and a malformed id', () => {
    expect(journalEntryCreateSchema.safeParse({ status: 'published' }).success).toBe(false);
    expect(journalEntryCreateSchema.safeParse({ entryType: 'diary' }).success).toBe(false);
    expect(journalEntryCreateSchema.safeParse({ theoryCondition: 'Wellbeing' }).success).toBe(
      false,
    );
    expect(journalEntryCreateSchema.safeParse({ id: 'not-a-uuid' }).success).toBe(false);
  });

  it('accepts exactly the five Human Expansion Theory conditions', () => {
    for (const condition of ['Safety', 'Capacity', 'Availability', 'Expansion', 'Participation']) {
      expect(
        journalEntryCreateSchema.safeParse({ entryType: 'theory', theoryCondition: condition })
          .success,
      ).toBe(true);
    }
    // the recommendation states are a different taxonomy and are not accepted here
    expect(journalEntryCreateSchema.safeParse({ theoryCondition: 'LOW' }).success).toBe(false);
  });

  it('requires a practice link for a practice entry and a condition for a theory entry', () => {
    expect(journalEntryCreateSchema.safeParse({ entryType: 'practice' }).success).toBe(false);
    expect(
      journalEntryCreateSchema.safeParse({ entryType: 'practice', practiceId: UUID }).success,
    ).toBe(true);
    expect(
      journalEntryCreateSchema.safeParse({ entryType: 'practice', completionId: UUID }).success,
    ).toBe(true);
    expect(journalEntryCreateSchema.safeParse({ entryType: 'theory' }).success).toBe(false);
  });
});

describe('journalEntryUpdateSchema', () => {
  it('requires at least one field', () => {
    expect(journalEntryUpdateSchema.safeParse({}).success).toBe(false);
    expect(journalEntryUpdateSchema.safeParse({ title: null }).success).toBe(true);
    expect(journalEntryUpdateSchema.safeParse({ content: '' }).success).toBe(true);
    expect(journalEntryUpdateSchema.safeParse({ status: 'saved' }).success).toBe(true);
  });

  it('cannot change the links or the entry type (unknown keys are dropped)', () => {
    const parsed = journalEntryUpdateSchema.parse({
      content: 'x',
      entryType: 'theory',
      practiceId: UUID,
    });
    expect(parsed).toEqual({ content: 'x' });
  });
});

describe('journalEntriesListQuerySchema', () => {
  it('defaults to saved entries, 20 per page', () => {
    expect(journalEntriesListQuerySchema.parse({})).toEqual({
      limit: 20,
      offset: 0,
      status: 'saved',
    });
  });
  it('bounds limit and offset', () => {
    expect(journalEntriesListQuerySchema.safeParse({ limit: '51' }).success).toBe(false);
    expect(journalEntriesListQuerySchema.safeParse({ limit: '0' }).success).toBe(false);
    expect(journalEntriesListQuerySchema.safeParse({ offset: '-1' }).success).toBe(false);
    expect(journalEntriesListQuerySchema.parse({ status: 'draft' }).status).toBe('draft');
  });
});

describe('journalValidationDetails', () => {
  it('reports field names only, never a submitted value', () => {
    const SECRET = 'my private thought SECRET-TEXT';
    const parsed = journalEntryCreateSchema.safeParse({
      content: SECRET + 'x'.repeat(20_000),
      status: SECRET,
    });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    const details = journalValidationDetails(parsed.error);
    expect(JSON.stringify(details)).not.toContain('SECRET');
    expect(details.fields.sort()).toEqual(['content', 'status']);
  });
});
