import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sanityFetch = vi.fn();
const getLatestCheckIn = vi.fn();
vi.mock('@tnsi/cms/server', () => ({ sanityFetch: (q: string) => sanityFetch(q) }));
vi.mock('./check-ins', () => ({ getLatestCheckIn: (u: string) => getLatestCheckIn(u) }));

import { HET_WHY_FALLBACK, hetWhyLine } from '@tnsi/core';
import { getHetSuggestions } from './het-suggestions';
import type { PracticeSummary } from './practices';

const practice = {
  id: 'p1',
  title: 'The Mountain State',
  description: 'steady',
  tags: ['Capacity', 'Safety'],
  isFree: false,
} as unknown as PracticeSummary;

const drops = [
  {
    id: 'd-free',
    title: 'Exhale',
    slug: 'exhale',
    description: 'x',
    tags: ['Safety', 'Capacity'],
    isFree: true,
  },
  {
    id: 'd-paid',
    title: 'Softness',
    slug: 'softness',
    description: 'y',
    tags: ['Safety'],
    isFree: false,
  },
];
const cards = [
  { id: 'c1', title: 'Heel Press', slug: 'heel-press', description: 'z', tags: ['Safety'] },
];

beforeEach(() => {
  sanityFetch.mockReset();
  getLatestCheckIn.mockReset();
  sanityFetch.mockImplementation(async (q: string) => (q.includes('powerDrop') ? drops : cards));
  getLatestCheckIn.mockResolvedValue({ capacityScore: 1, completedDate: new Date('2026-11-18') });
});

