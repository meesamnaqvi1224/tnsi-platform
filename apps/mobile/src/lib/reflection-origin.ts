/**
 * Where a My Reflections screen was opened from. A fixed token in the route; never anything written.
 *  - `home`: the Home tab's card (a different tab from Profile, where these screens live).
 *  - `progress`: the Profile -> Progress screen, which is on Profile's own stack, so a normal back is right.
 */
export type ReflectionOrigin = 'home' | 'progress';

/** Only the two known tokens are accepted from a route parameter; anything else means "unknown". */
export function parseReflectionOrigin(value: unknown): ReflectionOrigin | undefined {
  return value === 'home' || value === 'progress' ? value : undefined;
}
