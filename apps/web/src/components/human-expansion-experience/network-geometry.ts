import * as THREE from 'three';
import {
  CONDITIONS_START,
  CONDITION_COUNT,
  CONDITION_SPAN,
  NODE_HEIGHTS,
} from './experience-config';
import { mulberry32, sampleTable } from './experience-math';
import { ARM_CENTERLINE, LEG_CENTERLINE, TORSO_PROFILE } from './figure-profile';

export type NetworkQuality = 'high' | 'low';

/** One continuous curve of the abstract nervous-system / capacity network. */
export interface Pathway {
  id: string;
  points: THREE.Vector3[];
  /** Scroll progress at which this pathway starts drawing itself in. */
  stage: number;
  /** Relative brightness, 0 – 1. */
  weight: number;
  closed: boolean;
  /** True when the curve is meant to stay inside the body (checked by tests). */
  inside: boolean;
}

/** Interior measurements of the body at height y, kept clear of the skin. */
export function bodyAt(y: number): { zc: number; hw: number; hd: number } {
  const hwRaw = sampleTable(TORSO_PROFILE, y, 1);
  const z0 = sampleTable(TORSO_PROFILE, y, 2);
  const z1 = sampleTable(TORSO_PROFILE, y, 3);
  // Above the waist the measured width includes the shoulders and the arms'
  // roots; the ribcage itself is narrower.
  const hw = y >= 1.38 && y <= 1.68 ? Math.min(hwRaw, 0.15) : hwRaw;
  return { zc: (z0 + z1) / 2, hw, hd: (z1 - z0) / 2 };
}

export function nodePositions(): THREE.Vector3[] {
  return NODE_HEIGHTS.map((y) => new THREE.Vector3(0, y, bodyAt(y).zc));
}

const mirrorX = (points: THREE.Vector3[]): THREE.Vector3[] =>
  points.map((p) => new THREE.Vector3(-p.x, p.y, p.z));

function smoothCurve(points: THREE.Vector3[], samples: number, closed = false): THREE.Vector3[] {
  const curve = new THREE.CatmullRomCurve3(points, closed, 'centripetal');
  return curve.getSpacedPoints(samples);
}

function ring(
  cx: number,
  cy: number,
  cz: number,
  rx: number,
  rz: number,
  samples: number,
  tilt = 0,
): THREE.Vector3[] {
  const out: THREE.Vector3[] = [];
  for (let i = 0; i <= samples; i += 1) {
    const a = (i / samples) * Math.PI * 2;
    out.push(
      new THREE.Vector3(cx + Math.cos(a) * rx, cy + Math.sin(a) * rz * tilt, cz + Math.sin(a) * rz),
    );
  }
  return out;
}

/** An open arc of a tilted ellipse (not a closed ring): quieter than a full orbit and easier to keep from stacking. */
function arc(
  cx: number,
  cy: number,
  cz: number,
  rx: number,
  rz: number,
  start: number,
  sweep: number,
  samples: number,
  tilt: number,
): THREE.Vector3[] {
  const out: THREE.Vector3[] = [];
  for (let i = 0; i <= samples; i += 1) {
    const a = start + (i / samples) * sweep;
    out.push(
      new THREE.Vector3(cx + Math.cos(a) * rx, cy + Math.sin(a) * rz * tilt, cz + Math.sin(a) * rz),
    );
  }
  return out;
}

function helix(
  y0: number,
  y1: number,
  turns: number,
  phase: number,
  samples: number,
  radiusFactor = 0.5,
) {
  const out: THREE.Vector3[] = [];
  for (let i = 0; i <= samples; i += 1) {
    const t = i / samples;
    const y = y0 + (y1 - y0) * t;
    const { zc, hw, hd } = bodyAt(y);
    const r = radiusFactor * Math.min(hw, hd);
    const a = phase + t * turns * Math.PI * 2;
    out.push(new THREE.Vector3(Math.cos(a) * r, y, zc + Math.sin(a) * r));
  }
  return out;
}

