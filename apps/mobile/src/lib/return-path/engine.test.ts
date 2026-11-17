import { describe, expect, it } from 'vitest';
import {
  LEVEL_IDS,
  LEVELS,
  pathLengthForProgress,
  pointAtLength,
  type LevelId,
  type Point,
} from '@tnsi/core';
import { ReturnPathEngine, type ReachedEvent } from './engine';

/** Where a finger `ahead` units further along the path would be (outward once returning). */
function fingerAhead(engine: ReturnPathEngine, ahead: number): Point {
  const g = engine.geometry;
  const s = pathLengthForProgress(g, engine.progress);
  return pointAtLength(g, engine.movingOutward ? s - ahead : s + ahead);
}

/** Traces with a finger until the next pause or the end; returns every event. */
function traceToNextStop(engine: ReturnPathEngine): ReachedEvent[] {
  const events: ReachedEvent[] = [];
  for (let i = 0; i < 20000 && engine.phase === 'trace'; i++) {
    events.push(...engine.follow(fingerAhead(engine, 6)));
  }
  return events;
}

describe('ReturnPathEngine', () => {
  it.each(LEVEL_IDS)(
    'level %i: a finger on the line visits every marker in order, then completes',
    (level: LevelId) => {
      const engine = new ReturnPathEngine(level);
      const { inCheckpoints, outCheckpoints } = LEVELS[level];
      const kinds: string[] = [];
      const markerNumbers: number[] = [];

      for (let stops = 0; engine.phase !== 'complete'; stops++) {
        expect(stops).toBeLessThan(50);
        const events = traceToNextStop(engine);
        expect(events).toHaveLength(1);
        kinds.push(events[0]!.checkpoint.kind);
        markerNumbers.push(events[0]!.markerNumber);
        if (engine.phase === 'pause') engine.resume();
      }

      expect(kinds).toEqual([
        ...Array(inCheckpoints).fill('in'),
        'centre',
        ...Array(outCheckpoints).fill('out'),
        'end',
      ]);
      // Markers are numbered across the inward and return trace; the centre and end are 0.
      expect(markerNumbers).toEqual([
        ...Array.from({ length: inCheckpoints }, (_, i) => i + 1),
        0,
        ...Array.from({ length: outCheckpoints }, (_, i) => inCheckpoints + i + 1),
        0,
      ]);
      expect(engine.fraction).toBeCloseTo(1, 5);
    },
  );

  it('stops at a marker: the head cannot pass it and nothing moves during the pause', () => {
    const engine = new ReturnPathEngine(2);
    const marker = engine.checkpoints[0]!.p;
    traceToNextStop(engine);
    expect(engine.phase).toBe('pause');
    expect(engine.progress).toBeCloseTo(marker, 5);

    const before = engine.progress;
    expect(engine.follow(fingerAhead(engine, 6))).toEqual([]);
    expect(engine.advanceTo(before + 500)).toEqual([]);
    expect(engine.progress).toBe(before);
  });

  it('cannot be skipped past a marker by a long jump ("Guide me" or a fast finger)', () => {
    const engine = new ReturnPathEngine(1);
    const first = engine.checkpoints[0]!.p;
    const events = engine.advanceTo(first * 3);
    expect(engine.progress).toBe(first);
    expect(events).toHaveLength(1);
    expect(events[0]!.checkpoint.kind).toBe('in');
  });

  it('ignores a touch that is off the line (going off the path does nothing)', () => {
    const engine = new ReturnPathEngine(2);
    expect(engine.follow([5, 5])).toEqual([]);
    expect(engine.progress).toBe(0);
  });

  it('only picks the head up when the first touch is near it', () => {
    const engine = new ReturnPathEngine(2);
    const [hx, hy] = engine.head();
    expect(engine.canGrab([hx, hy])).toBe(true);
    expect(engine.canGrab([hx + 10, hy])).toBe(true);
    expect(engine.canGrab([200, 200])).toBe(false);
  });

  it('does not let the head be picked up during a pause', () => {
    const engine = new ReturnPathEngine(1);
    traceToNextStop(engine);
    expect(engine.phase).toBe('pause');
    const [hx, hy] = engine.head();
    expect(engine.canGrab([hx, hy])).toBe(false);
  });

  it('never moves backwards, and the return trace goes outward', () => {
    const engine = new ReturnPathEngine(2);
    let last = 0;
    let sawReturn = false;
    for (let stops = 0; engine.phase !== 'complete'; stops++) {
      expect(stops).toBeLessThan(50);
      traceToNextStop(engine);
      expect(engine.progress).toBeGreaterThanOrEqual(last);
      last = engine.progress;
      if (engine.returning) sawReturn = true;
      if (engine.phase === 'pause') engine.resume();
    }
    expect(sawReturn).toBe(true);
  });

  it('resume() says whether the pause was the centre (the next movement is outward)', () => {
    const engine = new ReturnPathEngine(1);
    const centreIndex = engine.checkpoints.findIndex((c) => c.kind === 'centre');
    for (let i = 0; i < centreIndex; i++) {
      traceToNextStop(engine);
      expect(engine.resume().fromCentre).toBe(false);
    }
    traceToNextStop(engine);
    expect(engine.progress).toBeCloseTo(engine.geometry.L, 5);
    expect(engine.resume().fromCentre).toBe(true);
    expect(engine.phase).toBe('trace');
  });

  it('is deterministic: two runs on the same level reach the same markers', () => {
    const a = new ReturnPathEngine(3);
    const b = new ReturnPathEngine(3);
    expect(a.checkpoints).toEqual(b.checkpoints);
    expect(a.geometry.d).toBe(b.geometry.d);
  });
});
