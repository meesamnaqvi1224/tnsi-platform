import type { ReturnPathContent } from '@/api/types';

/**
 * What the breathing pause at a marker or the centre consists of. Pure, so
 * the sequence (and its counts) are unit tested. Mirrors the web practice's
 * `runPause`: in 4, optional pause 2, out 6 by default, repeated per breath;
 * "practise without breath focus" replaces all of it with a plain timed pause.
 */
export interface BreathPhase {
  cue: string;
  seconds: number;
  /** true: in-breath (orb grows); false: out-breath (orb shrinks); null: hold. */
  grow: boolean | null;
  /** Which breath this phase belongs to, from 0. */
  cycle: number;
}

type Timings = Pick<
  ReturnPathContent['timings'],
  'inhaleSeconds' | 'pauseSeconds' | 'exhaleSeconds'
>;
type Cues = Pick<ReturnPathContent['checkpoints'], 'cueIn' | 'cuePause' | 'cueOut'>;

export function buildBreathPhases(
  cycles: number,
  gentlePause: boolean,
  timings: Timings,
  cues: Cues,
): BreathPhase[] {
  const phases: BreathPhase[] = [];
  for (let cycle = 0; cycle < cycles; cycle++) {
    phases.push({ cue: cues.cueIn, seconds: timings.inhaleSeconds, grow: true, cycle });
    if (gentlePause) {
      phases.push({ cue: cues.cuePause, seconds: timings.pauseSeconds, grow: null, cycle });
    }
    phases.push({ cue: cues.cueOut, seconds: timings.exhaleSeconds, grow: false, cycle });
  }
  return phases;
}

/** "5" for one breath, "5  ·  breath 2 of 3" for several. */
export function countLabel(secondsLeft: number, cycle: number, cycles: number): string {
  return cycles > 1 ? `${secondsLeft}  ·  breath ${cycle + 1} of ${cycles}` : `${secondsLeft}`;
}

/** Length of the plain pause when breath focus is off. */
export function noBreathSeconds(
  isCentre: boolean,
  timings: Pick<ReturnPathContent['timings'], 'noBreathMarkerSeconds' | 'noBreathCentreSeconds'>,
): number {
  return isCentre ? timings.noBreathCentreSeconds : timings.noBreathMarkerSeconds;
}

/** The line shown at the nth marker (1-based), cycling through the list. */
export function checkpointLine(
  markerNumber: number,
  noBreath: boolean,
  checkpoints: Pick<ReturnPathContent['checkpoints'], 'breathLines' | 'noBreathLines'>,
): string {
  const lines = noBreath ? checkpoints.noBreathLines : checkpoints.breathLines;
  return lines[(markerNumber - 1) % lines.length] ?? '';
}
