import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  CardReadingView,
  PracticeStepsList,
  WhatToNoticeList,
  SupportingImagesGallery,
  DemonstrationSequenceGallery,
} from './card-reading-view';
import type { ApiSomaticCardDetail } from '@/lib/somatic-card-api';

function cardDetail(overrides: Partial<ApiSomaticCardDetail> = {}): ApiSomaticCardDetail {
  return {
    id: 'c1',
    cardNumber: 1,
    title: 'Ground and Press',
    slug: 'ground-and-press',
    sortOrder: 0,
    series: {
      id: 's1',
      seriesNumber: 1,
      title: 'Support Series',
      slug: 'support-series',
      collection: 'core-series',
    },
    invitation: null,
    purpose: null,
    description: null,
    orientation: null,
    gentleNote: null,
    anchor: null,
    visualTreatment: 'singleHero',
    cardArtwork: null,
    heroImage: null,
    practiceSteps: [],
    whatToNotice: [],
    supportingImages: [],
    demonstrationSequence: [],
    ...overrides,
  };
}

describe('CardReadingView', () => {
  it('7. renders structured content as real text/HTML', () => {
    const html = renderToStaticMarkup(
      <CardReadingView
        card={cardDetail({
          invitation: 'Come sit for a moment.',
          purpose: 'To notice ground.',
          description: 'A short description.',
          orientation: 'Seated.',
          gentleNote: 'No rush here.',
          anchor: 'You are held.',
        })}
      />,
    );
    expect(html).toContain('Come sit for a moment.');
    expect(html).toContain('To notice ground.');
    expect(html).toContain('A short description.');
    expect(html).toContain('Seated.');
    expect(html).toContain('No rush here.');
    expect(html).toContain('You are held.');
  });

  it('2/3. Series context link uses the correct series slug', () => {
    const html = renderToStaticMarkup(
      <CardReadingView
        card={cardDetail({
          series: {
            id: 's1',
            seriesNumber: 1,
            title: 'My Series',
            slug: 'my-series-slug',
            collection: 'core-series',
          },
        })}
      />,
    );
    expect(html).toContain('href="/dashboard/somatic-cards/my-series-slug"');
    expect(html).toContain('My Series');
  });

  it('6. renders card artwork when available, preserving alt text', () => {
    const html = renderToStaticMarkup(
      <CardReadingView
        card={cardDetail({
          cardArtwork: {
            url: 'https://cdn.sanity.io/images/x/y/art.jpg',
            alt: 'Finished artwork alt',
          },
        })}
      />,
    );
    expect(html).toContain('Finished artwork alt');
  });

  it('14. does not render optional sections (Invitation/Purpose/etc.) when absent', () => {
    const html = renderToStaticMarkup(<CardReadingView card={cardDetail()} />);
    expect(html).not.toContain('Invitation');
    expect(html).not.toContain('Purpose');
    expect(html).not.toContain('Gentle Note');
    expect(html).not.toContain('Anchor');
    expect(html).not.toContain('Practice');
    expect(html).not.toContain('What to Notice');
  });

  it('14. does not render Practice section when both practiceSteps and demonstrationSequence are empty', () => {
    const html = renderToStaticMarkup(
      <CardReadingView card={cardDetail({ practiceSteps: [], demonstrationSequence: [] })} />,
    );
    expect(html).not.toContain('>Practice<');
  });

  it("preserves Caroline's wording exactly, without rewriting", () => {
    const exact =
      'Feel your weight sink into whatever is holding you — the chair, the floor, the earth.';
    const html = renderToStaticMarkup(<CardReadingView card={cardDetail({ invitation: exact })} />);
    expect(html).toContain('Feel your weight sink into whatever is holding you');
  });
});

