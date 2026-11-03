import type { GuidedPracticeSlug } from '@/lib/guided-practices';

/**
 * The recordings, bundled by Metro from the web app's own files so there is one
 * copy of each MP3 in the repository (Metro watches the whole workspace; see
 * metro.config.js). A bundled asset plays without a network or a sign-in.
 */
export const GUIDED_PRACTICE_AUDIO: Record<GuidedPracticeSlug, number> = {
  '90-second-reset': require('../../../../web/public/audio/practices/90-second-reset.mp3'),
  'the-empty-chair': require('../../../../web/public/audio/practices/the-empty-chair.mp3'),
};
