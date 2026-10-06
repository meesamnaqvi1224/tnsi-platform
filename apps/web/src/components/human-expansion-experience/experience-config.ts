/**
 * Single source of truth for the Human Expansion Theory™ scroll experience:
 * how normalised scroll progress (0 → 1) maps to narrative states, and where
 * the five activation nodes sit on the figure.
 *
 * Nothing here is page copy. The words shown beside the figure always come
 * from `content/human-expansion-theory.ts`; this file only decides WHEN each
 * part of that content is "current" and which part of the figure responds.
 */

/** The figure is built 2 units tall (feet on y = 0), facing +z. */
export const FIGURE_HEIGHT = 2;

export interface ExperienceStateDef {
  id: string;
  /** Inclusive start, exclusive end, in normalised scroll progress. */
  start: number;
  end: number;
}

/**
 * Starting values from the brief, to be tuned visually. The five developmental
 * conditions share 0.30 – 0.55 equally (0.05 each).
 */
export const EXPERIENCE_STATES: readonly ExperienceStateDef[] = [
  { id: 'introduction', start: 0.0, end: 0.1 },
  { id: 'why-a-new-framework', start: 0.1, end: 0.2 },
  { id: 'central-proposition', start: 0.2, end: 0.3 },
  { id: 'developmental-conditions', start: 0.3, end: 0.55 },
  { id: 'protection-and-participation', start: 0.55, end: 0.68 },
  { id: 'theory-to-practice', start: 0.68, end: 0.82 },
  { id: 'evolving-body-of-work', start: 0.82, end: 0.94 },
  { id: 'exit', start: 0.94, end: 1.0001 },
] as const;

export const CONDITIONS_START = 0.3;
export const CONDITIONS_END = 0.55;
export const CONDITION_COUNT = 5;
export const CONDITION_SPAN = (CONDITIONS_END - CONDITIONS_START) / CONDITION_COUNT;

export function stateIndexAt(progress: number): number {
  const index = EXPERIENCE_STATES.findIndex((s) => progress >= s.start && progress < s.end);
  return index === -1 ? EXPERIENCE_STATES.length - 1 : index;
}

/** Which of the five conditions is current at this progress, or -1 outside that chapter. */
export function activeConditionAt(progress: number): number {
  if (progress < CONDITIONS_START || progress >= CONDITIONS_END) return -1;
  return Math.min(CONDITION_COUNT - 1, Math.floor((progress - CONDITIONS_START) / CONDITION_SPAN));
}

/**
 * The five activation nodes, bottom to top along the central axis, matching
 * the order of the five conditions on the page (Safety, Capacity,
 * Availability, Expansion, Participation): the experience reads as the figure
 * opening upward, from grounded to participating. Heights are fractions of
 * figure height. These are visual interaction points, not anatomical claims.
 * The lowest sits in the lower abdomen, well clear of the pelvic floor (the
 * legs join at about 0.95), so no node or connector ever points at the groin.
 */
export const NODE_HEIGHTS: readonly number[] = [1.15, 1.32, 1.49, 1.67, 1.88];

/** Fixed camera. The figure never moves; only the light inside it does. */
export const CAMERA = {
  fov: 22,
  distance: 6.5,
  targetY: 1.0,
  /** Barely-perceptible breathing, in world units. Disabled under reduced motion. */
  breathing: 0.022,
} as const;

/** Warm palette, derived from the brand's warm neutrals (cream / sand / bronze). */
export const PALETTE = {
  background: '#13100d',
  skin: '#f8e7c4',
  shadow: '#86542a',
  inner: '#e2a850',
  line: '#e6c07e',
  node: '#dcae62',
  halo: '#efcf94',
  rim: '#f3d9a2',
  orbDeep: '#a8701f',
  orbBright: '#f4cf7a',
  warm: '#c9964f',
} as const;
