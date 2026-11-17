/**
 * Timing for the 90-Second Reset: one pure place for the stage boundaries and
 * the clock formatting, so the screen can stay free of arithmetic and the
 * boundaries can be tested without rendering anything.
 *
 * Everything here describes ONE recording: public/audio/practices/90-second-reset.mp3
 * (MP3, 44.1 kHz stereo, 128 kbps, md5 32e80d5b4541a87fae5d995128b11c84).
 * If that file is ever replaced, the duration and every `startsAt` below must be
 * measured again - they are not rules, they are measurements of the recording.
 *
 * How they were measured: the duration is ffprobe's. Each stage begins where the
 * voice begins its cue ("Start by looking around", "Now, notice what is
 * supporting you", "Bring a little attention to your body", "Now, gently bring
 * your attention back..."). The cue positions come from speech-recognition word
 * times, then each was corrected to the actual voice onset in the waveform (the
 * first 20 ms window 9 dB above the music bed after the preceding pause). They are
 * accurate to about 0.1 s. The stages are deliberately not equal in length.
 */

/** The recording's exact length in seconds (ffprobe: 92.762993). */
export const AUDIO_DURATION_SECONDS = 92.763;

export interface ResetStage {
  key: 'arrive' | 'orient' | 'support' | 'notice' | 'return';
  name: string;
  instruction: string;
  /** Second of the recording at which the voice begins this stage. */
  startsAt: number;
}

export const RESET_STAGES: readonly ResetStage[] = [
  { key: 'arrive', name: 'Arrive', instruction: 'Take a moment.', startsAt: 0 },
  {
    key: 'orient',
    name: 'Orient',
    instruction: 'Notice three things around you.',
    startsAt: 11.36,
  },
  {
    key: 'support',
    name: 'Find Support',
    instruction: 'Notice what is supporting you.',
    startsAt: 25.88,
  },
  {
    key: 'notice',
    name: 'Notice',
    instruction: 'Bring gentle attention to your body.',
    startsAt: 40.82,
  },
  {
    key: 'return',
    name: 'Return',
    instruction: 'Notice where you are and what might support you next.',
    startsAt: 56.32,
  },
];

/** The index of the stage playing at `positionSeconds` (clamped to the first and last stage). */
export function stageIndexAt(positionSeconds: number): number {
  let index = 0;
  for (let i = 0; i < RESET_STAGES.length; i++) {
    if (positionSeconds >= RESET_STAGES[i]!.startsAt) index = i;
  }
  return index;
}

/** 0 to 1: how far through the recording. `total` is the audio's own duration once the browser knows it. */
export function progressAt(
  positionSeconds: number,
  total: number = AUDIO_DURATION_SECONDS,
): number {
  if (!(total > 0)) return 0;
  return Math.min(1, Math.max(0, positionSeconds / total));
}

/** "1:05". Whole seconds, never negative. */
export function formatClock(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  const m = Math.floor(whole / 60);
  const s = whole % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * "1 min 33 sec": the practice's length for labels, always derived from the
 * recording's duration so the label cannot drift from the audio. Rounded UP,
 * like the remaining-time clock, so both show the same figure at the start.
 */
export function formatDurationLabel(seconds: number = AUDIO_DURATION_SECONDS): string {
  const whole = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(whole / 60);
  const s = whole % 60;
  if (m === 0) return `${s} sec`;
  return s === 0 ? `${m} min` : `${m} min ${s} sec`;
}

/** Seconds left, rounded UP so the clock reads 0:00 only when the recording is really over. */
export function remainingSeconds(
  positionSeconds: number,
  total: number = AUDIO_DURATION_SECONDS,
): number {
  return Math.max(0, Math.ceil(total - positionSeconds));
}
