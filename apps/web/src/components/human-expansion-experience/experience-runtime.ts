import {
  activeConditionAt,
  CONDITION_COUNT,
  CONDITION_SPAN,
  CONDITIONS_START,
} from './experience-config';
import { pulseWindow, smoothstep } from './experience-math';

/**
 * Mutable state shared between the DOM (scroll) and the render loop. Plain
 * object, mutated in place and read inside `useFrame`, so scrolling never
 * triggers a React re-render.
 */
export interface ExperienceRuntime {
  /** Latest scroll progress from the page, 0 → 1. */
  target: number;
  /** Eased progress the scene actually draws, 0 → 1. */
  progress: number;
  reducedMotion: boolean;
}

export function createRuntime(reducedMotion = false): ExperienceRuntime {
  return { target: 0, progress: 0, reducedMotion };
}

/** Eases `progress` toward `target`; instant under reduced motion. */
export function stepRuntime(runtime: ExperienceRuntime, deltaSeconds: number): void {
  if (runtime.reducedMotion) {
    runtime.progress = runtime.target;
    return;
  }
  const k = 1 - Math.exp(-5 * deltaSeconds);
  runtime.progress += (runtime.target - runtime.progress) * k;
}

export interface NodeActivation {
  /** Has this node's condition been reached yet (stays on once reached)? 0 → 1. */
  lit: number;
  /** Is it THE current condition right now? 0 → 1. Only one is dominant at a time. */
  active: number;
}

export function nodeActivations(progress: number): NodeActivation[] {
  return Array.from({ length: CONDITION_COUNT }, (_, i) => {
    const start = CONDITIONS_START + i * CONDITION_SPAN;
    const end = start + CONDITION_SPAN;
    // Before the conditions chapter the five nodes are present but very quiet.
    const lit = 0.16 + 0.84 * smoothstep(start - 0.012, start + 0.012, progress);
    const isLast = i === CONDITION_COUNT - 1;
    // The last node stays dominant until the chapter ends, then settles.
    const active = pulseWindow(progress, start, isLast ? end + 0.02 : end, 0.012);
    return { lit, active };
  });
}

/** How "open" the whole body is, 0 → 1, used for the skin's glow. */
export function bodyGlow(progress: number): number {
  return smoothstep(0.0, 0.9, progress);
}

export { activeConditionAt };
