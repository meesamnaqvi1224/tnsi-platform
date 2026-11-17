import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  CHAIR_AUDIO_DURATION_SECONDS,
  CHAIR_STAGES,
  chairDurationLabel,
  chairProgressAt,
  chairRemainingSeconds,
  chairStageIndexAt,
  formatClock,
} from './timing';

const AUDIO_FILE = new URL(
  '../../../../public/audio/practices/the-empty-chair.mp3',
  import.meta.url,
);

describe('The Empty Chair: the recording', () => {
  it('is the approved voice-over, unaltered (same bytes as the file that was analysed)', () => {
    expect(statSync(AUDIO_FILE).size).toBe(4331666);
    expect(createHash('md5').update(readFileSync(AUDIO_FILE)).digest('hex')).toBe(
      'db4eead846c7d9115cd68a37e2289bf9',
    );
  });

  it('is 270.675 seconds long, shown as 4 min 31 sec', () => {
    expect(CHAIR_AUDIO_DURATION_SECONDS).toBeCloseTo(270.675, 3);
    expect(chairDurationLabel()).toBe('4 min 31 sec');
    expect(formatClock(Math.ceil(CHAIR_AUDIO_DURATION_SECONDS))).toBe('4:31');
  });
});

describe('The Empty Chair: stage timing', () => {
  it('has the five stages, in order, at the approved start times', () => {
    expect(CHAIR_STAGES.map((s) => [s.name, s.startsAt])).toEqual([
      ['Arriving', 0],
      ['The Empty Chair', 38.9],
      ['Remembering a Moment', 107.6],
      ['Taking Your Seat Again', 163.6],
      ['Closing', 220.1],
    ]);
  });

  it('shows the approved display times (0:00, 0:39, 1:48, 2:44, 3:40)', () => {
    // Rounded to the nearest second, as in the brief's table.
    expect(CHAIR_STAGES.map((s) => formatClock(Math.round(s.startsAt)))).toEqual([
      '0:00',
      '0:39',
      '1:48',
      '2:44',
      '3:40',
    ]);
  });

  it('starts every stage before the recording ends, in increasing order', () => {
    CHAIR_STAGES.forEach((s, i) => {
      expect(s.startsAt).toBeLessThan(CHAIR_AUDIO_DURATION_SECONDS);
      if (i > 0) expect(s.startsAt).toBeGreaterThan(CHAIR_STAGES[i - 1]!.startsAt);
    });
  });

  it('picks the stage for a position, exactly on each boundary', () => {
    const at = (t: number) => CHAIR_STAGES[chairStageIndexAt(t)]!.key;
    expect(at(0)).toBe('arriving');
    expect(at(38.899)).toBe('arriving');
    expect(at(38.9)).toBe('chair');
    expect(at(107.599)).toBe('chair');
    expect(at(107.6)).toBe('remembering');
    expect(at(163.599)).toBe('remembering');
    expect(at(163.6)).toBe('seat');
    expect(at(220.099)).toBe('seat');
    expect(at(220.1)).toBe('closing');
  });

  it('stays in Closing through the voice finishing and the music-only outro, to the very end', () => {
    // The voice ends near 255.6 s; the recording runs to 270.675 s.
    for (const t of [240, 255.64, 256, 262, 270, CHAIR_AUDIO_DURATION_SECONDS]) {
      expect(CHAIR_STAGES[chairStageIndexAt(t)]!.key).toBe('closing');
    }
  });

  it('follows the position when the listener seeks forwards and backwards', () => {
    const path = [10, 200, 50, 120, 270, 0, 164, 39];
    const keys = path.map((t) => CHAIR_STAGES[chairStageIndexAt(t)]!.key);
    expect(keys).toEqual([
      'arriving',
      'seat',
      'chair',
      'remembering',
      'closing',
      'arriving',
      'seat',
      'chair',
    ]);
  });

  it('is a pure function of the position: the same position always gives the same stage', () => {
    // Pausing, resuming or returning to a background tab changes nothing but `currentTime`.
    expect(chairStageIndexAt(150)).toBe(chairStageIndexAt(150));
    expect(chairStageIndexAt(-5)).toBe(0);
  });
});

describe('The Empty Chair: progress and clocks', () => {
  it('runs 0 to 1 and is clamped', () => {
    expect(chairProgressAt(0)).toBe(0);
    expect(chairProgressAt(CHAIR_AUDIO_DURATION_SECONDS / 2)).toBeCloseTo(0.5, 5);
    expect(chairProgressAt(CHAIR_AUDIO_DURATION_SECONDS)).toBe(1);
    expect(chairProgressAt(999)).toBe(1);
    expect(chairProgressAt(-3)).toBe(0);
    expect(chairProgressAt(5, 0)).toBe(0);
  });

  it('counts the remaining time down to exactly 0:00 only at the very end', () => {
    expect(formatClock(chairRemainingSeconds(0))).toBe('4:31');
    expect(formatClock(chairRemainingSeconds(CHAIR_AUDIO_DURATION_SECONDS - 0.2))).toBe('0:01');
    expect(chairRemainingSeconds(CHAIR_AUDIO_DURATION_SECONDS)).toBe(0);
  });

  it('formats elapsed time as m:ss', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(65.9)).toBe('1:05');
    expect(formatClock(-4)).toBe('0:00');
  });
});
