import { describe, it, expect } from 'vitest';
import type { SomaticSeries, SomaticCard } from '@tnsi/db/schema';
import {
  mapSomaticSeriesListItem,
  mapSomaticSeriesDetail,
  mapSomaticCardSummary,
  mapSomaticCardDetail,
  parseSomaticCardJsonbFields,
} from './somatic-card-api';

/** Pure, no-DB unit tests for the Somatic Card Read API's response mapping - complements the DB-integration suite at `app/api/v1/somatic-cards/somatic-cards.integration.test.ts`. */

function series(overrides: Partial<SomaticSeries> = {}): SomaticSeries {
  return {
    id: 'series-1',
    sanityId: 'somaticSeries.abc',
    seriesNumber: 1,
    title: 'Series One',
    slug: 'series-one',
    collection: 'core-series',
    description: 'A description.',
    coreQuestion: 'A question?',
    visualTreatment: 'singleHero',
    defaultLayout: null,
    status: 'published',
    sortOrder: 0,
    sanityData: { secret: 'internal' },
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

function card(overrides: Partial<SomaticCard> = {}): SomaticCard {
  return {
    id: 'card-1',
    sanityId: 'somaticCard.abc',
    cardNumber: 1,
    title: 'Card One',
    slug: 'card-one',
    seriesId: 'series-1',
    collection: 'core-series',
    status: 'published',
    sortOrder: 0,
    invitation: 'Come sit.',
    purpose: 'To notice.',
    description: 'A description.',
    orientation: 'seated',
    gentleNote: 'No rush.',
    anchor: 'You are held.',
    visualTreatment: 'singleHero',
    cardArtworkUrl: 'https://cdn.example.com/artwork.jpg',
    cardArtworkAlt: 'Artwork alt.',
    heroImageUrl: null,
    heroImageAlt: null,
    practiceSteps: [{ order: 0, instruction: 'Breathe.' }],
    whatToNotice: [{ order: 0, text: 'Notice your breath.' }],
    supportingImages: [],
    demonstrationSequence: [],
    sanityData: { secret: 'internal' },
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

describe('mapSomaticSeriesListItem', () => {
  it('never includes sanityId/sanityData/createdAt/updatedAt', () => {
    const mapped = mapSomaticSeriesListItem(series());
    expect(mapped).not.toHaveProperty('sanityId');
    expect(mapped).not.toHaveProperty('sanityData');
    expect(mapped).not.toHaveProperty('createdAt');
    expect(mapped).not.toHaveProperty('updatedAt');
  });

  it('maps nullable fields through as null, not undefined/dropped', () => {
    const mapped = mapSomaticSeriesListItem(series({ description: null, coreQuestion: null }));
    expect(mapped.description).toBeNull();
    expect(mapped.coreQuestion).toBeNull();
  });
});

describe('mapSomaticSeriesDetail', () => {
  it('embeds ordered card summaries', () => {
    const mapped = mapSomaticSeriesDetail(series(), [
      card({ id: 'c1', cardNumber: 1 }),
      card({ id: 'c2', cardNumber: 2 }),
    ]);
    expect(mapped.cards.map((c) => c.id)).toEqual(['c1', 'c2']);
  });
});

describe('mapSomaticCardSummary', () => {
  it('resolves cardArtwork to null when no URL is present', () => {
    const mapped = mapSomaticCardSummary(card({ cardArtworkUrl: null, cardArtworkAlt: null }));
    expect(mapped.cardArtwork).toBeNull();
  });

  it('defaults alt to empty string, never omits it, when a URL exists with no alt', () => {
    const mapped = mapSomaticCardSummary(
      card({ cardArtworkUrl: 'https://cdn.example.com/x.jpg', cardArtworkAlt: null }),
    );
    expect(mapped.cardArtwork).toEqual({ url: 'https://cdn.example.com/x.jpg', alt: '' });
  });
});

describe('parseSomaticCardJsonbFields', () => {
  it('parses valid JSONB content', () => {
    const parsed = parseSomaticCardJsonbFields(card());
    expect(parsed).not.toBeNull();
    expect(parsed?.practiceSteps).toEqual([{ order: 0, instruction: 'Breathe.' }]);
  });

  it('returns null (never throws or repairs) on malformed JSONB content', () => {
    const parsed = parseSomaticCardJsonbFields(
      card({ practiceSteps: [{ order: 'not-a-number', instruction: 'x' }] as never }),
    );
    expect(parsed).toBeNull();
  });
});

describe('mapSomaticCardDetail', () => {
  it('never includes sanityId/sanityData/createdAt/updatedAt, on the card or its embedded series', () => {
    const s = series();
    const c = card();
    const jsonbFields = parseSomaticCardJsonbFields(c);
    if (!jsonbFields) throw new Error('fixture should parse');
    const mapped = mapSomaticCardDetail(c, s, jsonbFields);

    expect(mapped).not.toHaveProperty('sanityId');
    expect(mapped).not.toHaveProperty('sanityData');
    expect(mapped).not.toHaveProperty('createdAt');
    expect(mapped).not.toHaveProperty('updatedAt');
    expect(mapped.series).not.toHaveProperty('sanityData');
    expect(mapped.series).not.toHaveProperty('collection', undefined);
  });

  it('preserves structured content and asset alt text', () => {
    const s = series();
    const c = card({
      heroImageUrl: 'https://cdn.example.com/hero.jpg',
      heroImageAlt: 'Hero alt.',
    });
    const jsonbFields = parseSomaticCardJsonbFields(c);
    if (!jsonbFields) throw new Error('fixture should parse');
    const mapped = mapSomaticCardDetail(c, s, jsonbFields);

    expect(mapped.invitation).toBe('Come sit.');
    expect(mapped.cardArtwork?.alt).toBe('Artwork alt.');
    expect(mapped.heroImage).toEqual({ url: 'https://cdn.example.com/hero.jpg', alt: 'Hero alt.' });
    expect(mapped.series.slug).toBe(s.slug);
  });
});
