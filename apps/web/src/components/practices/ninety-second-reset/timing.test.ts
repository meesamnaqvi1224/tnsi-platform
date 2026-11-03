import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  AUDIO_DURATION_SECONDS,
  RESET_STAGES,
  formatClock,
  formatDurationLabel,
  progressAt,
  remainingSeconds,
  stageIndexAt,
} from './timing';

const AUDIO_FILE = new URL(
  '../../../../public/audio/practices/90-second-reset.mp3',
  import.meta.url,
);

describe('90-Second Reset: the recording', () => {
  it('is the approved voice-over, unaltered (same bytes as the file that was analysed)', () => {
    expect(statSync(AUDIO_FILE).size).toBe(1485364);
    expect(createHash('md5').update(readFileSync(AUDIO_FILE)).digest('hex')).toBe(
      '32e80d5b4541a87fae5d995128b11c84',
    );
  });

  it('is 92.763 seconds long, as measured', () => {
    expect(AUDIO_DURATION_SECONDS).toBeCloseTo(92.763, 3);
  });
});

describe('90-Second Reset: stage timing', () => {
  it('has the five stages in order, the first at the start and the last inside the recording', () => {
    expect(RESET_STAGES.map((s) => s.name)).toEqual([
      'Arrive',
      'Orient',
      'Find Support',
      'Notice',
      'Return',
    ]);
    expect(RESET_STAGES[0]!.startsAt).toBe(0);
    const starts = RESET_STAGES.map((s) => s.startsAt);
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
    expect(new Set(starts).size).toBe(starts.length);
    expect(Math.max(...starts)).toBeLessThan(AUDIO_DURATION_SECONDS);
  });

  it('uses the stage times measured from the recording, and they are not equal lengths', () => {
    expect(RESET_STAGES.map((s) => s.startsAt)).toEqual([0, 11.36, 25.88, 40.82, 56.32]);
    const ends = [...RESET_STAGES.slice(1).map((s) => s.startsAt), AUDIO_DURATION_SECONDS];
    const lengths = RESET_STAGES.map((s, i) => ends[i]! - s.startsAt);
    expect(new Set(lengths.map((l) => l.toFixed(1))).size).toBe(lengths.length);
  });

  it('finds the stage playing at a given position, changing exactly on each measured boundary', () => {
    expect(stageIndexAt(0)).toBe(0);
    expect(stageIndexAt(11.35)).toBe(0);
    expect(stageIndexAt(11.36)).toBe(1);
    expect(stageIndexAt(25.87)).toBe(1);
    expect(stageIndexAt(25.88)).toBe(2);
    expect(stageIndexAt(40.81)).toBe(2);
    expect(stageIndexAt(40.82)).toBe(3);
    expect(stageIndexAt(56.31)).toBe(3);
    expect(stageIndexAt(56.32)).toBe(4);
    expect(stageIndexAt(AUDIO_DURATION_SECONDS)).toBe(4);
    expect(stageIndexAt(500)).toBe(4);
    expect(stageIndexAt(-5)).toBe(0);
  });
});

describe('90-Second Reset: clocks', () => {
  it('measures progress from 0 to 1 against the recording, and never outside it', () => {
    expect(progressAt(0)).toBe(0);
    expect(progressAt(AUDIO_DURATION_SECONDS / 2)).toBeCloseTo(0.5, 5);
    expect(progressAt(AUDIO_DURATION_SECONDS)).toBe(1);
    expect(progressAt(500)).toBe(1);
    expect(progressAt(-1)).toBe(0);
  });

  it('measures progress against the duration the browser reports, when it differs slightly', () => {
    expect(progressAt(46, 92)).toBe(0.5);
    expect(progressAt(10, 0)).toBe(0);
    expect(progressAt(10, Number.NaN)).toBe(0);
  });

  it('formats the clock as m:ss', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(9)).toBe('0:09');
    expect(formatClock(65)).toBe('1:05');
    expect(formatClock(92.9)).toBe('1:32');
    expect(formatClock(-3)).toBe('0:00');
    expect(formatClock(12.9)).toBe('0:12');
  });

  it('counts the remaining time down to exactly zero and no further', () => {
    expect(remainingSeconds(0)).toBe(93);
    expect(remainingSeconds(0.4)).toBe(93);
    expect(remainingSeconds(91.8)).toBe(1);
    expect(remainingSeconds(AUDIO_DURATION_SECONDS)).toBe(0);
    expect(remainingSeconds(200)).toBe(0);
    expect(remainingSeconds(30, 92)).toBe(62);
  });

  it('labels the length as "1 min 33 sec", derived from the recording, and agrees with the clock', () => {
    expect(formatDurationLabel()).toBe('1 min 33 sec');
    expect(formatDurationLabel(AUDIO_DURATION_SECONDS)).toBe(
      `1 min ${remainingSeconds(0) - 60} sec`,
    );
    expect(formatDurationLabel(120)).toBe('2 min');
    expect(formatDurationLabel(45)).toBe('45 sec');
  });
});
