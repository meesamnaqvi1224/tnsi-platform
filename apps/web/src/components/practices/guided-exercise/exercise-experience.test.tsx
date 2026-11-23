import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseGuidedExercise } from '@tnsi/core';

/**
 * The reusable exercise screen: the opening screen shows the exercise's own words and promises that
 * answers stay on the device, and the source holds the behaviours a server render cannot run (focus,
 * recording completion once, and never sending an answer anywhere).
 */

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: () => undefined }) }));

const { ExerciseExperience, EXERCISE_UI } = await import('./exercise-experience');
const { readFileSync } = await import('node:fs');
const source = readFileSync(new URL('./exercise-experience.tsx', import.meta.url), 'utf8');
const recorder = readFileSync(
  new URL('../../../lib/record-exercise-completion.ts', import.meta.url),
  'utf8',
);

const exercise = parseGuidedExercise({
  slug: 'early-warning-signs',
  title: 'Early Warning Signs',
  subtitle: 'Noticing sooner',
  intro: 'Notice the first signs that your system is getting stretched.',
  durationLabel: 'About 3 minutes',
  steps: [{ id: 'a', type: 'prompt', body: 'Take a breath.' }],
  closing: { heading: 'All done', message: 'That is enough for now.' },
})!;

const html = renderToStaticMarkup(<ExerciseExperience exercise={exercise} />);
const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

describe('ExerciseExperience: opening screen', () => {
  it('shows the exercise title, subtitle, introduction and length', () => {
    expect(text).toContain('Early Warning Signs');
    expect(text).toContain('Noticing sooner');
    expect(text).toContain('Notice the first signs that your system is getting stretched.');
    expect(text).toContain('About 3 minutes');
  });

  it('tells the member their answers are not saved, and offers one way forward and one way out', () => {
    expect(text).toContain(EXERCISE_UI.onlyHere);
    expect(text).toContain(EXERCISE_UI.begin);
    expect(html).toContain('href="/dashboard/practices"');
  });
});

describe('ExerciseExperience: behaviour', () => {
  it('records completion once, when the closing screen is reached, and only the slug is sent', () => {
    expect(source).toContain('recordExerciseCompletion(exercise.slug)');
    expect(source).toContain('recorded.current');
    expect(recorder).toContain('body: JSON.stringify({ completed: true, progressPct: 1 })');
    expect(recorder).toContain('(slug: string)');
  });

  it('keeps answers in memory only: no storage and no request carries them', () => {
    expect(source).not.toMatch(/localStorage|sessionStorage|indexedDB|document\.cookie/);
    expect(source).not.toMatch(/fetch\(/);
  });

  it('moves focus to each new screen heading and labels its controls', () => {
    expect(source).toContain('headingRef.current?.focus()');
    expect(source).toContain('role="progressbar"');
    expect(source).toContain('radiogroup');
  });
});
