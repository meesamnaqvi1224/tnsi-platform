import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SeriesDetailHeader, SeriesDetailView } from './series-detail-view';
import type { ApiSomaticSeriesDetail } from '@/lib/somatic-card-api';

function seriesDetail(overrides: Partial<ApiSomaticSeriesDetail> = {}): ApiSomaticSeriesDetail {
  return {
    id: 's1',
    seriesNumber: 1,
    title: 'Support, Pressure & Proprioception',
    slug: 'support-pressure-proprioception',
    collection: 'core-series',
    description: 'A description.',
    coreQuestion: 'A question?',
    visualTreatment: 'singleHero',
    defaultLayout: null,
    sortOrder: 0,
    cards: [],
    ...overrides,
  };
}

function card(overrides: Partial<ApiSomaticSeriesDetail['cards'][number]> = {}) {
  return {
    id: 'c1',
    cardNumber: 1,
    title: 'Ground and Press',
    slug: 'ground-and-press',
    sortOrder: 0,
    visualTreatment: 'singleHero',
    cardArtwork: null,
    ...overrides,
  };
}

describe('SeriesDetailHeader', () => {
  it('4. renders API data', () => {
    const html = renderToStaticMarkup(<SeriesDetailHeader series={seriesDetail()} />);
    expect(html).toContain('Support, Pressure &amp; Proprioception');
    expect(html).toContain('A description.');
    expect(html).toContain('A question?');
    expect(html).toContain('Series 1');
  });
});

describe('SeriesDetailView', () => {
  it('5. renders cards in API order', () => {
    const html = renderToStaticMarkup(
      <SeriesDetailView
        series={seriesDetail({
          cards: [
            card({ id: 'c2', cardNumber: 2, title: 'Second Card', slug: 'second' }),
            card({ id: 'c1', cardNumber: 1, title: 'First Card', slug: 'first' }),
          ],
        })}
      />,
    );
    expect(html.indexOf('Second Card')).toBeLessThan(html.indexOf('First Card'));
  });

  it('3. card links use the correct slug', () => {
    const html = renderToStaticMarkup(
      <SeriesDetailView series={seriesDetail({ cards: [card({ slug: 'my-card-slug' })] })} />,
    );
    expect(html).toContain('href="/dashboard/somatic-cards/card/my-card-slug"');
  });

  it('6. renders card artwork when available', () => {
    const html = renderToStaticMarkup(
      <SeriesDetailView
        series={seriesDetail({
          cards: [
            card({
              cardArtwork: {
                url: 'https://cdn.sanity.io/images/x/y/artwork.jpg',
                alt: 'Artwork alt text',
              },
            }),
          ],
        })}
      />,
    );
    expect(html).toContain('Artwork alt text');
  });

  it('does not render an <img> when card artwork is absent', () => {
    const html = renderToStaticMarkup(
      <SeriesDetailView series={seriesDetail({ cards: [card({ cardArtwork: null })] })} />,
    );
    expect(html).not.toContain('<img');
  });

  it('16. renders a calm empty state when the series has no cards', () => {
    const html = renderToStaticMarkup(<SeriesDetailView series={seriesDetail({ cards: [] })} />);
    expect(html).toContain('doesn&#x27;t have any cards available yet');
  });

  it('does not render a completion/progress indicator', () => {
    const html = renderToStaticMarkup(
      <SeriesDetailView series={seriesDetail({ cards: [card()] })} />,
    );
    expect(html.toLowerCase()).not.toContain('completed');
    expect(html.toLowerCase()).not.toContain('progress');
  });
});
