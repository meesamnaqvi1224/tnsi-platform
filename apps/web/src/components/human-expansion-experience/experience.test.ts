import { describe, expect, it } from 'vitest';
import {
  CONDITION_COUNT,
  CONDITIONS_END,
  CONDITIONS_START,
  EXPERIENCE_STATES,
  NODE_HEIGHTS,
  activeConditionAt,
  stateIndexAt,
} from './experience-config';
import { mulberry32, sampleTable, smoothstep } from './experience-math';
import { bodyGlow, nodeActivations } from './experience-runtime';
import { LEG_CENTERLINE } from './figure-profile';
import { bodyAt, buildNetworkArrays, buildPathways, nodePositions } from './network-geometry';

describe('state mapping', () => {
  it('covers 0 → 1 with no gaps or overlaps', () => {
    for (let i = 1; i < EXPERIENCE_STATES.length; i += 1) {
      expect(EXPERIENCE_STATES[i]!.start).toBeCloseTo(EXPERIENCE_STATES[i - 1]!.end, 6);
    }
    expect(EXPERIENCE_STATES[0]!.start).toBe(0);
    expect(EXPERIENCE_STATES.at(-1)!.end).toBeGreaterThanOrEqual(1);
  });

  it('resolves the start, middle and end of the scroll', () => {
    expect(EXPERIENCE_STATES[stateIndexAt(0)]!.id).toBe('introduction');
    expect(EXPERIENCE_STATES[stateIndexAt(0.4)]!.id).toBe('developmental-conditions');
    expect(EXPERIENCE_STATES[stateIndexAt(1)]!.id).toBe('exit');
  });

  it('splits the conditions chapter into five equal active windows, one at a time', () => {
    expect(activeConditionAt(CONDITIONS_START - 0.001)).toBe(-1);
    expect(activeConditionAt(CONDITIONS_END)).toBe(-1);
    const seen = [0.31, 0.36, 0.41, 0.46, 0.51].map(activeConditionAt);
    expect(seen).toEqual([0, 1, 2, 3, 4]);
    expect(CONDITION_COUNT).toBe(5);
  });
});

describe('activation nodes', () => {
  it('has exactly five nodes, ordered bottom to top, within the figure', () => {
    expect(NODE_HEIGHTS).toHaveLength(5);
    expect([...NODE_HEIGHTS]).toEqual([...NODE_HEIGHTS].sort((a, b) => a - b));
    for (const y of NODE_HEIGHTS) {
      expect(y).toBeGreaterThan(0);
      expect(y).toBeLessThan(2);
    }
    expect(nodePositions()).toHaveLength(5);
  });

  it('keeps every node quiet before the conditions chapter', () => {
    for (const a of nodeActivations(0.05)) {
      expect(a.active).toBeLessThan(0.01);
      expect(a.lit).toBeLessThan(0.2);
    }
  });

  it('makes exactly one node dominant at the middle of each condition', () => {
    for (let i = 0; i < CONDITION_COUNT; i += 1) {
      const mid =
        CONDITIONS_START + (i + 0.5) * ((CONDITIONS_END - CONDITIONS_START) / CONDITION_COUNT);
      const active = nodeActivations(mid).map((a) => a.active);
      expect(active.filter((v) => v > 0.9)).toHaveLength(1);
      expect(active[i]).toBeGreaterThan(0.9);
    }
  });

  it('leaves reached nodes softly lit and later nodes quiet', () => {
    const a = nodeActivations(0.41); // third condition
    expect(a[0]!.lit).toBeGreaterThan(0.9);
    expect(a[1]!.lit).toBeGreaterThan(0.9);
    expect(a[4]!.lit).toBeLessThan(0.2);
  });

  it('opens the whole figure gradually', () => {
    expect(bodyGlow(0)).toBe(0);
    expect(bodyGlow(0.9)).toBe(1);
    expect(bodyGlow(0.45)).toBeGreaterThan(0.2);
    expect(bodyGlow(0.45)).toBeLessThan(0.8);
  });
});

describe('procedural network', () => {
  it('is deterministic — identical on every call', () => {
    const a = buildNetworkArrays('high');
    const b = buildNetworkArrays('high');
    expect(Array.from(a.position.slice(0, 600))).toEqual(Array.from(b.position.slice(0, 600)));
    expect(a.vertexCount).toBe(b.vertexCount);
  });

  it('is restrained: a modest number of line segments, far from "thousands of particles"', () => {
    const high = buildNetworkArrays('high');
    const low = buildNetworkArrays('low');
    expect(high.vertexCount / 2).toBeLessThan(6000);
    expect(low.vertexCount).toBeLessThan(high.vertexCount * 0.6);
    expect(low.pathwayCount).toBeLessThan(high.pathwayCount);
  });

  it('starts quietly and finishes before the exit', () => {
    const paths = buildPathways('high');
    const earliest = Math.min(...paths.map((p) => p.stage));
    const latest = Math.max(...paths.map((p) => p.stage));
    expect(earliest).toBe(0);
    expect(latest).toBeLessThan(0.85);
    expect(paths.some((p) => p.id === 'axis' && p.stage === 0)).toBe(true);
  });

  it('draws the five orbits in the same order as the five conditions', () => {
    const orbits = buildPathways('high')
      .filter((p) => /^orbit-\d$/.test(p.id))
      .sort((a, b) => a.id.localeCompare(b.id));
    expect(orbits).toHaveLength(5);
    for (let i = 1; i < orbits.length; i += 1) {
      expect(orbits[i]!.stage).toBeGreaterThan(orbits[i - 1]!.stage);
    }
  });

  it('keeps every "inside" pathway within the body envelope', () => {
    const tolerance = 0.012;
    for (const path of buildPathways('high').filter((p) => p.inside)) {
      for (const p of path.points) {
        if (p.y >= 0.95 && p.y <= 1.98 && !path.id.startsWith('arm')) {
          const { zc, hw, hd } = bodyAt(p.y);
          expect(Math.abs(p.x), `${path.id} x at y=${p.y.toFixed(2)}`).toBeLessThanOrEqual(
            hw + tolerance,
          );
          expect(Math.abs(p.z - zc), `${path.id} z at y=${p.y.toFixed(2)}`).toBeLessThanOrEqual(
            hd + tolerance,
          );
        }
      }
    }
  });

  it('keeps the leg strands inside the legs', () => {
    for (const path of buildPathways('high').filter((p) => p.id.startsWith('leg-'))) {
      for (const p of path.points) {
        if (p.y < 0.88 && p.y > 0.06) {
          const x = sampleTable(LEG_CENTERLINE, p.y, 1);
          const r = sampleTable(LEG_CENTERLINE, p.y, 3);
          expect(
            Math.abs(Math.abs(p.x) - x),
            `${path.id} at y=${p.y.toFixed(2)}`,
          ).toBeLessThanOrEqual(r + 0.01);
        }
      }
    }
  });

  it('produces finite geometry only', () => {
    const { position, along } = buildNetworkArrays('high');
    expect(Array.from(position).every(Number.isFinite)).toBe(true);
    expect(Array.from(along).every((v) => v >= 0 && v <= 1.0001)).toBe(true);
  });
});

describe('maths helpers', () => {
  it('smoothstep clamps and eases', () => {
    expect(smoothstep(0, 1, -1)).toBe(0);
    expect(smoothstep(0, 1, 2)).toBe(1);
    expect(smoothstep(0, 1, 0.5)).toBeCloseTo(0.5, 6);
  });

  it('mulberry32 is reproducible', () => {
    const a = mulberry32(7);
    const b = mulberry32(7);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});
