/**
 * The two standalone guided audio practices: the 90-Second Reset and The Empty
 * Chair. Each is its own experience (own routes, recording, stage times, copy and
 * completion); this file only describes them, and the three screens render
 * whichever one a route names. It mirrors apps/web/src/components/practices/
 * {ninety-second-reset,the-empty-chair}: same recordings (the web app's own MP3
 * files, bundled by Metro), same stage start times, same wording.
 *
 * The recording's own clock is the only clock: a stage is chosen purely from the
 * player's position. Each `startsAt` is where the voice begins that stage, measured
 * from the recording, accurate to about 0.1 s. If a recording is replaced, they
 * must be measured again.
 */

export type GuidedPracticeSlug = '90-second-reset' | 'the-empty-chair';

export interface GuidedStage {
  key: string;
  name: string;
  /** One line shown with the stage. Not a transcript. */
  cue: string;
  /** Second of the recording at which the voice begins this stage. */
  startsAt: number;
}

export interface GuidedPractice {
  slug: GuidedPracticeSlug;
  title: string;
  subtitle: string;
  condition: 'Safety' | 'Participation';
  format: 'PowerDrop' | 'Guided Reflection';
  description: string;
  /** The recording's exact length in seconds (ffprobe). */
  durationSeconds: number;
  stages: readonly GuidedStage[];
  begin: string;
  complete: {
    heading: string;
    message: string;
    /** An optional sentence to hold. Never a field: nothing is submitted or saved. */
    prompt?: string;
    finish: string;
  };
}

export const NINETY_SECOND_RESET: GuidedPractice = {
  slug: '90-second-reset',
  title: '90-Second Reset',
  subtitle: 'A moment to return to where you are.',
  condition: 'Safety',
  format: 'PowerDrop',
  description:
    'When everything feels like too much, take a moment to pause, notice your surroundings and reconnect with the present.',
  durationSeconds: 92.763,
  stages: [
    { key: 'arrive', name: 'Arrive', cue: 'Take a moment.', startsAt: 0 },
    { key: 'orient', name: 'Orient', cue: 'Notice three things around you.', startsAt: 11.36 },
    {
      key: 'support',
      name: 'Find Support',
      cue: 'Notice what is supporting you.',
      startsAt: 25.88,
    },
    { key: 'notice', name: 'Notice', cue: 'Bring gentle attention to your body.', startsAt: 40.82 },
    {
      key: 'return',
      name: 'Return',
      cue: 'Notice where you are and what might support you next.',
      startsAt: 56.32,
    },
  ],
  begin: 'Begin Reset',
  complete: {
    heading: 'You’ve made a little space.',
    message:
      'You don’t have to fix everything right now. Take what you need from this moment and move forward in your own time.',
    finish: 'Finish',
  },
};

/** Closing begins at "As we finish" and runs through the music-only outro to the end of the file. */
export const THE_EMPTY_CHAIR: GuidedPractice = {
  slug: 'the-empty-chair',
  title: 'The Empty Chair',
  subtitle: 'Taking Your Seat in Your Own Life',
  condition: 'Participation',
  format: 'Guided Reflection',
  description:
    'A gentle end-of-day reflection to notice where you have been present in your own life and consider one ordinary moment when you might take your seat again tomorrow.',
  durationSeconds: 270.675,
  stages: [
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
  ],
  begin: 'Begin Practice',
  complete: {
    heading: 'You Took Your Seat.',
    message: 'Participation begins with presence. One moment at a time.',
    prompt: 'What is one moment from today you want to remember?',
    finish: 'Return to Practices',
  },
};

export const GUIDED_PRACTICES: Record<GuidedPracticeSlug, GuidedPractice> = {
  '90-second-reset': NINETY_SECOND_RESET,
  'the-empty-chair': THE_EMPTY_CHAIR,
};

/** The routes of one practice. Nothing links one practice to the other. */
export function guidedPracticeRoutes(slug: GuidedPracticeSlug) {
  return {
    intro: `/practices/${slug}`,
    session: `/practices/${slug}/session`,
    complete: `/practices/${slug}/complete`,
  } as const;
}

/** The index of the stage playing at `positionSeconds` (clamped to the first and last stage). */
export function stageIndexAt(stages: readonly GuidedStage[], positionSeconds: number): number {
  let index = 0;
  for (let i = 0; i < stages.length; i++) {
    if (positionSeconds >= stages[i]!.startsAt) index = i;
  }
  return index;
}

/** 0 to 1: how far through the recording. */
export function progressAt(positionSeconds: number, total: number): number {
  if (!(total > 0)) return 0;
  return Math.min(1, Math.max(0, positionSeconds / total));
}

/** "1:05". Whole seconds, never negative. */
export function formatClock(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${(whole % 60).toString().padStart(2, '0')}`;
}

/** Seconds left, rounded UP so the clock reads 0:00 only when the recording is really over. */
export function remainingSeconds(positionSeconds: number, total: number): number {
  return Math.max(0, Math.ceil(total - positionSeconds));
}

/** "4 min 31 sec", always derived from the recording's duration (rounded up, like the remaining-time clock). */
export function formatDurationLabel(seconds: number): string {
  const whole = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(whole / 60);
  const s = whole % 60;
  if (m === 0) return `${s} sec`;
  return s === 0 ? `${m} min` : `${m} min ${s} sec`;
}
