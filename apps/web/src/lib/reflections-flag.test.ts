import { afterEach, describe, expect, it, vi } from 'vitest';
import { isReflectionsEnabled } from './reflections-flag';

afterEach(() => vi.unstubAllEnvs());

describe('My Reflections switch', () => {
  it('is ON only for the exact value "true"', () => {
    vi.stubEnv('MY_REFLECTIONS_ENABLED', 'true');
    expect(isReflectionsEnabled()).toBe(true);
  });

  it.each([undefined, '', 'false', '1', 'TRUE', 'yes', ' true', 'on'])(
    'is OFF for %j (default off, no near-misses)',
    (value) => {
      if (value === undefined) vi.stubEnv('MY_REFLECTIONS_ENABLED', '');
      else vi.stubEnv('MY_REFLECTIONS_ENABLED', value);
      expect(isReflectionsEnabled()).toBe(false);
    },
  );
});
