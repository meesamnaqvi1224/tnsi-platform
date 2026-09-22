import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SeriesListView } from './series-list-view';
import type { ApiSomaticSeriesListItem } from '@/lib/somatic-card-api';

/**
 * Pure rendering tests - no React Testing Library / jsdom dependency
 * introduced (none exists anywhere in `apps/web` today); `renderToStaticMarkup`
 * (part of `react-dom`, already a dependency) is enough to assert on real
 * rendered HTML output from these presentational, hook-free view
 * components under Vitest's existing `node` environment.
 */

function series(overrides: Partial<ApiSomaticSeriesListItem> = {}): ApiSomaticSeriesListItem {
  return {
    id: 's1',
    seriesNumber: 1,
    title: 'Support, Pressure & Proprioception',
    slug: 'support-pressure-proprioception',
    collection: 'core-series',
    description: 'A description from the API.',
    coreQuestion: 'What does support feel like?',
    visualTreatment: 'singleHero',
    defaultLayout: null,
    sortOrder: 0,
    ...overrides,
  };
}

describe('SeriesListView', () => {
  it('1. renders API data (title, description, core question)', () => {
    const html = renderToStaticMarkup(<SeriesListView series={[series()]} />);
    expect(html).toContain('Support, Pressure &amp; Proprioception');
    expect(html).toContain('A description from the API.');
    expect(html).toContain('What does support feel like?');
    expect(html).toContain('Series 1');
  });

  it('2. preserves the order given by the API (no client re-sorting)', () => {
    const html = renderToStaticMarkup(
      <SeriesListView
        series={[
          series({ id: 's2', seriesNumber: 2, title: 'Second Series', slug: 'second' }),
          series({ id: 's1', seriesNumber: 1, title: 'First Series', slug: 'first' }),
        ]}
      />,
    );
    expect(html.indexOf('Second Series')).toBeLessThan(html.indexOf('First Series'));
  });

  it('3. links use the correct slug', () => {
    const html = renderToStaticMarkup(<SeriesListView series={[series({ slug: 'my-slug' })]} />);
    expect(html).toContain('href="/dashboard/somatic-cards/my-slug"');
  });

  it('14. does not render an empty shell when description/coreQuestion are absent', () => {
    const html = renderToStaticMarkup(
      <SeriesListView series={[series({ description: null, coreQuestion: null })]} />,
    );
    // No stray empty paragraph content - the optional content block is
    // omitted entirely, not rendered with blank/null text inside it.
    expect(html).not.toContain('null');
  });
});