describe('PracticeStepsList', () => {
  it('8. preserves step order', () => {
    const html = renderToStaticMarkup(
      <PracticeStepsList
        steps={[
          { order: 1, instruction: 'Second instruction.' },
          { order: 0, instruction: 'First instruction.' },
        ]}
      />,
    );
    expect(html.indexOf('First instruction.')).toBeLessThan(html.indexOf('Second instruction.'));
  });

  it('9. renders every step, supporting more than 3 items (never assumes exactly 3)', () => {
    const steps = Array.from({ length: 5 }, (_, i) => ({
      order: i,
      instruction: `Step number ${i}.`,
    }));
    const html = renderToStaticMarkup(<PracticeStepsList steps={steps} />);
    for (const s of steps) {
      expect(html).toContain(s.instruction);
    }
  });

  it('renders optional step labels only when present', () => {
    const html = renderToStaticMarkup(
      <PracticeStepsList
        steps={[
          { order: 0, label: 'Step One', instruction: 'Do this.' },
          { order: 1, instruction: 'Do that.' },
        ]}
      />,
    );
    expect(html).toContain('Step One');
    expect(html).toContain('Do this.');
    expect(html).toContain('Do that.');
  });

  it('renders null (nothing) when there are no steps', () => {
    const html = renderToStaticMarkup(<PracticeStepsList steps={[]} />);
    expect(html).toBe('');
  });
});

describe('WhatToNoticeList', () => {
  it('10. preserves order', () => {
    const html = renderToStaticMarkup(
      <WhatToNoticeList
        items={[
          { order: 1, text: 'Notice the second thing.' },
          { order: 0, text: 'Notice the first thing.' },
        ]}
      />,
    );
    expect(html.indexOf('Notice the first thing.')).toBeLessThan(
      html.indexOf('Notice the second thing.'),
    );
  });
});

describe('SupportingImagesGallery', () => {
  it('11. preserves order, 13. preserves alt text and captions', () => {
    const html = renderToStaticMarkup(
      <SupportingImagesGallery
        images={[
          {
            order: 1,
            imageUrl: 'https://cdn.sanity.io/images/x/y/b.jpg',
            imageAlt: 'Second image alt',
            caption: 'Second caption',
          },
          {
            order: 0,
            imageUrl: 'https://cdn.sanity.io/images/x/y/a.jpg',
            imageAlt: 'First image alt',
            caption: 'First caption',
          },
        ]}
      />,
    );
    expect(html.indexOf('First image alt')).toBeLessThan(html.indexOf('Second image alt'));
    expect(html).toContain('First caption');
    expect(html).toContain('Second caption');
  });

  it('does not render a caption element when none is provided', () => {
    const html = renderToStaticMarkup(
      <SupportingImagesGallery
        images={[
          { order: 0, imageUrl: 'https://cdn.sanity.io/images/x/y/a.jpg', imageAlt: 'Alt only' },
        ]}
      />,
    );
    expect(html).not.toContain('<figcaption');
  });
});

describe('DemonstrationSequenceGallery', () => {
  it('12. preserves order, 13. preserves label/instruction/alt text', () => {
    const html = renderToStaticMarkup(
      <DemonstrationSequenceGallery
        frames={[
          {
            order: 1,
            imageUrl: 'https://cdn.sanity.io/images/x/y/b.jpg',
            imageAlt: 'Second frame alt',
            label: 'Frame Two',
            instruction: 'Second instruction.',
          },
          {
            order: 0,
            imageUrl: 'https://cdn.sanity.io/images/x/y/a.jpg',
            imageAlt: 'First frame alt',
            label: 'Frame One',
            instruction: 'First instruction.',
          },
        ]}
      />,
    );
    expect(html.indexOf('Frame One')).toBeLessThan(html.indexOf('Frame Two'));
    expect(html).toContain('First frame alt');
    expect(html).toContain('Second frame alt');
    expect(html).toContain('First instruction.');
    expect(html).toContain('Second instruction.');
  });

  it('never merges with supportingImages into one gallery (kept as a separate component)', () => {
    expect(SupportingImagesGallery).not.toBe(DemonstrationSequenceGallery);
  });
});
