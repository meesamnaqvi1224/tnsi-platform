/**
 * Timing for The Empty Chair: the stage boundaries for ONE recording,
 * public/audio/practices/the-empty-chair.mp3 (MP3, 44.1 kHz stereo, 128 kbps,
 * md5 db4eead846c7d9115cd68a37e2289bf9). The audio element is the only clock; this
 * file only says which stage a given position belongs to.
 *
 * Each `startsAt` is where the voice begins that stage's cue ("Now, imagine an empty
 * chair", "Now, bring to mind one moment", "Now, gently bring your attention to
 * tomorrow", "As we finish"), taken from speech-recognition word times and corrected
 * to the voice onset in the waveform. Accurate to about 0.1 s. If the file is ever
 * replaced they must be measured again.
 *
 * Closing begins at "As we finish" and runs to the end of the file, so it includes the
 * final ~15 s of music-only outro: the voice finishing does not end the practice.
 */

import { formatClock, formatDurationLabel } from '../ninety-second-reset/timing';

export { formatClock };

/** The recording's exact length in seconds (ffprobe: 270.675011). */
export const CHAIR_AUDIO_DURATION_SECONDS = 270.675;

export interface ChairStage {
  key: 'arriving' | 'chair' | 'remembering' | 'seat' | 'closing';
  name: string;
  /** One line that names what this stage invites. Not a transcript. */
  cue: string;
  /** Second of the recording at which the voice begins this stage. */
  startsAt: number;
}

export const CHAIR_STAGES: readonly ChairStage[] = [
  { key: 'arriving', name: 'Arriving', cue: 'Take a comfortable position.', startsAt: 0 },
  { key: 'chair', name: 'The Empty Chair', cue: 'Imagine an empty chair.', startsAt: 38.9 },
  {
    key: 'remembering',
    name: 'Remembering a Moment',
    cue: 'Bring to mind one moment from today.',
    startsAt: 107.6,
  },
  {
    key: 'seat',
    name: 'Taking Your Seat Again',
    cue: 'Think of one ordinary moment tomorrow.',
    startsAt: 163.6,
  },
  {
    key: 'closing',
    name: 'Closing',
    cue: 'Return your attention to the space around you.',
    startsAt: 220.1,
  },
];

/** The index of the stage playing at `positionSeconds` (clamped to the first and last stage). */
export function chairStageIndexAt(positionSeconds: number): number {
  let index = 0;
  for (let i = 0; i < CHAIR_STAGES.length; i++) {
    if (positionSeconds >= CHAIR_STAGES[i]!.startsAt) index = i;
  }
  return index;
}

/** 0 to 1: how far through the recording. `total` is the audio's own duration once the browser knows it. */
export function chairProgressAt(
  positionSeconds: number,
  total: number = CHAIR_AUDIO_DURATION_SECONDS,
): number {
  if (!(total > 0)) return 0;
  return Math.min(1, Math.max(0, positionSeconds / total));
}

/** Seconds left, rounded UP so the clock reads 0:00 only when the recording is really over. */
export function chairRemainingSeconds(
  positionSeconds: number,
  total: number = CHAIR_AUDIO_DURATION_SECONDS,
): number {
  return Math.max(0, Math.ceil(total - positionSeconds));
}

/** "4 min 31 sec", always derived from the recording's duration. */
export const chairDurationLabel = (seconds: number = CHAIR_AUDIO_DURATION_SECONDS) =>
  formatDurationLabel(seconds);
