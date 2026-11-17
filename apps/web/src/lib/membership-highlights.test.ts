import { describe, expect, it, vi } from 'vitest';
import { RETURN_PATH_KEY } from '@tnsi/core';

vi.mock('@/lib/practices', () => ({
  formatContentTypeLabel: (type: string) => type,
  getCompletedPracticeCount: vi.fn(),
  getInProgressPracticeCount: vi.fn(),
  getPublishedPractices: vi.fn(),
  getSavedPractices: vi.fn(),
}));

const { pickStarterPractices } = await import('./membership-highlights');

function practice(id: string, contentType: string, interactiveKey: string | null = null) {
  return {
    id,
    title: id,
    description: null,
    contentType,
    mediaUrl: null,
    interactiveKey,
    thumbnailUrl: null,
    durationSeconds: null,
    category: null,
    tags: [],
    difficulty: 1,
    isFree: false,
  };
}

describe('pickStarterPractices', () => {
  it('leads with The Return Path, then prefers a different kind of practice each time', () => {
    const picked = pickStarterPractices([
      practice('v1', 'video'),
      practice('v2', 'video'),
      practice('a1', 'audio'),
      practice('rp', 'interactive', RETURN_PATH_KEY),
    ]);
    expect(picked.map((p) => p.id)).toEqual(['rp', 'v1', 'a1']);
  });

  it('fills the remaining places in library order when the kinds run out', () => {
    const picked = pickStarterPractices([
      practice('v1', 'video'),
      practice('v2', 'video'),
      practice('v3', 'video'),
    ]);
    expect(picked.map((p) => p.id)).toEqual(['v1', 'v2', 'v3']);
  });

  it('returns nothing for an empty library and never invents a practice', () => {
    expect(pickStarterPractices([])).toEqual([]);
  });

  it('does not pick another interactive practice as The Return Path', () => {
    const picked = pickStarterPractices([practice('other', 'interactive', 'something-else')]);
    expect(picked.map((p) => p.id)).toEqual(['other']);
  });
});