describe('getHetSuggestions', () => {
  it('offers a PowerDrop, a card and the guided practice, brief items first, for a low answer', async () => {
    const r = await getHetSuggestions('u1', { practice });
    expect(r.items.map((i) => i.kind)).toEqual(['powerDrop', 'somaticCard', 'practice']);
    expect(r.condition).toBe('Safety');
    expect(r.items[1]).toMatchObject({ slug: 'heel-press', title: 'Heel Press' });
    expect(r.items[2]).toMatchObject({ id: 'p1', slug: null });
  });

  it('leads with the guided practice for a higher answer', async () => {
    getLatestCheckIn.mockResolvedValue({ capacityScore: 3, completedDate: new Date('2026-11-18') });
    const r = await getHetSuggestions('u1', { practice });
    expect(r.items[0]!.kind).toBe('practice');
  });

  it('a free-tier member is only offered free PowerDrops', async () => {
    const r = await getHetSuggestions('u1', { practice, freeOnly: true });
    const drop = r.items.find((i) => i.kind === 'powerDrop');
    expect(drop?.id).toBe('d-free');
  });

  it('suggests nothing without a check-in, and never throws when the CMS fails', async () => {
    getLatestCheckIn.mockResolvedValue(null);
    expect(await getHetSuggestions('u1', { practice })).toEqual({ condition: null, items: [] });
    getLatestCheckIn.mockResolvedValue({ capacityScore: 1, completedDate: new Date('2026-11-18') });
    sanityFetch.mockRejectedValue(new Error('down'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await getHetSuggestions('u1', { practice })).toEqual({ condition: null, items: [] });
  });

  it('still returns the practice when the CMS is unconfigured (null results)', async () => {
    sanityFetch.mockResolvedValue(null);
    const r = await getHetSuggestions('u1', { practice });
    expect(r.items.map((i) => i.kind)).toEqual(['practice']);
  });
});

describe('getHetSuggestions with the check-in follow-up', () => {
  afterEach(() => vi.unstubAllEnvs());

  // A small library holding the practices Caroline named for "I can't switch off".
  const items = [
    {
      kind: 'somaticCard',
      id: 'c-sigh',
      title: 'The Physiological Sigh',
      slug: 'the-physiological-sigh',
      description: 's',
      patterns: ['functional-overdrive'],
      isFree: true,
    },
    {
      kind: 'somaticCard',
      id: 'c-horizon',
      title: 'The Horizon Lock',
      slug: 'the-horizon-lock',
      description: 'h',
      patterns: ['functional-overdrive', 'hypervigilance'],
      isFree: true,
    },
    {
      kind: 'powerDrop',
      id: 'd-locked',
      title: 'Locked Drop',
      slug: 'locked-drop',
      description: 'l',
      patterns: ['hypervigilance'],
      isFree: false,
    },
  ];
  const settle = { v: 1, path: 'pattern', pattern: 'functional-overdrive' };

  const arrange = (followUp: unknown, capacityScore = 2, extra: Record<string, unknown> = {}) => {
    getLatestCheckIn.mockResolvedValue({
      capacityScore,
      completedDate: new Date('2026-11-24'),
      metadata: followUp ? { followUp } : {},
    });
    sanityFetch.mockImplementation(async (q: string) => {
      if (q.includes('"kind": _type')) return items;
      return q.includes('powerDrop') ? drops : cards;
    });
    return extra;
  };

  it('does nothing different while the feature is off, even if an answer is stored', async () => {
    arrange(settle);
    const r = await getHetSuggestions('u1', { practice });
    expect(r.items.map((i) => i.kind)).toEqual(['powerDrop', 'somaticCard', 'practice']);
  });

  it('a settle answer shows exactly the two named practices, in order', async () => {
    vi.stubEnv('CHECKIN_FOLLOW_UP_ENABLED', 'true');
    arrange(settle);
    const r = await getHetSuggestions('u1', { practice });
    expect(r.items.map((i) => i.slug)).toEqual(['the-physiological-sigh', 'the-horizon-lock']);
    expect(r.items.every((i) => i.kind === 'somaticCard')).toBe(true);
    expect(r.condition).toBeNull();
  });

  it('"not sure" shows the fixed pair', async () => {
    vi.stubEnv('CHECKIN_FOLLOW_UP_ENABLED', 'true');
    arrange({ v: 1, path: 'unsure' }, 1);
    const r = await getHetSuggestions('u1', { practice });
    expect(r.items.map((i) => i.slug)).toEqual(['the-physiological-sigh', 'the-horizon-lock']);
  });

  it('fills a gap from the answer-only items when a named practice is missing', async () => {
    vi.stubEnv('CHECKIN_FOLLOW_UP_ENABLED', 'true');
    arrange(settle);
    sanityFetch.mockImplementation(async (q: string) => {
      if (q.includes('"kind": _type')) return items.filter((i) => i.slug !== 'the-horizon-lock');
      return q.includes('powerDrop') ? drops : cards;
    });
    const r = await getHetSuggestions('u1', { practice });
    expect(r.items).toHaveLength(2);
    expect(r.items[0]!.slug).toBe('the-physiological-sigh');
  });

  it('falls back to the answer-only suggestions when the follow-up list cannot be loaded', async () => {
    vi.stubEnv('CHECKIN_FOLLOW_UP_ENABLED', 'true');
    arrange(settle);
    sanityFetch.mockImplementation(async (q: string) => {
      if (q.includes('"kind": _type')) return null;
      return q.includes('powerDrop') ? drops : cards;
    });
    const r = await getHetSuggestions('u1', { practice });
    expect(r.items.length).toBeGreaterThan(0);
  });

  it('a grow answer for Participation reports no condition, so the neutral reason line shows', async () => {
    // How a grow choice reorders the ranking for every kind is tested in @tnsi/core; what matters here
    // is that a Participation choice never names another condition (see the reason-line tests below).
    vi.stubEnv('CHECKIN_FOLLOW_UP_ENABLED', 'true');
    arrange({ v: 1, path: 'grow', growArea: 'participation' }, 4);
    const participationPractice = {
      ...practice,
      id: 'p-part',
      tags: ['Participation'],
    } as unknown as PracticeSummary;
    const r = await getHetSuggestions('u1', { practice: participationPractice });
    expect(r.condition).toBeNull();
  });
});

describe('getHetSuggestions: website versus app for "I\'m irritated and on edge"', () => {
  afterEach(() => vi.unstubAllEnvs());

  const rows = [
    {
      kind: 'somaticCard',
      id: 'c-cool',
      title: 'The Cool Contact Reset',
      slug: 'the-cool-contact-reset',
      description: 'c',
      patterns: [],
      isFree: true,
    },
    {
      kind: 'powerDrop',
      id: 'd-exhale',
      title: 'The Exhale Drop',
      slug: 'the-90-second-exhale-drop',
      description: 'e',
      patterns: [],
      isFree: true,
    },
    {
      kind: 'somaticCard',
      id: 'c-exhale-drop',
      title: 'The Exhale-and-Drop',
      slug: 'the-exhale-and-drop',
      description: 'x',
      patterns: [],
      isFree: true,
    },
  ];
  const angry = { v: 1, path: 'pattern', pattern: 'protective-anger-reactivity' };

  beforeEach(() => {
    vi.stubEnv('CHECKIN_FOLLOW_UP_ENABLED', 'true');
    getLatestCheckIn.mockResolvedValue({
      capacityScore: 2,
      completedDate: new Date('2026-11-25'),
      metadata: { followUp: angry },
    });
    sanityFetch.mockImplementation(async (q: string) => {
      if (q.includes('"kind": _type')) return rows;
      return q.includes('powerDrop') ? drops : cards;
    });
  });

  it("the app gets Caroline's exact pair, including the PowerDrop", async () => {
    const r = await getHetSuggestions('u1', { practice, surface: 'app' });
    expect(r.items.map((i) => i.title)).toEqual(['The Cool Contact Reset', 'The Exhale Drop']);
  });

  it('the app is the default when no surface is given', async () => {
    const r = await getHetSuggestions('u1', { practice });
    expect(r.items.map((i) => i.title)).toEqual(['The Cool Contact Reset', 'The Exhale Drop']);
  });

  it('the website gets two cards: The Exhale-and-Drop fills the PowerDrop slot', async () => {
    const r = await getHetSuggestions('u1', { practice, surface: 'web' });
    expect(r.items.map((i) => i.title)).toEqual(['The Cool Contact Reset', 'The Exhale-and-Drop']);
    expect(r.items.every((i) => i.kind === 'somaticCard')).toBe(true);
  });
});

describe('getHetSuggestions: the website shows a second card instead of a PowerDrop', () => {
  const manyCards = [
    { id: 'c1', title: 'Heel Press', slug: 'heel-press', description: 'a', tags: ['Safety'] },
    {
      id: 'c2',
      title: 'Wall Press',
      slug: 'wall-press',
      description: 'b',
      tags: ['Safety', 'Capacity'],
    },
    { id: 'c3', title: 'Sway', slug: 'sway', description: 'c', tags: ['Capacity'] },
  ];

  beforeEach(() => {
    sanityFetch.mockImplementation(async (q: string) =>
      q.includes('powerDrop') ? drops : manyCards,
    );
  });

  it('the app is unchanged: the guided practice, a PowerDrop and one card', async () => {
    getLatestCheckIn.mockResolvedValue({ capacityScore: 3, completedDate: new Date('2026-11-25') });
    const r = await getHetSuggestions('u1', { practice, surface: 'app' });
    expect(r.items.map((i) => i.kind)).toEqual(['practice', 'powerDrop', 'somaticCard']);
  });

  it('the app is the default when no surface is given', async () => {
    getLatestCheckIn.mockResolvedValue({ capacityScore: 3, completedDate: new Date('2026-11-25') });
    const r = await getHetSuggestions('u1', { practice });
    expect(r.items.map((i) => i.kind)).toEqual(['practice', 'powerDrop', 'somaticCard']);
  });

  it('the website gets no PowerDrop and two different cards', async () => {
    for (const capacityScore of [1, 2, 3, 4, 5]) {
      getLatestCheckIn.mockResolvedValue({ capacityScore, completedDate: new Date('2026-11-25') });
      const r = await getHetSuggestions('u1', { practice, surface: 'web' });
      const cardRows = r.items.filter((i) => i.kind === 'somaticCard');
      expect(r.items.some((i) => i.kind === 'powerDrop')).toBe(false);
      expect(cardRows).toHaveLength(2);
      expect(cardRows[1]!.id).not.toBe(cardRows[0]!.id);
    }
  });

  it('for a low answer the website leads with the cards, as the app leads with the brief items', async () => {
    getLatestCheckIn.mockResolvedValue({ capacityScore: 1, completedDate: new Date('2026-11-25') });
    const r = await getHetSuggestions('u1', { practice, surface: 'web' });
    expect(r.items.map((i) => i.kind)).toEqual(['somaticCard', 'somaticCard', 'practice']);
  });
});

describe('getHetSuggestions: the reason line follows the card the website shows', () => {
  afterEach(() => vi.unstubAllEnvs());

  const expansionCards = [
    {
      id: 'c1',
      title: 'Rib Expansion',
      slug: 'rib-expansion',
      description: 'a',
      tags: ['Expansion'],
    },
    {
      id: 'c2',
      title: 'Weight Shift',
      slug: 'weight-shift',
      description: 'b',
      tags: ['Expansion', 'Capacity'],
    },
    { id: 'c3', title: 'Heel Press', slug: 'heel-press', description: 'c', tags: ['Safety'] },
  ];
  const participationPractice = {
    id: 'p-part',
    title: 'The Empty Chair',
    description: 'x',
    tags: ['Participation'],
    isFree: false,
  } as unknown as PracticeSummary;

  const arrange = (capacityScore: number, followUp?: unknown) => {
    getLatestCheckIn.mockResolvedValue({
      capacityScore,
      completedDate: new Date('2026-11-25'),
      metadata: followUp ? { followUp } : {},
    });
    sanityFetch.mockImplementation(async (q: string) =>
      q.includes('powerDrop') ? drops : expansionCards,
    );
  };

  it('at answer 5 the website line describes the first card, not the hidden practice', async () => {
    arrange(5);
    const web = await getHetSuggestions('u1', { practice: participationPractice, surface: 'web' });
    expect(web.condition).toBe('Expansion');
    expect(hetWhyLine(web.condition)).not.toBe(HET_WHY_FALLBACK);
  });

  it('the app is unchanged: its line still follows the first suggestion (the practice)', async () => {
    arrange(5);
    const app = await getHetSuggestions('u1', { practice: participationPractice, surface: 'app' });
    expect(app.condition).toBe('Participation');
    expect(hetWhyLine(app.condition)).toBe(HET_WHY_FALLBACK);
    const dflt = await getHetSuggestions('u1', { practice: participationPractice });
    expect(dflt.condition).toBe('Participation');
  });

  it('for the low answers the app line follows its PowerDrop and the website line follows its card', async () => {
    arrange(1);
    const app = await getHetSuggestions('u1', { practice, surface: 'app' });
    const web = await getHetSuggestions('u1', { practice, surface: 'web' });
    expect(app.items[0]!.kind).toBe('powerDrop');
    expect(web.items[0]!.kind).toBe('somaticCard');
    expect(web.condition).toBe('Safety');
  });

  it('when the member chose "Show up more fully in my life" the line is always the neutral one', async () => {
    vi.stubEnv('CHECKIN_FOLLOW_UP_ENABLED', 'true');
    const participation = { v: 1, path: 'grow', growArea: 'participation' };
    for (const capacityScore of [3, 4, 5]) {
      arrange(capacityScore, participation);
      for (const surface of ['web', 'app'] as const) {
        const r = await getHetSuggestions('u1', { practice: participationPractice, surface });
        expect(r.condition).toBeNull();
        expect(hetWhyLine(r.condition)).toBe(HET_WHY_FALLBACK);
      }
    }
  });

  it('the exception is only for that choice: Explore what is possible now follows the card', async () => {
    vi.stubEnv('CHECKIN_FOLLOW_UP_ENABLED', 'true');
    arrange(4, { v: 1, path: 'grow', growArea: 'expansion' });
    const web = await getHetSuggestions('u1', { practice: participationPractice, surface: 'web' });
    expect(web.condition).toBe('Expansion');
  });

  it('with the follow-up off, a stored Participation choice changes nothing', async () => {
    arrange(5, { v: 1, path: 'grow', growArea: 'participation' });
    const web = await getHetSuggestions('u1', { practice: participationPractice, surface: 'web' });
    expect(web.condition).toBe('Expansion');
  });
});