/**
 * Builds every pathway. Pure and deterministic (seeded jitter only), so the
 * same network is produced on every load and in tests. `low` is the
 * simplified mobile / low-power network: fewer curves, fewer samples.
 */
export function buildPathways(quality: NetworkQuality = 'high'): Pathway[] {
  const high = quality === 'high';
  const rand = mulberry32(20261005);
  const S = (n: number) => (high ? n : Math.ceil(n / 2));
  const paths: Pathway[] = [];
  const add = (p: Pathway) => paths.push(p);

  // 1. The central axis — present from the start, quietly. A fine line that
  //    also runs a little above the head and down to the floor between the feet.
  {
    const pts: THREE.Vector3[] = [new THREE.Vector3(0, 0.0, bodyAt(0.05).zc)];
    for (let y = 0.1; y <= 1.96; y += 0.06) pts.push(new THREE.Vector3(0, y, bodyAt(y).zc));
    pts.push(new THREE.Vector3(0, 2.32, bodyAt(1.96).zc));
    add({
      id: 'axis',
      points: smoothCurve(pts, S(220)),
      stage: 0,
      weight: 0.85,
      closed: false,
      inside: false,
    });
  }

  // 2. Twin helices around the spine through the torso and neck.
  add({
    id: 'helix-a',
    points: helix(1.0, 1.88, 2.2, 0, S(150)),
    stage: 0.1,
    weight: 0.75,
    closed: false,
    inside: true,
  });
  if (high) {
    add({
      id: 'helix-b',
      points: helix(1.0, 1.88, 2.2, Math.PI, 150),
      stage: 0.12,
      weight: 0.6,
      closed: false,
      inside: true,
    });
  }

  // 3. Slim rings through the ribcage.
  const ribHeights = high ? [1.3, 1.36, 1.42, 1.48, 1.54] : [1.34, 1.46];
  ribHeights.forEach((y, i) => {
    const { zc, hw, hd } = bodyAt(y);
    add({
      id: `rib-${i}`,
      points: ring(0, y, zc, hw * 0.78, hd * 0.7, S(72)),
      stage: 0.2 + i * 0.012,
      weight: 0.45,
      closed: true,
      inside: true,
    });
  });

  // 4. Legs: a main strand from the pelvis to the foot, and (high quality) a
  //    slower spiral around it.
  const legTop = LEG_CENTERLINE.filter(([y]) => y >= 0.05).reverse();
  const legMain = [
    new THREE.Vector3(0, 1.0, bodyAt(1.0).zc),
    new THREE.Vector3(0.025, 0.94, bodyAt(0.94).zc),
    ...legTop.map(([y, x, z]) => new THREE.Vector3(x, y, z)),
  ];
  add({
    id: 'leg-r',
    points: smoothCurve(legMain, S(120)),
    stage: 0.3,
    weight: 0.75,
    closed: false,
    inside: true,
  });
  add({
    id: 'leg-l',
    points: mirrorX(smoothCurve(legMain, S(120))),
    stage: 0.3,
    weight: 0.75,
    closed: false,
    inside: true,
  });
  if (high) {
    const spiral: THREE.Vector3[] = [];
    for (let i = 0; i <= 120; i += 1) {
      const t = i / 120;
      const y = 0.9 - t * 0.82;
      const x = sampleTable(LEG_CENTERLINE, y, 1);
      const z = sampleTable(LEG_CENTERLINE, y, 2);
      const r = 0.4 * sampleTable(LEG_CENTERLINE, y, 3);
      const a = t * 2.4 * Math.PI * 2;
      spiral.push(new THREE.Vector3(x + Math.cos(a) * r, y, z + Math.sin(a) * r));
    }
    add({
      id: 'leg-spiral-r',
      points: spiral,
      stage: 0.33,
      weight: 0.45,
      closed: false,
      inside: true,
    });
    add({
      id: 'leg-spiral-l',
      points: mirrorX(spiral),
      stage: 0.33,
      weight: 0.45,
      closed: false,
      inside: true,
    });
  }

  // 5. Arms: from the spine at the shoulders out along each arm to the hand.
  const armPts = [
    new THREE.Vector3(0, 1.5, bodyAt(1.5).zc),
    new THREE.Vector3(0.1, 1.5, bodyAt(1.5).zc - 0.01),
    new THREE.Vector3(0.18, 1.45, -0.04),
    ...[...ARM_CENTERLINE].reverse().map(([y, x, z]) => new THREE.Vector3(x, y, z)),
  ];
  const armCurve = smoothCurve(armPts, S(120));
  add({ id: 'arm-r', points: armCurve, stage: 0.4, weight: 0.75, closed: false, inside: true });
  add({
    id: 'arm-l',
    points: mirrorX(armCurve),
    stage: 0.4,
    weight: 0.75,
    closed: false,
    inside: true,
  });

  // 6. Head: crown rings and one meridian.
  const headRings = high ? [1.78, 1.86, 1.93] : [1.84];
  headRings.forEach((y, i) => {
    const { zc, hw, hd } = bodyAt(y);
    add({
      id: `head-ring-${i}`,
      points: ring(0, y, zc, hw * 0.7, hd * 0.7, S(64)),
      stage: 0.5 + i * 0.012,
      weight: 0.55,
      closed: true,
      inside: true,
    });
  });

  // 7. Orbits: one open arc per node, widening with each condition — the
  //    visual sense of "more available". Each has its own tilt and starting
  //    angle so they cross rather than stack. Mobile keeps every other one.
  const radii = [0.4, 0.5, 0.62, 0.76, 0.92];
  const starts = [0.35, 1.25, 2.1, 2.95, 3.8];
  const tilts = [0.3, -0.26, 0.34, -0.3, 0.26];
  const nodes = nodePositions();
  nodes.forEach((n, i) => {
    if (!high && i % 2 === 1) return;
    add({
      id: `orbit-${i}`,
      points: arc(
        0,
        n.y,
        n.z,
        radii[i]!,
        radii[i]! * 0.55,
        starts[i]!,
        Math.PI * 1.35,
        S(110),
        tilts[i]!,
      ),
      stage: CONDITIONS_START + i * CONDITION_SPAN - 0.012,
      weight: 0.45,
      closed: false,
      inside: false,
    });
  });

  // 8. Outward connections from the upper nodes, appearing late: the network
  //    reaching past the body. They stop short of the editorial columns
  //    (|x| <= 0.86), so the network never runs under the text.
  const outward = high ? [1, 2, 3, 4] : [2, 4];
  outward.forEach((nodeIndex, k) => {
    const n = nodes[nodeIndex]!;
    [-1, 1].forEach((side) => {
      const jitter = (rand() - 0.5) * 0.1;
      add({
        id: `reach-${nodeIndex}-${side}`,
        points: smoothCurve(
          [
            new THREE.Vector3(0, n.y, n.z),
            new THREE.Vector3(side * 0.3, n.y + 0.04 + jitter, n.z + 0.1),
            new THREE.Vector3(side * 0.6, n.y + 0.14, n.z + jitter),
            new THREE.Vector3(side * 0.86, n.y + 0.24, n.z - 0.12),
          ],
          S(70),
        ),
        stage: 0.56 + k * 0.045,
        weight: 0.45,
        closed: false,
        inside: false,
      });
    });
  });

  // 9. A richer inner field: more strands winding around the spine at
  //    different radii and rates, so the torso reads as full of light rather
  //    than threaded by two lines.
  const strands: Array<[number, number, number, number, number]> = [
    // y0, y1, turns, phase, radiusFactor
    [0.98, 1.72, 1.3, 0.9, 0.78],
    [1.02, 1.82, 1.9, 2.4, 0.66],
    [1.1, 1.66, 2.6, 4.0, 0.56],
    [0.98, 1.9, 1.05, 5.2, 0.8],
    [1.2, 1.78, 3.2, 1.6, 0.42],
    [1.05, 1.6, 1.6, 3.4, 0.72],
    [1.3, 1.9, 2.2, 0.3, 0.6],
    [0.96, 1.5, 2.0, 5.9, 0.62],
  ];
  strands.slice(0, high ? strands.length : 3).forEach(([y0, y1, turns, phase, rf], i) => {
    add({
      id: `strand-${i}`,
      points: helix(y0, y1, turns, phase, S(140), rf),
      stage: 0.06 + i * 0.045,
      weight: 0.42,
      closed: false,
      inside: true,
    });
  });

  // 10. Fine strands winding along each arm, as the limbs' own pathways.
  if (high) {
    [0, 1].forEach((k) => {
      const spiral: THREE.Vector3[] = [];
      for (let i = 0; i <= 110; i += 1) {
        const t = i / 110;
        const y = 1.36 - t * 0.56;
        const cx = sampleTable(ARM_CENTERLINE, y, 1);
        const cz = sampleTable(ARM_CENTERLINE, y, 2);
        const a = t * 2.2 * Math.PI * 2 + k * Math.PI;
        spiral.push(new THREE.Vector3(cx + Math.cos(a) * 0.022, y, cz + Math.sin(a) * 0.022));
      }
      add({
        id: `arm-spiral-r-${k}`,
        points: spiral,
        stage: 0.42,
        weight: 0.4,
        closed: false,
        inside: true,
      });
      add({
        id: `arm-spiral-l-${k}`,
        points: mirrorX(spiral),
        stage: 0.42,
        weight: 0.4,
        closed: false,
        inside: true,
      });
    });
  }

  // 11. The halo: two thin rings standing behind the head and shoulders, in
  //     the plane facing the viewer, and ripples on the floor around the feet.
  const crownZ = bodyAt(1.9).zc;
  [
    { r: 0.34, cy: 1.92, stage: 0.02, w: 0.5 },
    { r: 0.46, cy: 1.9, stage: 0.07, w: 0.35 },
  ].forEach(({ r, cy, stage, w }, i) => {
    const pts: THREE.Vector3[] = [];
    for (let k = 0; k <= S(120); k += 1) {
      const a = (k / S(120)) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * r, cy + Math.sin(a) * r * 1.12, crownZ - 0.14));
    }
    add({ id: `halo-${i}`, points: pts, stage, weight: w, closed: true, inside: false });
  });
  const ripples = high ? [0.42, 0.68, 0.98, 1.3] : [0.5, 1.0];
  ripples.forEach((r, i) => {
    add({
      id: `ripple-${i}`,
      points: ring(0, 0.012, 0.0, r, r * 0.3, S(110)),
      stage: 0.0 + i * 0.03,
      weight: 0.38 - i * 0.05,
      closed: true,
      inside: false,
    });
  });

  return paths;
}

