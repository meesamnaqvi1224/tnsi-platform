import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, parseSettings } from './settings';

describe('parseSettings', () => {
  it('reads both stored preferences', () => {
    expect(parseSettings('{"pause":true,"noBreath":true}')).toEqual({
      pause: true,
      noBreath: true,
    });
    expect(parseSettings('{"pause":true,"noBreath":false}')).toEqual({
      pause: true,
      noBreath: false,
    });
  });

  it('falls back to the defaults (both off) when nothing is stored', () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('')).toEqual(DEFAULT_SETTINGS);
  });

  it('falls back to the defaults for malformed storage rather than throwing', () => {
    expect(parseSettings('not json')).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('null')).toEqual(DEFAULT_SETTINGS);
  });

  it('only a literal true switches a preference on', () => {
    expect(parseSettings('{"pause":"yes","noBreath":1}')).toEqual(DEFAULT_SETTINGS);
  });
});
