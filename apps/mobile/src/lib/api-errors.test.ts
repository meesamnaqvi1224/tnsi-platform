import { describe, expect, it } from 'vitest';
import { ApiRequestError } from '@/api/types';
import { isMembershipRequiredError } from './api-errors';

describe('isMembershipRequiredError', () => {
  it('is true for the server membership refusal (403 MEMBERSHIP_REQUIRED)', () => {
    expect(isMembershipRequiredError(new ApiRequestError('x', 403, 'MEMBERSHIP_REQUIRED'))).toBe(
      true,
    );
  });

  it('is false for a 403 with any other code', () => {
    expect(isMembershipRequiredError(new ApiRequestError('x', 403, 'FORBIDDEN'))).toBe(false);
  });

  it('is false for the same code on another status', () => {
    expect(isMembershipRequiredError(new ApiRequestError('x', 401, 'MEMBERSHIP_REQUIRED'))).toBe(
      false,
    );
  });

  it('is false for other API failures and non-API errors', () => {
    expect(isMembershipRequiredError(new ApiRequestError('x', 404, 'NOT_FOUND'))).toBe(false);
    expect(isMembershipRequiredError(new ApiRequestError('x', 0, 'NETWORK_ERROR'))).toBe(false);
    expect(isMembershipRequiredError(new Error('boom'))).toBe(false);
    expect(isMembershipRequiredError(undefined)).toBe(false);
  });
});
