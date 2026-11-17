import { describe, expect, it } from 'vitest';
import { buildSubscribeBody } from './return-path-subscribe';

describe('buildSubscribeBody', () => {
  it('sends the email, consent and level only', () => {
    expect(JSON.parse(buildSubscribeBody('a@example.com', 2))).toEqual({
      email: 'a@example.com',
      consent: true,
      level: 2,
    });
  });

  it('carries no campaign attribution fields', () => {
    const body = buildSubscribeBody('a@example.com', 1);
    expect(body).not.toMatch(/utm/i);
  });
});
