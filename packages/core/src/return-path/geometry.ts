/**
 * Labyrinth geometry and tracing rules for The Return Path - pure, no DOM,
 * so the parts that decide "does the finger move the head?" are unit
 * tested. Ported from the approved prototype (see the build brief's
 * Practice mechanics section); designs are generated, never stored as
 * images, and use traditional forms only.
 *
 * Every design is one continuous path sampled roughly every 2 SVG units in
 * a 400 x 400 viewBox centred on (200, 200). Progress `p` runs 0 -> 2L:
 * 0..L is the inward trace, L..2L the return along the same path.
 */

export type LevelId = 1 | 2 | 3;
export type Point = readonly [number, number];

export interface LabyrinthGeometry {
  pts: Point[];
  /** Cumulative path length at each point; `cum[0] === 0`. */
  cum: number[];
  /** Total path length. */
  L: number;
  /** Circuit spacing - the scale everything else (stroke, tolerances) is derived from. */
  w: number;
  centreR: number;
  /** SVG path data, entrance -> centre. */
  d: string;
  /** SVG path data, centre -> entrance (drawn for the return trace). */
  dRev: string;
}

export interface LevelConfig {
  id: LevelId;
  name: string;
  subtitle: string;
  time: string;
  inCheckpoints: number;
  outCheckpoints: number;
  build: () => LabyrinthGeometry;
}

export type CheckpointKind = 'in' | 'centre' | 'out' | 'end';

export interface Checkpoint {
  /** Progress value (0..2L) at which tracing stops for this checkpoint. */
  p: number;
  kind: CheckpointKind;
}

export const VIEWBOX = 400;
/** Paths are sampled about every 2 units; this close to a checkpoint is "there". */
const SNAP_DISTANCE = 2;
const CX = 200;
const CY = 200;

const rad = (deg: number) => (deg * Math.PI) / 180;
const polar = (r: number, deg: number): Point => [
  CX + r * Math.cos(rad(deg)),
  CY + r * Math.sin(rad(deg)),
];

function arc(out: Point[], r: number, a0: number, a1: number) {
  const n = Math.max(2, Math.ceil((Math.abs(a1 - a0) * Math.PI * r) / 180 / 2));
  for (let i = 1; i <= n; i++) out.push(polar(r, a0 + ((a1 - a0) * i) / n));
}

function line(out: Point[], p: Point, q: Point) {
  const n = Math.max(1, Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1]) / 2));
  for (let i = 1; i <= n; i++)
    out.push([p[0] + ((q[0] - p[0]) * i) / n, p[1] + ((q[1] - p[1]) * i) / n]);
}

const last = (pts: Point[]) => pts[pts.length - 1]!;

/**
 * Classical labyrinth drawn concentrically. Circuits are numbered 1 (outer)
 * inward; the path enters on the bottom axis (90 deg), runs each circuit
 * almost all the way round and turns near the bottom with nested U-turns.
 * `thIn`/`thOut` are how far from the axis a turn sits for adjacent vs.
 * non-adjacent circuit changes.
 */
function classical(order: number[], R: number, w: number, thIn: number, thOut: number) {
  const r = (k: number) => R - (k - 1) * w;
  const pts: Point[] = [polar(R + w * 0.9, 90)];
  line(pts, pts[0]!, polar(r(order[0]!), 90));
  let cur = 90;
  order.forEach((k, i) => {
    const nx = order[i + 1];
    const clockwise = i % 2 === 0;
    let target: number;
    if (nx === undefined) target = 450;
    else {
      const th = Math.abs(nx - k) > 1 ? thOut : thIn;
      target = clockwise ? 450 - th : 90 + th;
    }
    arc(pts, r(k), cur, target);
    line(pts, last(pts), nx === undefined ? [CX, CY] : polar(r(nx), target));
    cur = target;
  });
  return { pts, w, centreR: r(order.length) - w * 0.5 };
}

/** Archimedean spiral, outer radius 172 -> 38, 3.5 turns, entrance at the bottom. */
function spiral() {
  const R = 172;
  const rc = 38;
  const turns = 3.5;
  const pts: Point[] = [polar(R + 26, 90)];
  line(pts, pts[0]!, polar(R, 90));
  // ~2 units between samples on the outer turn (2 * PI * 172 * 3.5 / 1800).
  const n = 1800;
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    pts.push(polar(R - (R - rc) * t, 90 + 360 * turns * t));
  }
  return { pts, w: (R - rc) / turns, centreR: rc - 6 };
}

const toPathData = (pts: Point[]) =>
  'M' + pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('L');