export interface NetworkArrays {
  /** xyz per vertex, two vertices per line segment. */
  position: Float32Array;
  /** 0 → 1 along the owning pathway. */
  along: Float32Array;
  stage: Float32Array;
  weight: Float32Array;
  seed: Float32Array;
  vertexCount: number;
  pathwayCount: number;
}

/** Flattens the pathways into the typed arrays one `LineSegments` needs. */
export function buildNetworkArrays(quality: NetworkQuality): NetworkArrays {
  const paths = buildPathways(quality);
  let segments = 0;
  for (const p of paths) segments += p.points.length - 1;
  const vertexCount = segments * 2;
  const position = new Float32Array(vertexCount * 3);
  const along = new Float32Array(vertexCount);
  const stage = new Float32Array(vertexCount);
  const weight = new Float32Array(vertexCount);
  const seed = new Float32Array(vertexCount);

  let v = 0;
  paths.forEach((p, pathIndex) => {
    const n = p.points.length - 1;
    for (let i = 0; i < n; i += 1) {
      const a = p.points[i]!;
      const b = p.points[i + 1]!;
      for (const [point, t] of [
        [a, i / n],
        [b, (i + 1) / n],
      ] as const) {
        position.set([point.x, point.y, point.z], v * 3);
        along[v] = t;
        stage[v] = p.stage;
        weight[v] = p.weight;
        seed[v] = (pathIndex * 0.6180339887) % 1;
        v += 1;
      }
    }
  });
  return { position, along, stage, weight, seed, vertexCount, pathwayCount: paths.length };
}

export { CONDITION_COUNT };
