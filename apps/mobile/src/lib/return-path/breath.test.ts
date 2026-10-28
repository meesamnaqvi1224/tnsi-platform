import { describe, expect, it } from 'vitest';
import { buildBreathPhases, checkpointLine, countLabel, noBreathSeconds } from './breath';

const timings = { inhaleSeconds: 4, pauseSeconds: 2, exhaleSeconds: 6 };
const cues = { cueIn: 'Breathe in', cuePause: 'Pause', cueOut: 'Breathe out' };

describe('buildBreathPhases', () => {
  it('one breath is in then out (default: 4 and 6 seconds)', () => {
    expect(buildBreathPhases(1, false, timings, cues)).toEqual([
      { cue: 'Breathe in', seconds: 4, grow: true, cycle: 0 },
      { cue: 'Breathe out', seconds: 6, grow: false, cycle: 0 },
    ]);
  });

  it('the gentle pause adds a hold between in and out, per breath', () => {
    const phases = buildBreathPhases(2, true, timings, cues);
    expect(phases.map((p) => p.cue)).toEqual([
      'Breathe in',
      'Pause',
      'Breathe out',
      'Breathe in',
      'Pause',
      'Breathe out',
    ]);
    expect(phases.filter((p) => p.grow === null).every((p) => p.seconds === 2)).toBe(true);
    expect(phases.map((p) => p.cycle)).toEqual([0, 0, 0, 1, 1, 1]);
  });

  it('the centre pause of three breaths runs 30 seconds, or 36 with the gentle pause', () => {
    const total = (pause: boolean) =>
      buildBreathPhases(3, pause, timings, cues).reduce((sum, p) => sum + p.seconds, 0);
    expect(total(false)).toBe(30);
    expect(total(true)).toBe(36);
  });
});

describe('countLabel', () => {
  it('shows only the count for a single breath', () => {
    expect(countLabel(3, 0, 1)).toBe('3');
  });
  it('adds the breath number when there are several', () => {
    expect(countLabel(5, 1, 3)).toBe('5  ·  breath 2 of 3');
  });
});

describe('noBreathSeconds / checkpointLine', () => {
  it('uses the longer pause at the centre', () => {
    const t = { noBreathMarkerSeconds: 8, noBreathCentreSeconds: 14 };
    expect(noBreathSeconds(false, t)).toBe(8);
    expect(noBreathSeconds(true, t)).toBe(14);
  });

  it('cycles through the lines and chooses the list by the breath setting', () => {
    const lines = { breathLines: ['a', 'b'], noBreathLines: ['x', 'y', 'z'] };
    expect(checkpointLine(1, false, lines)).toBe('a');
    expect(checkpointLine(3, false, lines)).toBe('a');
    expect(checkpointLine(2, true, lines)).toBe('y');
    expect(checkpointLine(4, true, lines)).toBe('x');
  });
});
