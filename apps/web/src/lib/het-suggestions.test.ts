import { beforeEach, describe, expect, it, vi } from 'vitest';

const sanityFetch = vi.fn();
const getLatestCheckIn = vi.fn();
vi.mock('@tnsi/cms/server', () => ({ sanityFetch: (q: string) => sanityFetch(q) }));
vi.mock('./check-ins', () => ({ getLatestCheckIn: (u: string) => getLatestCheckIn(u) }));

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
