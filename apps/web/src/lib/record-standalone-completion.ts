/**
 * Tells the server a standalone guided practice was finished, so the completion counts like any other
 * (History, progress, and the daily suggestion avoiding an immediate repeat). Fire and forget: the
 * quiet closing screen must never wait on, or be spoiled by, a network call, so a failure is silent.
 * `keepalive` lets the request finish even though the page moves on to the closing screen.
 */
export function recordStandaloneCompletion(key: '90-second-reset' | 'the-empty-chair'): void {
  void fetch(`/api/v1/practices/standalone/${key}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed: true, progressPct: 1 }),
    keepalive: true,
  }).catch(() => {});
}
