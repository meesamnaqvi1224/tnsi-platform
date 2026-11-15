import { describe, expect, it } from 'vitest';
import { parseReflectionOrigin } from './reflection-origin';

describe('parseReflectionOrigin', () => {
  it('accepts only the two fixed tokens', () => {
    expect(parseReflectionOrigin('home')).toBe('home');
    expect(parseReflectionOrigin('progress')).toBe('progress');
  });

  it('treats anything else as unknown, including text that could have been written by the member', () => {
    for (const value of [
      undefined,
      '',
      'Home',
      'my private words',
      ['home'],
      42,
      null,
      '/profile',
    ]) {
      expect(parseReflectionOrigin(value)).toBeUndefined();
    }
  });
});
