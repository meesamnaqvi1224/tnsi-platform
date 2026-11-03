/**
 * Everything the 90-Second Reset says and links to, in one place. The copy is
 * the approved brief; nothing here is scored, rated or celebratory.
 */

import { formatDurationLabel } from './timing';

export interface ResetRoutes {
  /** Screen 1: introduction. */
  intro: string;
  /** Screen 2: the guided practice. */
  session: string;
  /** Screen 3: completion. */
  complete: string;
  /** Where "Exit practice" and "Finish" return to. */
  practices: string;
  /** Where "Return to Dashboard" goes. */
  dashboard: string;
}

const BASE = '/dashboard/practices/90-second-reset';

/**
 * The final voice-over, unaltered (MP3, 92.763 s). Its stage times are in ./timing.ts.
 * Served from /audio, which the Clerk middleware does not list as public, so only a
 * signed-in member's browser can fetch it, the same as the practice itself.
 */
export const RESET_AUDIO_SRC = '/audio/practices/90-second-reset.mp3';

export const RESET_ROUTES: ResetRoutes = {
  intro: BASE,
  session: `${BASE}/session`,
  complete: `${BASE}/complete`,
  practices: '/dashboard/practices',
  dashboard: '/dashboard',
};

export const RESET_COPY = {
  title: '90-Second Reset',
  brand: 'The Nervous System Institute',
  category: 'Safety / PowerDrop',
  subtitle: 'A moment to return to where you are.',
  description:
    'When everything feels like too much, take a moment to pause, notice your surroundings and reconnect with the present.',
  // The practice name stays "90-Second Reset"; the label is the recording's real length.
  durationLabel: formatDurationLabel(),
  begin: 'Begin Reset',
  backToPractices: 'Back to practices',

  session: {
    exit: 'Exit practice',
    transcript: 'Transcript',
    hideTranscript: 'Hide transcript',
    play: 'Play',
    pause: 'Pause',
    resume: 'Resume',
    readyHint: 'Press play when you’re ready.',
    elapsed: 'elapsed',
    remaining: 'remaining',
    // Shown only while the recording loads or if it cannot be played. Wording for Caroline to approve.
    audioLoading: 'Loading the audio…',
    audioError: 'The audio couldn’t be played. Check your connection, then try again.',
    audioRetry: 'Try again',
  },

  complete: {
    indicator: 'Practice completed',
    heading: 'You’ve made a little space.',
    message:
      'You don’t have to fix everything right now. Take what you need from this moment and move forward in your own time.',
    finish: 'Finish',
    dashboard: 'Return to Dashboard',
  },
} as const;
