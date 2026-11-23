import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { exerciseInteractiveKey, guidedExerciseSlug, parseGuidedExercise } from './exercise';

/**
 * The exercises in `content/exercises/exercises-v1.json` are what gets imported into the CMS. This
 * fails if any of them stops being something the apps will accept (a half-valid exercise would show
 * "not available"), and checks each practice record points at an exercise that exists.
 */
const manifest = JSON.parse(
  readFileSync(new URL('../../../../content/exercises/exercises-v1.json', import.meta.url), 'utf8'),
) as { exercises: unknown[]; practices: { slug: string; tags: string[] }[] };

describe('content/exercises/exercises-v1.json', () => {
  it('has only exercises the apps will accept', () => {
    expect(manifest.exercises.length).toBeGreaterThan(0);
    for (const raw of manifest.exercises) {
      const parsed = parseGuidedExercise(raw);
      expect(parsed, `exercise ${(raw as { slug?: string }).slug}`).not.toBeNull();
    }
  });

  it('gives every exercise exactly one practice record, tagged with a condition', () => {
    const slugs = manifest.exercises.map((e) => (e as { slug: string }).slug).sort();
    expect(manifest.practices.map((p) => p.slug).sort()).toEqual(slugs);
    for (const p of manifest.practices) {
      expect(p.tags.length).toBeGreaterThan(0);
      expect(
        guidedExerciseSlug({
          contentType: 'interactive',
          interactiveKey: exerciseInteractiveKey(p.slug),
        }),
      ).toBe(p.slug);
    }
  });

  it('keeps the before/after exercise comparing two scales of the same length', () => {
    const e = parseGuidedExercise(
      manifest.exercises.find((x) => (x as { slug: string }).slug === 'state-before-after'),
    );
    expect(e?.summary?.compare).toHaveLength(1);
  });
});
