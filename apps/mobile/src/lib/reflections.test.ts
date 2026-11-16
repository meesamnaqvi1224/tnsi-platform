import { describe, expect, it } from 'vitest';
import { ApiRequestError } from '@/api/types';
import { describeReflectionError } from './reflections';
import { REFLECTION_STATES } from './reflections-copy';

/**
 * The shared logic is tested in packages/core. This checks the one thing the app adds: that its own
 * `ApiRequestError` is understood by the shared error description.
 */
describe("describeReflectionError with the app's ApiRequestError", () => {
  const fail = (status: number, code = 'X') =>
    describeReflectionError(new ApiRequestError('server text SECRET-TEXT', status, code), 'save');

  it('recognises a pending account deletion, a missing entry, a conflict and a lost connection', () => {
    expect(fail(423, 'ACCOUNT_DELETION_PENDING')).toEqual({
      kind: 'locked',
      message: REFLECTION_STATES.lockedForDeletion,
    });
    expect(fail(404).kind).toBe('not_found');
    expect(fail(409).kind).toBe('already_saved');
    expect(fail(0).kind).toBe('network');
    expect(fail(401).kind).toBe('signed_out');
  });

  it('never repeats server text', () => {
    for (const status of [0, 401, 404, 409, 423, 500]) {
      expect(JSON.stringify(fail(status))).not.toContain('SECRET');
    }
  });
});
