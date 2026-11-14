/**
 * A one-shot message handed from the editor to the history screen when a reflection is saved and the
 * editor closes ("Your reflection has been saved."). It is a fixed string chosen by the app, never
 * anything the member wrote, and it lives only in memory: it is not put in a route, a URL or storage.
 */
let pending: string | null = null;

export function setReflectionNotice(message: string): void {
  pending = message;
}

/** Returns the waiting message once, then forgets it. */
export function takeReflectionNotice(): string | null {
  const message = pending;
  pending = null;
  return message;
}
