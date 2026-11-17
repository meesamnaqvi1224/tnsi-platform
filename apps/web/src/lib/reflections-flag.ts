/**
 * The My Reflections switch.
 *
 * My Reflections is visible and usable only when the server environment variable
 * MY_REFLECTIONS_ENABLED is exactly `true`. Anything else - unset, empty, `false`, `1` - means OFF.
 * That default matters: merging the feature deploys the code, and nothing is exposed until the owner
 * deliberately turns it on (after the consent wording and lawful basis are approved, decision Q1).
 *
 * When OFF: every journal API route (entries, consent) answers 404, the pages 404, the sidebar link and
 * the dashboard invitation are not rendered, and GET /api/v1/features reports `reflections: false` so the
 * mobile app hides its entry points. Account deletion is NOT affected: it erases a member's journal
 * through the library directly, regardless of this switch.
 *
 * Read at call time (not at import) so a changed value takes effect on the next request/deploy and tests
 * can set it. Server-only: never exposed through NEXT_PUBLIC_*.
 */
export function isReflectionsEnabled(): boolean {
  return process.env.MY_REFLECTIONS_ENABLED === 'true';
}

/** Thrown by the journal access checks when the feature is switched off. Routes answer 404. */
export class ReflectionsDisabledError extends Error {
  constructor() {
    super('REFLECTIONS_DISABLED');
    this.name = 'ReflectionsDisabledError';
  }
}
