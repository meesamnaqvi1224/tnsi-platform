import { describe, it, expect } from 'vitest';
import { validateManifest, seriesDocId, cardDocId, type Manifest } from './somatic-import-lib';

function fixtureManifest(overrides: Partial<Manifest> = {}): Manifest {
  return {
    collection: 'core-series',
    series: [{ seriesNumber: 1, title: 'Test Series', coreQuestion: 'A question?' }],
    cards: [
      {
        cardNumber: 1,
        seriesNumber: 1,
        title: 'Test Card',
        slug: 'test-card',
        sortOrder: 1,
        artworkSource: 'test.jpeg',
        invitation: null,
        purpose: null,
        description: null,
        orientation: null,
        practiceSteps: [{ order: 0, instruction: 'Do the thing.' }],
        whatToNotice: [{ order: 0, text: 'Notice this.' }],
        gentleNote: 'Be gentle.',
        anchor: 'I am here.',
        visualTreatment: null,
        heroImageSource: null,
        supportingImages: [],
        demonstrationSequence: [],
        sourceReference: 'test',
        needsReview: false,
        reviewNote: null,
      },
    ],
    excludedSource: [],
    ...overrides,
  };
}

describe('validateManifest', () => {
  it('accepts a well-formed manifest', () => {
    expect(validateManifest(fixtureManifest())).toEqual([]);
  });

  it('rejects a collection other than core-series', () => {
    const errors = validateManifest(fixtureManifest({ collection: 'other' }));
    expect(errors.some((e) => e.includes('collection must be "core-series"'))).toBe(true);
  });

  it('catches duplicate cardNumbers', () => {
    const m = fixtureManifest();
    m.cards.push({ ...m.cards[0]!, slug: 'test-card-2' });
    const errors = validateManifest(m);
    expect(errors.some((e) => e.includes('duplicate cardNumber 1'))).toBe(true);
  });

  it('catches duplicate slugs', () => {
    const m = fixtureManifest();
    m.cards.push({ ...m.cards[0]!, cardNumber: 2 });
    const errors = validateManifest(m);
    expect(errors.some((e) => e.includes('duplicate slug test-card'))).toBe(true);
  });

  it('catches a card referencing a series not present in the manifest', () => {
    const m = fixtureManifest();
    m.cards[0]!.seriesNumber = 99;
    const errors = validateManifest(m);
    expect(errors.some((e) => e.includes('no matching series 99'))).toBe(true);
  });

  it('catches a missing title or slug (never fabricates one)', () => {
    const m1 = fixtureManifest();
    m1.cards[0]!.title = '';
    expect(validateManifest(m1).some((e) => e.includes('missing title'))).toBe(true);

    const m2 = fixtureManifest();
    m2.cards[0]!.slug = '';
    expect(validateManifest(m2).some((e) => e.includes('missing slug'))).toBe(true);
  });

  it('catches a practice step or whatToNotice item with empty text', () => {
    const m1 = fixtureManifest();
    m1.cards[0]!.practiceSteps = [{ order: 0, instruction: '  ' }];
    expect(validateManifest(m1).some((e) => e.includes('missing instruction'))).toBe(true);

    const m2 = fixtureManifest();
    m2.cards[0]!.whatToNotice = [{ order: 0, text: '' }];
    expect(validateManifest(m2).some((e) => e.includes('missing text'))).toBe(true);
  });

  it('does not require optional fields (description, orientation, etc.)', () => {
    // fixtureManifest() already has these null - asserting the baseline passes
    // is the regression guard against the importer ever requiring them.
    expect(validateManifest(fixtureManifest())).toEqual([]);
  });
});

describe('seriesDocId / cardDocId', () => {
  it('produces stable, zero-padded, idempotent IDs', () => {
    expect(seriesDocId(1)).toBe('somaticSeries.core-series-01');
    expect(seriesDocId(5)).toBe('somaticSeries.core-series-05');
    expect(cardDocId(1, 1)).toBe('somaticCard.core-series-01.card-01');
    expect(cardDocId(5, 50)).toBe('somaticCard.core-series-05.card-50');
  });

  it('is a pure function - same input always produces the same ID (re-running the importer reconciles, never duplicates)', () => {
    expect(seriesDocId(3)).toBe(seriesDocId(3));
    expect(cardDocId(2, 15)).toBe(cardDocId(2, 15));
  });
});
