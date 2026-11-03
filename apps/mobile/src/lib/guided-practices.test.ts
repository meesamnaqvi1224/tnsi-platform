import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  GUIDED_PRACTICES,
  NINETY_SECOND_RESET,
  THE_EMPTY_CHAIR,
  formatClock,
  formatDurationLabel,
  guidedPracticeRoutes,
  progressAt,
  remainingSeconds,
  stageIndexAt,
} from './guided-practices';

const webAudio = (name: string) =>
  new URL(`../../../web/public/audio/practices/${name}`, import.meta.url);

describe('guided practices: the recordings', () => {
  it('bundles the same unaltered MP3s as the web app', () => {
    const reset = webAudio('90-second-reset.mp3');
    const chair = webAudio('the-empty-chair.mp3');
    expect(statSync(reset).size).toBe(1485364);
    expect(createHash('md5').update(readFileSync(reset)).digest('hex')).toBe(
      '32e80d5b4541a87fae5d995128b11c84',
    );
    expect(statSync(chair).size).toBe(4331666);
    expect(createHash('md5').update(readFileSync(chair)).digest('hex')).toBe(
      'db4eead846c7d9115cd68a37e2289bf9',
    );
  });

  it('shows durations derived from the recordings', () => {
    expect(formatDurationLabel(NINETY_SECOND_RESET.durationSeconds)).toBe('1 min 33 sec');
    expect(formatDurationLabel(THE_EMPTY_CHAIR.durationSeconds)).toBe('4 min 31 sec');
  });
});

describe('guided practices: classification and independence', () => {
  it('keeps each practice’s condition and format', () => {
    expect(NINETY_SECOND_RESET.condition).toBe('Safety');
    expect(THE_EMPTY_CHAIR.condition).toBe('Participation');
    expect(THE_EMPTY_CHAIR.format).toBe('Guided Reflection');
  });

  it('gives each practice its own routes, with no link to the other', () => {
    const reset = guidedPracticeRoutes('90-second-reset');
    const chair = guidedPracticeRoutes('the-empty-chair');
    expect(reset).toEqual({
      intro: '/practices/90-second-reset',
      session: '/practices/90-second-reset/session',
      complete: '/practices/90-second-reset/complete',
    });
    expect(chair.intro).toBe('/practices/the-empty-chair');
    expect(JSON.stringify(NINETY_SECOND_RESET)).not.toMatch(/empty-chair|Empty Chair/);
    expect(JSON.stringify(THE_EMPTY_CHAIR)).not.toMatch(/90-second|90-Second/);
    expect(Object.keys(GUIDED_PRACTICES)).toHaveLength(2);
  });

  it('has no score, rating or streak language', () => {
    for (const p of Object.values(GUIDED_PRACTICES)) {
      expect(JSON.stringify(p)).not.toMatch(
        /\b(score|rating|streak|points|level|congratulations)\b/i,
      );
    }
  });
});

describe('guided practices: stage timing', () => {
  it('has the approved stages at the approved start times', () => {
    expect(NINETY_SECOND_RESET.stages.map((s) => [s.name, s.startsAt])).toEqual([
      ['Arrive', 0],
      ['Orient', 11.36],
      ['Find Support', 25.88],
      ['Notice', 40.82],
      ['Return', 56.32],
    ]);
    expect(THE_EMPTY_CHAIR.stages.map((s) => [s.name, s.startsAt])).toEqual([
      ['Arriving', 0],
      ['The Empty Chair', 38.9],
      ['Remembering a Moment', 107.6],
      ['Taking Your Seat Again', 163.6],
      ['Closing', 220.1],
    ]);
  });

  it('starts every stage inside its recording, in increasing order', () => {
    for (const p of Object.values(GUIDED_PRACTICES)) {
      p.stages.forEach((s, i) => {
        expect(s.startsAt).toBeLessThan(p.durationSeconds);
        if (i > 0) expect(s.startsAt).toBeGreaterThan(p.stages[i - 1]!.startsAt);
      });
    }
  });

  it('picks the stage exactly on each boundary', () => {
    const key = (p: typeof THE_EMPTY_CHAIR, t: number) => p.stages[stageIndexAt(p.stages, t)]!.key;
    expect(key(THE_EMPTY_CHAIR, 38.899)).toBe('arriving');
    expect(key(THE_EMPTY_CHAIR, 38.9)).toBe('chair');
    expect(key(THE_EMPTY_CHAIR, 107.6)).toBe('remembering');
    expect(key(THE_EMPTY_CHAIR, 163.6)).toBe('seat');
    expect(key(THE_EMPTY_CHAIR, 220.1)).toBe('closing');
    expect(key(NINETY_SECOND_RESET, 56.31)).toBe('notice');
    expect(key(NINETY_SECOND_RESET, 56.32)).toBe('return');
  });

  it('stays in Closing through the music-only outro, to the end', () => {
    for (const t of [240, 255.64, 262, 270, THE_EMPTY_CHAIR.durationSeconds]) {
      expect(THE_EMPTY_CHAIR.stages[stageIndexAt(THE_EMPTY_CHAIR.stages, t)]!.key).toBe('closing');
    }
  });

  it('follows the position when it jumps forwards and backwards', () => {
    const idx = [10, 200, 50, 120, 270, 0].map((t) => stageIndexAt(THE_EMPTY_CHAIR.stages, t));
    expect(idx).toEqual([0, 3, 1, 2, 4, 0]);
  });
});

describe('guided practices: clocks', () => {
  it('clamps progress and counts remaining time up to the end', () => {
    expect(progressAt(0, 270.675)).toBe(0);
    expect(progressAt(999, 270.675)).toBe(1);
    expect(progressAt(5, 0)).toBe(0);
    expect(formatClock(remainingSeconds(0, 270.675))).toBe('4:31');
    expect(remainingSeconds(270.675, 270.675)).toBe(0);
    expect(formatClock(65.9)).toBe('1:05');
    expect(formatClock(-4)).toBe('0:00');
  });
});
