import Stripe from 'stripe';
import { describe, expect, it } from 'vitest';
import { classifyStripeFailure, describeStripeFailure } from './failure';

const { errors } = Stripe;

describe('classifyStripeFailure', () => {
  it.each([
    [
      'a network failure or timeout',
      new errors.StripeConnectionError({ message: 'down', type: 'api_connection_error' } as never),
    ],
    [
      'a Stripe server error',
      new errors.StripeAPIError({ message: 'oops', type: 'api_error', statusCode: 503 }),
    ],
    [
      'rate limiting',
      new errors.StripeRateLimitError({
        message: 'slow',
        type: 'rate_limit_error',
        statusCode: 429,
      }),
    ],
  ])('treats %s as Stripe being unavailable', (_label, error) => {
    expect(classifyStripeFailure(error)).toBe('unavailable');
  });

  it.each([
    [
      'an invalid API key',
      new errors.StripeAuthenticationError({
        message: 'bad key',
        type: 'authentication_error',
        statusCode: 401,
      }),
    ],
    [
      'a missing subscription',
      new errors.StripeInvalidRequestError({
        message: 'no such',
        type: 'invalid_request_error',
        statusCode: 404,
        code: 'resource_missing',
      }),
    ],
    [
      'a permission error',
      new errors.StripePermissionError({ message: 'no', statusCode: 403 } as never),
    ],
    [
      'an idempotency conflict',
      new errors.StripeIdempotencyError({
        message: 'dup',
        type: 'idempotency_error',
        statusCode: 400,
      }),
    ],
    ['an unknown Stripe error', Object.assign(new Error('?'), { type: 'StripeUnknownError' })],
    ['an ordinary Error', new Error('boom')],
    ['a thrown string', 'boom'],
    ['null', null],
  ])('does NOT treat %s as an outage', (_label, error) => {
    expect(classifyStripeFailure(error)).toBe('other');
  });
});

describe('describeStripeFailure', () => {
  it('keeps only the loggable fields, never the message', () => {
    const error = new errors.StripeInvalidRequestError({
      message: 'No such subscription: sub_secret for jane@example.com',
      type: 'invalid_request_error',
      statusCode: 404,
      code: 'resource_missing',
      requestId: 'req_123',
    } as never);
    const described = describeStripeFailure(error);
    expect(described).toMatchObject({
      type: 'StripeInvalidRequestError',
      code: 'resource_missing',
      statusCode: 404,
    });
    const text = JSON.stringify(described);
    expect(text).not.toContain('jane');
    expect(text).not.toContain('sub_secret');
  });

  it('handles non-Error values', () => {
    expect(describeStripeFailure('x')).toEqual({ name: 'UnknownError' });
  });
});
