/**
 * Where each piece of the existing Human Expansion Theory™ content lives in
 * the experience: which side of the fixed figure, when it is current (in
 * scroll progress), and which point on the body it connects to. Words are
 * NEVER defined here — every block renders straight from
 * `content/human-expansion-theory.ts`.
 *
 * The wide layout shows several parts of a chapter together (heading on one
 * side, supporting parts on the other). The narrow layout has one text area
 * under the figure, so it shows the same parts one after another
 * (`narrowWindow`).
 */

export type BlockId =
  | 'intro'
  | 'why'
  | 'central'
  | 'conditions-frame'
  | 'conditions-list'
  | 'protection-frame'
  | 'protection-term'
  | 'participation-term'
  | 'protection-closing'
  | 'practice-text'
  | 'practice-list'
  | 'evolving';

/** A point on the figure a connector line can reach: one of the five nodes, or a fixed spot on the body/axis. */
export type ConnectorTarget =
  { kind: 'node'; index: number } | { kind: 'point'; x: number; y: number; z: number };

export interface BlockDef {
  id: BlockId;
  side: 'left' | 'right';
  /** Vertical centre of the block as a fraction of the stage height (wide layout). */
  y: number;
  /** [start, end] in normalised scroll progress, wide layout. */
  window: readonly [number, number];
  narrowWindow?: readonly [number, number];
  /** Present from the very first frame (no fade-in). */
  first?: boolean;
  /**
   * Phone layout only: windows for the parts of a long block that are shown one
   * after another in the single text area (the same elements, in the same DOM,
   * as `data-part="0"`, `"1"`…). Unset means the block is shown whole.
   */
  narrowParts?: readonly (readonly [number, number])[];
  /** Fine connector from this block to the body, if it has one of its own. */
  target?: ConnectorTarget;
}

/** The scene's last moments: everything fades before the sticky stage releases. */
export const EXIT_FADE: readonly [number, number] = [0.955, 0.99];

export const BLOCKS: readonly BlockDef[] = [
  { id: 'intro', side: 'left', y: 0.5, window: [0, 0.1], first: true },
  {
    id: 'why',
    side: 'left',
    y: 0.44,
    window: [0.1, 0.2],
    target: { kind: 'point', x: 0, y: 1.45, z: 0 },
  },
  {
    id: 'central',
    side: 'right',
    y: 0.5,
    window: [0.2, 0.3],
    narrowWindow: [0.2, 0.29],
    target: { kind: 'point', x: 0, y: 1.2, z: 0 },
  },
  {
    id: 'conditions-frame',
    side: 'left',
    y: 0.4,
    window: [0.3, 0.55],
    narrowWindow: [0.29, 0.335],
  },
  {
    id: 'conditions-list',
    side: 'right',
    y: 0.5,
    window: [0.3, 0.55],
    narrowWindow: [0.335, 0.55],
  },
  {
    id: 'protection-frame',
    side: 'left',
    y: 0.26,
    window: [0.55, 0.68],
    narrowWindow: [0.55, 0.58],
  },
  {
    id: 'protection-term',
    side: 'left',
    y: 0.7,
    window: [0.565, 0.68],
    narrowWindow: [0.58, 0.62],
    target: { kind: 'node', index: 0 },
  },
  {
    id: 'participation-term',
    side: 'right',
    y: 0.32,
    window: [0.585, 0.68],
    narrowWindow: [0.62, 0.655],
    target: { kind: 'node', index: 4 },
  },
  {
    id: 'protection-closing',
    side: 'right',
    y: 0.72,
    window: [0.625, 0.68],
    narrowWindow: [0.655, 0.685],
  },
  {
    id: 'practice-text',
    side: 'left',
    y: 0.46,
    window: [0.68, 0.82],
    narrowWindow: [0.685, 0.75],
  },
  {
    id: 'practice-list',
    side: 'right',
    y: 0.5,
    window: [0.695, 0.82],
    narrowWindow: [0.75, 0.82],
    narrowParts: [
      [0.75, 0.785],
      [0.785, 0.82],
    ],
    target: { kind: 'point', x: 0.3, y: 0.92, z: -0.02 },
  },
  {
    id: 'evolving',
    side: 'left',
    y: 0.44,
    window: [0.82, 0.955],
    target: { kind: 'point', x: 0, y: 2.12, z: -0.02 },
  },
] as const;

/** A fine connector line: from a block (or one condition in the list) to a point on the figure. */
export interface ConnectorDef {
  id: string;
  blockId: BlockId;
  target: ConnectorTarget;
  /** Set for the five condition connectors: which list item it leaves from. */
  conditionIndex?: number;
}

export const CONDITION_CONNECTOR_COUNT = 5;

export const CONNECTORS: readonly ConnectorDef[] = [
  ...BLOCKS.flatMap((b): ConnectorDef[] =>
    b.target ? [{ id: `c-${b.id}`, blockId: b.id, target: b.target }] : [],
  ),
  ...Array.from({ length: CONDITION_CONNECTOR_COUNT }, (_, i): ConnectorDef => ({
    id: `c-condition-${i}`,
    blockId: 'conditions-list',
    target: { kind: 'node', index: i },
    conditionIndex: i,
  })),
];

/** Narrow (phone) stage: the figure takes the top of the stage, text sits beneath it. */
export const NARROW_CANVAS_RATIO = 0.55;
export const NARROW_BREAKPOINT = 767;

/** Crossfade half-width: gentler on the wide layout, tight on the phone, where blocks share one text area. */
export const EDGE_WIDE = 0.018;
export const EDGE_NARROW = 0.008;
