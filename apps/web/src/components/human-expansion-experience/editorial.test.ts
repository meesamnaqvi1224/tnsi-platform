import { describe, expect, it } from 'vitest';
import { BLOCKS, EXIT_FADE, type BlockId } from './editorial-config';
import { blockState } from './editorial-math';
import { CONDITION_COUNT } from './experience-config';
import { nodePositions } from './network-geometry';
import { projectPoints } from './project-points';

const block = (id: BlockId) => BLOCKS.find((b) => b.id === id)!;

describe('blockState', () => {
  it('shows the introduction from the very first frame', () => {
    expect(blockState(0, block('intro')).visibility).toBe(1);
  });

  it('keeps a block hidden before its window and fully visible inside it', () => {
    const why = block('why');
    expect(blockState(0.05, why).visibility).toBeLessThan(0.01);
    expect(blockState(0.15, why).visibility).toBeGreaterThan(0.95);
  });

  it('clears a block completely once its window has passed', () => {
    const frame = block('conditions-frame');
    expect(blockState(0.5, frame).visibility).toBeGreaterThan(0.95);
    expect(blockState(0.6, frame).visibility).toBeLessThan(0.01);
  });

  it('never shows two blocks in the same column at once (outside crossfades)', () => {
    const probes = [0.05, 0.15, 0.25, 0.4, 0.5, 0.6, 0.7, 0.75, 0.9];
    for (const p of probes) {
      for (const side of ['left', 'right'] as const) {
        const near = BLOCKS.filter((b) => b.side === side && blockState(p, b).visibility > 0.5);
        expect(near.length, `progress ${p}, ${side}`).toBeLessThanOrEqual(2);
      }
    }
  });

  it('uses the narrow window when one is defined', () => {
    const term = block('protection-term');
    expect(blockState(0.6, term, true).active).toBeGreaterThan(0.9);
    expect(blockState(0.65, term, true).active).toBeLessThan(0.05);
  });

  it('fades every block out across the exit range', () => {
    for (const b of BLOCKS) {
      expect(blockState(EXIT_FADE[1] + 0.005, b).visibility).toBeLessThan(0.01);
    }
  });
});

describe('phone layout', () => {
  /** The windows the single text area steps through: a block's own, or its parts' when it has them. */
  const steps = BLOCKS.filter((b) => b.id !== 'intro').flatMap((b) =>
    (b.narrowParts ?? [b.narrowWindow ?? b.window]).map((w) => ({ id: b.id, w })),
  );

  it('shows one thing at a time in the single text area (windows never overlap)', () => {
    const windows = steps.map((s) => s.w).sort((a, b) => a[0] - b[0]);
    for (let i = 1; i < windows.length; i++) {
      expect(windows[i]![0]).toBeGreaterThanOrEqual(windows[i - 1]![1] - 1e-9);
    }
  });

  it('gives every step enough scroll to be fully legible', () => {
    for (const { w } of steps) expect(w[1] - w[0]).toBeGreaterThanOrEqual(0.03 - 1e-9);
  });

  it('divides the pathway list into contiguous parts that together fill its window', () => {
    const list = block('practice-list');
    const parts = list.narrowParts!;
    expect(parts).toHaveLength(2);
    expect(parts[0]![0]).toBeCloseTo(list.narrowWindow![0]);
    expect(parts[0]![1]).toBeCloseTo(parts[1]![0]);
    expect(parts[1]![1]).toBeCloseTo(list.narrowWindow![1]);
  });
});

describe('projectPoints', () => {
  const nodes = nodePositions();

  it('projects all five nodes inside the canvas', () => {
    const pts = projectPoints(nodes, 1280, 800);
    expect(pts).toHaveLength(CONDITION_COUNT);
    for (const p of pts) {
      expect(p.x).toBeGreaterThan(0);
      expect(p.x).toBeLessThan(1280);
      expect(p.y).toBeGreaterThan(0);
      expect(p.y).toBeLessThan(800);
    }
  });

  it('keeps nodes ordered bottom to top (Safety lowest) on the centre line', () => {
    const pts = projectPoints(nodes, 1280, 800);
    for (let i = 1; i < pts.length; i++) expect(pts[i]!.y).toBeLessThan(pts[i - 1]!.y);
    for (const p of pts) expect(Math.abs(p.x - 640)).toBeLessThan(2);
  });
});
