import { EDGE_NARROW, EDGE_WIDE, EXIT_FADE, type BlockDef } from './editorial-config';
import { smoothstep } from './experience-math';

export interface BlockState {
  /** Overall opacity of the block, 0 → 1,  */
  visibility: number;
  /** How far the block's own content has revealed, 0 → 1 (drives the staggered text reveal). */
  reveal: number;
  /** How strongly the block is CURRENT right now (drives its connector line), 0 → 1. */
  active: number;
}

/**
 * The single rule for when a piece of content is shown. It fades in around the
 * start of its window, stays fully present while current, then fades away as
 * the next content takes its place — earlier text never lingers underneath
 * later text; the lit nodes on the figure are what carry earlier states
 * forward. Everything fades together at the scene's exit.
 */
export function blockState(progress: number, block: BlockDef, narrow = false): BlockState {
  const [start, end] = (narrow && block.narrowWindow) || block.window;
  const EDGE = narrow ? EDGE_NARROW : EDGE_WIDE;

  const entered = block.first ? 1 : smoothstep(start - EDGE, start + EDGE, progress);
  const reveal = block.first
    ? 1
    : smoothstep(start, start + Math.min(0.07, (end - start) * 0.6), progress);
  const left = smoothstep(end - EDGE, end + EDGE, progress);
  const exit = 1 - smoothstep(EXIT_FADE[0], EXIT_FADE[1], progress);

  const active = entered * reveal * (1 - left) * exit;
  const visibility = entered * (1 - left) * exit;
  return { visibility, reveal, active };
}
