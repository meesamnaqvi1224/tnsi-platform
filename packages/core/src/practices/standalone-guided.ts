/**
 * Guided practices that are their own native experience, with their own recording, stages and
 * completion screen, rather than a recording played by the generic practice page. Each has a
 * record in the CMS (so it can be tagged, listed and recommended like any other practice) with
 * `contentType = 'interactive'` and its key in `interactiveKey`; the apps open the matching screen
 * instead of the generic player. The key is also the route name on both the website
 * (`/dashboard/practices/<key>`) and the app (`/practices/<key>`).
 */
export const STANDALONE_GUIDED_KEYS = ['90-second-reset', 'the-empty-chair'] as const;

export type StandaloneGuidedKey = (typeof STANDALONE_GUIDED_KEYS)[number];

/** The standalone experience a practice opens, or `null` for an ordinary practice. */
export function standaloneGuidedKey(practice: {
  contentType: string;
  interactiveKey?: string | null;
}): StandaloneGuidedKey | null {
  if (practice.contentType !== 'interactive') return null;
  return STANDALONE_GUIDED_KEYS.find((key) => key === practice.interactiveKey) ?? null;
}
