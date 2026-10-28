import { describe, expect, it } from 'vitest';
import {
  LEVEL_IDS,
  buildCheckpoints,
  followPointer,
  geometryFor,
  headPoint,
  indexAtLength,
  pointAtLength,
  type LabyrinthGeometry,
  type Point,
} from './geometry';

/** Walks the path like a finger: small forward steps along the line itself. */
function traceInward(g: LabyrinthGeometry, from: number, to: number, step = 3): number {
  let p = from;
  for (let target = from + step; target < to + step; target += step) {
    const next = followPointer(g, p, to, pointAtLength(g, Math.min(target, to)));
    if (next !== null) p = next;
  }
  return p;
}

describe('labyrinth geometry', () => {
  it.each(LEVEL_IDS)('level %i is one continuous path sampled about every 2 units', (level) => {
    const g = geometryFor(level);
    for (let i = 1; i < g.pts.length; i++) {
      const a = g.pts[i - 1]!;
      const b = g.pts[i]!;
      expect(Math.hypot(b[0] - a[0], b[1] - a[1])).toBeLessThanOrEqual(2.6);
    }
    expect(g.cum[g.cum.length - 1]).toBe(g.L);
  });

  it.each(LEVEL_IDS)('level %i enters at the bottom and stays inside the 400 viewBox', (level) => {
    const g = geometryFor(level);
    const [x, y] = g.pts[0]!;
    expect(x).toBeCloseTo(200, 5);
    expect(y).toBeGreaterThan(370);
    for (const [px, py] of g.pts) {
      expect(px).toBeGreaterThanOrEqual(0);
      expect(px).toBeLessThanOrEqual(400);
      expect(py).toBeGreaterThanOrEqual(0);
      expect(py).toBeLessThanOrEqual(400);
    }
  });

  it('pointAtLength interpolates between samples and clamps at both ends', () => {
    const g = geometryFor(2);
    expect(pointAtLength(g, -10)).toEqual(pointAtLength(g, 0));
    expect(pointAtLength(g, g.L + 10)).toEqual(pointAtLength(g, g.L));
    const i = indexAtLength(g, g.L / 2);
    expect(g.cum[i]!).toBeGreaterThanOrEqual(g.L / 2);
  });

  it('the return trace walks back along the same path', () => {
    const g = geometryFor(1);
    const out = headPoint(g, g.L + 100);
    const inward = headPoint(g, g.L - 100);
    expect(out[0]).toBeCloseTo(inward[0], 6);
    expect(out[1]).toBeCloseTo(inward[1], 6);
  });
});

describe('checkpoints', () => {
  it.each([
    [1, 2, 1],
    [2, 4, 2],
    [3, 6, 3],
  ] as const)(
    'level %i has %i inward and %i return markers, the centre and an end',
    (level, inN, outN) => {
      const g = geometryFor(level);
      const cps = buildCheckpoints(level, g);
      expect(cps.filter((c) => c.kind === 'in')).toHaveLength(inN);
      expect(cps.filter((c) => c.kind === 'out')).toHaveLength(outN);
      expect(cps.find((c) => c.kind === 'centre')?.p).toBe(g.L);
      expect(cps[cps.length - 1]).toEqual({ p: 2 * g.L, kind: 'end' });
      for (let i = 1; i < cps.length; i++) expect(cps[i]!.p).toBeGreaterThan(cps[i - 1]!.p);
    },
  );
});

describe('followPointer (tracing rule)', () => {
  it.each(LEVEL_IDS)('a finger following the line on level %i reaches the centre', (level) => {
    const g = geometryFor(level);
    expect(traceInward(g, 0, g.L)).toBeCloseTo(g.L, 0);
  });

  it('never passes the next checkpoint', () => {
    const g = geometryFor(1);
    const limit = 100;
    expect(traceInward(g, 0, limit)).toBeLessThanOrEqual(limit);
    expect(followPointer(g, 90, limit, pointAtLength(g, 105))).toBe(limit);
  });

  it('snaps to the checkpoint when within one sample spacing of it', () => {
    const g = geometryFor(1);
    expect(followPointer(g, g.L - 10, g.L, pointAtLength(g, g.L - 1))).toBe(g.L);
    expect(followPointer(g, g.L - 10, g.L, pointAtLength(g, g.L - 5))).toBeLessThan(g.L);
  });

  it('moves forward only - pointing behind the head does nothing', () => {
    const g = geometryFor(2);
    expect(followPointer(g, 300, g.L, pointAtLength(g, 290))).toBeNull();
  });

  it('going off the line does nothing (no reset, no error)', () => {
    const g = geometryFor(2);
    const far: Point = [5, 5];
    expect(followPointer(g, 300, g.L, far)).toBeNull();
  });

  it.each([2, 3] as const)(
    'level %i: touching the neighbouring circuit does not jump across',
    (level) => {
      const g = geometryFor(level);
      const p = g.L * 0.3;
      const head = headPoint(g, p);
      // The point straight inward toward the centre, one circuit spacing away,
      // is on the adjacent circuit but far ahead along the path.
      const dx = 200 - head[0];
      const dy = 200 - head[1];
      const len = Math.hypot(dx, dy);
      const neighbour: Point = [head[0] + (dx / len) * g.w, head[1] + (dy / len) * g.w];
      const next = followPointer(g, p, g.L, neighbour);
      const maxStep = Math.max(40, g.w * 3);
      if (next !== null) expect(next - p).toBeLessThanOrEqual(maxStep + 1);
    },
  );

  it('after the centre, tracing continues outward along the same path', () => {
    const g = geometryFor(1);
    const target = g.L + 20;
    const pointer = headPoint(g, target);
    const next = followPointer(g, g.L, 2 * g.L, pointer);
    expect(next).not.toBeNull();
    expect(next!).toBeGreaterThan(g.L);
    expect(next!).toBeLessThanOrEqual(target + 3);
  });

  it('at the centre while its pause is still pending, nothing moves outward', () => {
    const g = geometryFor(1);
    expect(followPointer(g, g.L, g.L, headPoint(g, g.L + 20))).toBeNull();
  });
});
