import { describe, expect, it } from 'vitest';
import { HET_KIND_LABEL, HET_WHY_FALLBACK, hetWhyLine } from './het-copy';

describe('hetWhyLine', () => {
  it('gives each of the four approved conditions its own line, matched without regard to case', () => {
    const lines = ['Safety', 'capacity', ' AVAILABILITY ', 'Expansion'].map(hetWhyLine);
    expect(new Set(lines).size).toBe(4);
    expect(lines).not.toContain(HET_WHY_FALLBACK);
  });

  it('uses the neutral line for Participation, an unknown condition and no condition', () => {
    for (const value of ['Participation', 'Healing', '', null, undefined]) {
      expect(hetWhyLine(value)).toBe(HET_WHY_FALLBACK);
    }
  });
});

describe('HET_KIND_LABEL', () => {
  it('names every kind of suggestion', () => {
    expect(HET_KIND_LABEL).toEqual({
      practice: 'Guided practice',
      powerDrop: 'PowerDrop',
      somaticCard: 'Somatic card',
    });
  });
});
