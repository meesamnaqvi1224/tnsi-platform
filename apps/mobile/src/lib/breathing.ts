/**
 * Pure breathing-session timing logic — no React, no timers, no side
 * effects. Every value here is a deterministic function of "how much
 * active (non-paused) session time has elapsed", so the countdown and the
 * breathing animation can never drift relative to each other: both are
 * derived from the same elapsed-ms input, not from independently ticking
 * counters. Callers own the clock (see `session.tsx`); this module only
 * does the arithmetic.
 */

export const BREATHING_DURATIONS_SECONDS = [60, 180, 300, 600] as const;
export type BreathingDurationSeconds = (typeof BREATHING_DURATIONS_SECONDS)[number];
export const DEFAULT_BREATHING_DURATION_SECONDS: BreathingDurationSeconds = 180;

/** V1's one curated pattern: 4s inhale, 6s exhale, no breath retention. */
export const INHALE_SECONDS = 4;
export const EXHALE_SECONDS = 6;
export const CYCLE_SECONDS = INHALE_SECONDS + EXHALE_SECONDS;

export type BreathingPhase = 'inhale' | 'exhale';

export interface BreathingCycleState {
  phase: BreathingPhase;
  /** 0 (phase just started) to 1 (phase about to end). */
  phaseProgress: number;
}

/**
 * Which phase we're in, and how far through it, purely from elapsed
 * *active* session time in ms (the caller must exclude paused time).
 * `0-4s = inhale, 4-10s = exhale, 10-14s = inhale, ...` per the approved
 * pattern. The modulo guard makes this safe to call with any
 * non-negative elapsed value, including exactly on a boundary.
 */
export function cycleStateAt(elapsedActiveMs: number): BreathingCycleState {
  const cycleMs = CYCLE_SECONDS * 1000;
  const inhaleMs = INHALE_SECONDS * 1000;
  const positionMs = ((elapsedActiveMs % cycleMs) + cycleMs) % cycleMs;

  if (positionMs < inhaleMs) {
    return { phase: 'inhale', phaseProgress: positionMs / inhaleMs };
  }
  const exhaleMs = cycleMs - inhaleMs;
  return { phase: 'exhale', phaseProgress: (positionMs - inhaleMs) / exhaleMs };
}

/**
 * Seconds remaining in a `totalSeconds` session given `elapsedActiveMs` so
 * far — clamped to `[0, totalSeconds]` so a late-firing tick can never
 * show a negative count or overshoot the total.
 */
export function remainingSeconds(totalSeconds: number, elapsedActiveMs: number): number {
  const remaining = totalSeconds - Math.floor(elapsedActiveMs / 1000);
  return Math.max(0, Math.min(totalSeconds, remaining));
}

/** Whether `elapsedActiveMs` has reached or passed `totalSeconds` — the single place that decides "is this session over". */
export function isSessionComplete(totalSeconds: number, elapsedActiveMs: number): boolean {
  return elapsedActiveMs >= totalSeconds * 1000;
}

/** "154" -> "2:34" (matches the reference mockup's "3:00", not "03:00").
 * Minutes are never zero-padded; seconds always are. Whole seconds only;
 * negative input is clamped to 0. Used for both the remaining-time and
 * total-duration readout on the session screen, so the two stay in the
 * same format by construction. */
export function formatMMSS(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(s / 60);
  const seconds = s % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/** "180" -> "3 minutes", "60" -> "1 minute". */
export function formatDurationLabel(totalSeconds: number): string {
  const minutes = totalSeconds / 60;
  return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
}
