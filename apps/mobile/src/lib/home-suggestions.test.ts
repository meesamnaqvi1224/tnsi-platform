import { describe, expect, it } from 'vitest';
import { startLabel, suggestionsViewForToday, whyLine } from './home-suggestions';
import type { CheckIn, HomeSuggestions } from '@/api/types';

const checkIn = { id: 'c1' } as unknown as CheckIn;
const item = (kind: 'practice' | 'powerDrop' | 'somaticCard', id: string) => ({
  kind,
  id,
  slug: kind === 'practice' ? null : id,
  title: id,
  description: null,
});
const low: HomeSuggestions = {
  condition: 'Safety',
  items: [item('powerDrop', 'exhale'), item('somaticCard', 'heel'), item('practice', 'root')],
};
const high: HomeSuggestions = {
  condition: 'Availability',
  items: [item('practice', 'forest'), item('powerDrop', 'body'), item('somaticCard', 'near-far')],
};

describe('whyLine (Caroline-approved wording)', () => {
  it('has the approved line for each of the four conditions', () => {
    expect(whyLine('Safety')).toBe(
      'Chosen to help you find steadiness and support in this moment.',
    );
    expect(whyLine('Capacity')).toBe('Chosen to help you pace yourself and recover.');
    expect(whyLine('Availability')).toBe(
      "Chosen to help you notice and reconnect with what's here.",
    );
    expect(whyLine('Expansion')).toBe(
      'Chosen to help you take a small, supported step beyond the familiar.',
    );
  });
  it('falls back to the neutral line for Participation, an unknown condition, or none', () => {
    const fallback = 'Chosen to match how you described your capacity today.';
    expect(whyLine('Participation')).toBe(fallback);
    expect(whyLine('Nonsense')).toBe(fallback);
    expect(whyLine(null)).toBe(fallback);
  });
});

describe('suggestionsViewForToday', () => {
  it('shows the first item as the hero and the rest in order, with the right heading', () => {
    const a = suggestionsViewForToday(checkIn, low)!;
    expect(a.hero.id).toBe('exhale');
    expect(a.more.map((m) => m.id)).toEqual(['heel', 'root']);
    expect(a.moreHeading).toBe('If you have more time');
    expect(a.condition).toBe('Safety');
    const b = suggestionsViewForToday(checkIn, high)!;
    expect(b.hero.id).toBe('forest');
    expect(b.moreHeading).toBe('Or, something shorter');
  });
  it('is null without a check-in today, without suggestions, or with none matched', () => {
    expect(suggestionsViewForToday(null, low)).toBeNull();
    expect(suggestionsViewForToday(checkIn, undefined)).toBeNull();
    expect(suggestionsViewForToday(checkIn, { condition: null, items: [] })).toBeNull();
  });
});

describe('startLabel', () => {
  it('names the action for each kind', () => {
    expect(startLabel('powerDrop', false)).toBe('Start now');
    expect(startLabel('somaticCard', false)).toBe('Open card');
    expect(startLabel('practice', false)).toBe('Start practice');
    expect(startLabel('practice', true)).toBe('View practice');
  });
});
