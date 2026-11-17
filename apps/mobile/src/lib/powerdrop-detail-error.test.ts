import { describe, expect, it } from 'vitest';
import { ApiRequestError } from '@/api/types';
import { humanizeApiError } from '@/lib/api-errors';
import { classifyPowerDropDetailError } from './powerdrop-detail-error';

const apiError = (status: number, code: string) => new ApiRequestError('server text', status, code);

describe('classifyPowerDropDetailError', () => {
  it('a locked PowerDrop (403 MEMBERSHIP_REQUIRED) becomes `locked` (the membership prompt)', () => {
    expect(classifyPowerDropDetailError(apiError(403, 'MEMBERSHIP_REQUIRED'))).toEqual({
      status: 'locked',
    });
  });

  it('a locked result carries no PowerDrop content', () => {
    const result = classifyPowerDropDetailError(apiError(403, 'MEMBERSHIP_REQUIRED'));
    expect(Object.keys(result)).toEqual(['status']);
  });

  it('a 403 for any other reason keeps the existing error handling', () => {
    const err = apiError(403, 'ENTITLEMENT_REQUIRED');
    expect(classifyPowerDropDetailError(err)).toEqual({
      status: 'error',
      message: humanizeApiError(err),
    });
  });

  it('404 is still "not found"', () => {
    expect(classifyPowerDropDetailError(apiError(404, 'NOT_FOUND'))).toEqual({
      status: 'not-found',
    });
  });

  it.each([
    [401, 'UNAUTHORIZED'],
    [0, 'NETWORK_ERROR'],
    [500, 'INTERNAL_ERROR'],
    [429, 'RATE_LIMITED'],
  ])('%i keeps its existing humanised error', (status, code) => {
    const err = apiError(status, code);
    expect(classifyPowerDropDetailError(err)).toEqual({
      status: 'error',
      message: humanizeApiError(err),
    });
  });

  it('a non-API failure keeps the generic message', () => {
    expect(classifyPowerDropDetailError(new Error('boom'))).toEqual({
      status: 'error',
      message: humanizeApiError(new Error('boom')),
    });
  });
});