function finish(g: { pts: Point[]; w: number; centreR: number }): LabyrinthGeometry {
  const cum = [0];
  for (let i = 1; i < g.pts.length; i++) {
    const a = g.pts[i - 1]!;
    const b = g.pts[i]!;
    cum.push(cum[i - 1]! + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  return {
    ...g,
    cum,
    L: cum[cum.length - 1]!,
    d: toPathData(g.pts),
    dRev: toPathData([...g.pts].reverse()),
  };
}

export const LEVELS: Record<LevelId, LevelConfig> = {
  1: {
    id: 1,
    name: 'The Spiral',
    subtitle: 'Level 1 · Your first practice',
    time: 'About 2 minutes',
    inCheckpoints: 2,
    outCheckpoints: 1,
    build: () => finish(spiral()),
  },
  2: {
    id: 2,
    name: 'Seven Circuits',
    subtitle: 'Level 2 · Classical labyrinth',
    time: 'About 4 minutes',
    inCheckpoints: 4,
    outCheckpoints: 2,
    build: () => finish(classical([3, 2, 1, 4, 7, 6, 5], 180, 20, 36, 20)),
  },
  3: {
    id: 3,
    name: 'Eleven Circuits',
    subtitle: 'Level 3 · Deeper practice',
    time: 'About 6 minutes',
    inCheckpoints: 6,
    outCheckpoints: 3,
    build: () => finish(classical([5, 4, 3, 2, 1, 6, 11, 10, 9, 8, 7], 184, 13.4, 30, 18)),
  },
};

export const LEVEL_IDS: LevelId[] = [1, 2, 3];

const geometryCache = new Map<LevelId, LabyrinthGeometry>();

export function geometryFor(level: LevelId): LabyrinthGeometry {
  let g = geometryCache.get(level);
  if (!g) {
    g = LEVELS[level].build();
    geometryCache.set(level, g);
  }
  return g;
}

/**
 * Inward markers evenly spaced along the path, the centre, return markers
 * evenly spaced on the way out, then the end of the return trace.
 */
export function buildCheckpoints(level: LevelId, g: LabyrinthGeometry): Checkpoint[] {
  const { inCheckpoints, outCheckpoints } = LEVELS[level];
  const cps: Checkpoint[] = [];
  for (let i = 1; i <= inCheckpoints; i++)
    cps.push({ p: (g.L * i) / (inCheckpoints + 1), kind: 'in' });
  cps.push({ p: g.L, kind: 'centre' });
  for (let j = 1; j <= outCheckpoints; j++)
    cps.push({ p: g.L + (g.L * j) / (outCheckpoints + 1), kind: 'out' });
  cps.push({ p: 2 * g.L, kind: 'end' });
  return cps;
}

/** Index of the first point whose cumulative length is >= `len`. */
export function indexAtLength(g: LabyrinthGeometry, len: number): number {
  let lo = 0;
  let hi = g.cum.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (g.cum[mid]! < len) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** The point `len` units along the path from the entrance. */
export function pointAtLength(g: LabyrinthGeometry, len: number): Point {
  const clamped = Math.max(0, Math.min(g.L, len));
  const i = Math.max(1, indexAtLength(g, clamped));
  const c0 = g.cum[i - 1]!;
  const t = (clamped - c0) / (g.cum[i]! - c0 || 1);
  const a = g.pts[i - 1]!;
  const b = g.pts[i]!;
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/** Where the head sits along the path for progress `p` (the return walks back from the centre). */
export const pathLengthForProgress = (g: LabyrinthGeometry, p: number) =>
  p <= g.L ? p : 2 * g.L - p;

export const headPoint = (g: LabyrinthGeometry, p: number) =>
  pointAtLength(g, pathLengthForProgress(g, p));

/** How close the first touch must land to the head before tracing starts. */
export const grabRadius = (g: LabyrinthGeometry) => Math.max(34, g.w * 2.2);

/**
 * The tracing rule. Given current progress and a pointer position (SVG
 * units), returns the new progress, or `null` when the pointer moves
 * nothing. Only points within a short window just ahead of the head are
 * considered, and only within a tolerance of the pointer - that window is
 * what stops the finger jumping across to a neighbouring circuit. Progress
 * only moves forward and never passes `limit` (the next checkpoint).
 * Going off the line simply does nothing.
 */
export function followPointer(
  g: LabyrinthGeometry,
  p: number,
  limit: number,
  pointer: Point,
): number | null {
  const ahead = Math.max(40, g.w * 3);
  const tolerance = Math.max(20, g.w * 1.15);
  const s = pathLengthForProgress(g, p);
  // At exactly p === L the head is at the centre; once the centre pause
  // has ended (limit > L) the next movement is outward.
  const returning = p > g.L || (p >= g.L && limit > g.L);

  let i0: number;
  let i1: number;
  if (!returning) {
    i0 = Math.max(0, indexAtLength(g, s) - 3);
    i1 = indexAtLength(g, Math.min(g.L, s + ahead));
  } else {
    i0 = indexAtLength(g, Math.max(0, s - ahead));
    i1 = Math.min(g.pts.length - 1, indexAtLength(g, s) + 3);
  }

  let best = -1;
  let bestDist = tolerance * tolerance;
  for (let i = i0; i <= i1; i++) {
    const pt = g.pts[i]!;
    const d = (pt[0] - pointer[0]) ** 2 + (pt[1] - pointer[1]) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  if (best < 0) return null;

  const c = g.cum[best]!;
  let next: number | null = null;
  if (!returning && c > s) next = c;
  else if (returning && c < s) next = 2 * g.L - c;
  if (next === null) return null;
  // Within one sample spacing of the checkpoint counts as reaching it - the
  // path ends exactly at the centre/entrance, so otherwise the finger would
  // have to land on the very last sample.
  if (limit - next < SNAP_DISTANCE) return limit;
  return Math.min(next, limit);
}
