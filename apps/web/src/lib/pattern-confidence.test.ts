import { describe, expect, it } from 'vitest';
import { patternConfidenceOf } from './pattern-confidence';

describe('patternConfidenceOf', () => {
  it('reads the Practice Tags rating for a rated card', () => {
    expect(patternConfidenceOf('somaticCard', 'the-wall-support-press')).toBe('High');
    expect(patternConfidenceOf('somaticCard', 'the-heel-press-reset')).toBe('Medium');
  });

  it('treats an unrated or unknown slug as unrated, never as usable', () => {
    expect(patternConfidenceOf('somaticCard', 'no-such-card')).toBeNull();
    expect(patternConfidenceOf('powerDrop', 'constructor')).toBeNull();
  });
});
