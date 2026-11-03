/**
 * Everything The Empty Chair says and links to, in one place. Adapted from Caroline
 * Reed's Strong for Yourself workbook; nothing here is scored, rated or celebratory.
 * The one-line stage cues in ./timing.ts, the loading/error wording and the reflection
 * prompt's framing are for Caroline to approve.
 */

import type { ResetRoutes } from '../ninety-second-reset/content';
import { chairDurationLabel } from './timing';

const BASE = '/dashboard/practices/the-empty-chair';

/**
 * The final voice-over, unaltered (MP3, 270.675 s). Served from /audio, which the Clerk
 * middleware does not list as public, so only a signed-in browser can fetch it.
 */
export const CHAIR_AUDIO_SRC = '/audio/practices/the-empty-chair.mp3';

export const CHAIR_ROUTES: ResetRoutes = {
  intro: BASE,
  session: `${BASE}/session`,
  complete: `${BASE}/complete`,
  practices: '/dashboard/practices',
  dashboard: '/dashboard',
};

export const CHAIR_COPY = {
  title: 'The Empty Chair',
  subtitle: 'Taking Your Seat in Your Own Life',
  condition: 'Participation',
  format: 'Guided Reflection',
  durationLabel: chairDurationLabel(),
  purpose:
    'A gentle end-of-day reflection to notice where you have been present in your own life and consider one ordinary moment when you might take your seat again tomorrow.',
  begin: 'Begin Practice',
  backToPractices: 'Back to Practices',

  session: {
    exit: 'Exit practice',
    play: 'Play',
    pause: 'Pause',
    resume: 'Resume',
    readyHint: 'Press play when you’re ready.',
    elapsed: 'elapsed',
    remaining: 'remaining',
    audioLoading: 'Loading the audio…',
    audioError: 'The audio couldn’t be played. Check your connection, then try again.',
    audioRetry: 'Try again',
  },

  complete: {
    indicator: 'Practice completed',
    heading: 'You Took Your Seat.',
    message: 'Participation begins with presence. One moment at a time.',
    promptLabel: 'If you’d like to',
    prompt: 'What is one moment from today you want to remember?',
    finish: 'Return to Practices',
  },
} as const;
