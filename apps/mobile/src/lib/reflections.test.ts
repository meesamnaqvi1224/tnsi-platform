import { describe, expect, it, vi } from 'vitest';
import { ApiRequestError, type ReflectionEntry } from '@/api/types';
import {
  charactersLeft,
  describeReflectionError,
  formatReflectionDate,
  hasUnsavedChanges,
  isBlank,
  newClientId,
  ReflectionSaveError,
  saveReflection,
} from './reflections';
import { REFLECTION_STATES } from './reflections-copy';

const SECRET = 'my private words SECRET-TEXT';

function entry(overrides: Partial<ReflectionEntry> = {}): ReflectionEntry {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    title: null,
    content: 'hello',
    status: 'draft',
    entryType: 'independent',
    promptId: null,
    promptText: null,
    practiceId: null,
    completionId: null,
    theoryCondition: null,
    createdAt: '2026-11-14T10:00:00.000Z',
    updatedAt: '2026-11-14T10:00:00.000Z',
    ...overrides,
  };
}

function fakeApi() {
  return { post: vi.fn(), patch: vi.fn() };
}

describe('newClientId', () => {
  it('produces a valid RFC 4122 version 4 UUID', () => {
    const id = newClientId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('is different each time', () => {
    expect(new Set(Array.from({ length: 200 }, () => newClientId())).size).toBe(200);
  });

  it('still produces a valid id when the random source returns all ones or all zeros', () => {
    for (const fill of [0x00, 0xff]) {
      const id = newClientId((bytes) => bytes.fill(fill));
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    }
  });
});

describe('unsaved-change detection', () => {
  const base = { title: 'A title', content: 'Some words' };

  it('is false when nothing changed, and ignores whitespace around the title (the server trims it)', () => {
    expect(hasUnsavedChanges(base, base)).toBe(false);
    expect(hasUnsavedChanges({ ...base, title: '  A title  ' }, base)).toBe(false);
  });

  it('is true when the text or the title changes', () => {
    expect(hasUnsavedChanges({ ...base, content: 'Some words.' }, base)).toBe(true);
    expect(hasUnsavedChanges({ ...base, title: 'Other' }, base)).toBe(true);
  });

  it('treats a blank new reflection as having nothing to save', () => {
    expect(hasUnsavedChanges({ title: '', content: '' }, { title: '', content: '' })).toBe(false);
    expect(isBlank({ title: 'Only a title', content: '   \n ' })).toBe(true);
    expect(isBlank({ title: '', content: 'x' })).toBe(false);
  });
});

describe('charactersLeft', () => {
  it('stays out of the way until the member is near the limit', () => {
    expect(charactersLeft('a'.repeat(17_999))).toBeNull();
    expect(charactersLeft('a'.repeat(18_000))).toBe(2_000);
    expect(charactersLeft('a'.repeat(20_000))).toBe(0);
  });
});

describe('saveReflection: first save', () => {
  const clientId = '22222222-2222-4222-8222-222222222222';

  it('creates with the client id, the trimmed title (null when empty) and the requested status', async () => {
    const api = fakeApi();
    api.post.mockResolvedValue(
      entry({ id: clientId, content: 'words', title: 'T', status: 'saved' }),
    );
    const result = await saveReflection({
      api,
      clientId,
      existing: null,
      fields: { title: '  T  ', content: 'words' },
      target: 'saved',
    });
    expect(api.post).toHaveBeenCalledWith('/api/v1/journal/entries', {
      id: clientId,
      title: 'T',
      content: 'words',
      status: 'saved',
    });
    expect(api.patch).not.toHaveBeenCalled();
    expect(result.status).toBe('saved');

    api.post.mockResolvedValue(entry({ id: clientId, content: 'words' }));
    await saveReflection({
      api,
      clientId,
      existing: null,
      fields: { title: '   ', content: 'words' },
      target: 'draft',
    });
    expect(api.post).toHaveBeenLastCalledWith('/api/v1/journal/entries', {
      id: clientId,
      title: null,
      content: 'words',
      status: 'draft',
    });
  });

  it('applies the NEWER text with a follow-up PATCH when the server replays an earlier create with older text', async () => {
    const api = fakeApi();
    // An earlier attempt with this id reached the server (reply lost) holding the older text.
    api.post.mockResolvedValue(entry({ id: clientId, content: 'older words', status: 'draft' }));
    api.patch.mockResolvedValue(entry({ id: clientId, content: 'newer words', status: 'saved' }));
    const result = await saveReflection({
      api,
      clientId,
      existing: null,
      fields: { title: '', content: 'newer words' },
      target: 'saved',
    });
    expect(api.patch).toHaveBeenCalledWith(`/api/v1/journal/entries/${clientId}`, {
      title: null,
      content: 'newer words',
      status: 'saved',
    });
    expect(result.content).toBe('newer words');
  });

  it('does not save a blank reflection as saved, and makes no request', async () => {
    const api = fakeApi();
    await expect(
      saveReflection({
        api,
        clientId,
        existing: null,
        fields: { title: 'Only a title', content: '  ' },
        target: 'saved',
      }),
    ).rejects.toMatchObject({ reason: 'needs_text' });
    expect(api.post).not.toHaveBeenCalled();
  });
});

describe('saveReflection: later saves', () => {
  it('PATCHes the existing entry and promotes a draft with status saved', async () => {
    const api = fakeApi();
    const existing = entry({ status: 'draft' });
    api.patch.mockResolvedValue({ ...existing, status: 'saved', content: 'more' });
    await saveReflection({
      api,
      clientId: 'ignored',
      existing,
      fields: { title: 'T', content: 'more' },
      target: 'saved',
    });
    expect(api.post).not.toHaveBeenCalled();
    expect(api.patch).toHaveBeenCalledWith(`/api/v1/journal/entries/${existing.id}`, {
      title: 'T',
      content: 'more',
      status: 'saved',
    });
  });

  it('a draft saved again as a draft sends no status', async () => {
    const api = fakeApi();
    const existing = entry({ status: 'draft' });
    api.patch.mockResolvedValue(existing);
    await saveReflection({
      api,
      clientId: 'ignored',
      existing,
      fields: { title: '', content: 'more' },
      target: 'draft',
    });
    expect(api.patch.mock.calls[0]![1]).toEqual({ title: null, content: 'more' });
  });

  it('editing a saved reflection sends no status, and asking for it to become a draft is refused before any request', async () => {
    const api = fakeApi();
    const existing = entry({ status: 'saved' });
    api.patch.mockResolvedValue(existing);
    await saveReflection({
      api,
      clientId: 'ignored',
      existing,
      fields: { title: '', content: 'edited' },
      target: 'saved',
    });
    expect(api.patch.mock.calls[0]![1]).not.toHaveProperty('status');

    await expect(
      saveReflection({
        api,
        clientId: 'ignored',
        existing,
        fields: { title: '', content: 'edited' },
        target: 'draft',
      }),
    ).rejects.toBeInstanceOf(ReflectionSaveError);
    expect(api.patch).toHaveBeenCalledTimes(1);
  });
});

describe('describeReflectionError', () => {
  const fail = (status: number, code = 'X') =>
    describeReflectionError(new ApiRequestError(`server text ${SECRET}`, status, code), 'save');

  it('reports a pending account deletion as locked', () => {
    expect(fail(423, 'ACCOUNT_DELETION_PENDING')).toEqual({
      kind: 'locked',
      message: REFLECTION_STATES.lockedForDeletion,
    });
  });

  it('maps each status to its own calm message and never repeats server text', () => {
    expect(fail(404).kind).toBe('not_found');
    expect(fail(409).kind).toBe('already_saved');
    expect(fail(401).kind).toBe('signed_out');
    expect(fail(0).kind).toBe('network');
    expect(fail(413).message).toBe(REFLECTION_STATES.tooLong);
    for (const status of [0, 400, 401, 404, 409, 413, 423, 500]) {
      expect(JSON.stringify(fail(status))).not.toContain('SECRET');
    }
  });

  it('uses the wording for the action that failed, and says nothing was lost when saving fails', () => {
    const boom = new ApiRequestError('x', 500, 'INTERNAL');
    expect(describeReflectionError(boom, 'save').message).toBe(REFLECTION_STATES.saveFailed);
    expect(REFLECTION_STATES.saveFailed).toContain('Your writing is still here');
    expect(describeReflectionError(boom, 'delete').message).toBe(REFLECTION_STATES.deleteFailed);
    expect(REFLECTION_STATES.deleteFailed).toContain('has not been deleted');
    expect(describeReflectionError(boom, 'list').message).toBe(REFLECTION_STATES.listFailed);
    expect(describeReflectionError(new Error('weird'), 'load').message).toBe(
      REFLECTION_STATES.loadFailed,
    );
  });
});

describe('formatReflectionDate', () => {
  it('writes the date in words', () => {
    expect(formatReflectionDate('2026-11-14T12:00:00.000Z')).toBe('14 November 2026');
  });
});
