/**
 * Tells the server a guided exercise was finished, so the completion counts like any other (History,
 * progress, and the daily suggestion avoiding an immediate repeat). Fire and forget: the quiet
 * closing screen must never wait on, or be spoiled by, a network call, so a failure is silent. Only
 * the fact of completion is sent: the member's answers stay on their device.
 */
export function recordExerciseCompletion(slug: string): void {
  void fetch(`/api/v1/practices/exercise/${encodeURIComponent(slug)}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed: true, progressPct: 1 }),
    keepalive: true,
  }).catch(() => {});
}
