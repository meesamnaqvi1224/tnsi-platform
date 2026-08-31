import 'server-only';
import Stripe from 'stripe';
import { getStripeConfig, StripeConfigError } from './config';

/**
 * The only place a `Stripe` SDK instance is constructed. `server-only`
 * guarantees a bundler error (not just a runtime one) if anything ever
 * imports this from a Client Component — the secret key must never reach
 * a client bundle.
 *
 * Lazily constructed and cached rather than built at module load: this
 * package is imported by code paths (e.g. tier-mapping) that don't touch
 * Stripe at all, and constructing the client eagerly would mean every
 * import of this package throws in an environment without
 * `STRIPE_SECRET_KEY` set (e.g. local dev before billing is configured),
 * exactly like `packages/cms/src/lib/client.ts`'s `sanityConfigured` guard
 * avoids for Sanity.
 */
let cachedClient: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (cachedClient) return cachedClient;

  const { secretKey } = getStripeConfig();
  if (!secretKey) {
    throw new StripeConfigError('Stripe is not configured — set STRIPE_SECRET_KEY.');
  }

  cachedClient = new Stripe(secretKey);
  return cachedClient;
}

/** True once a real Stripe secret key is present — callers use this to fail gracefully rather than throwing. */
export function isStripeConfigured(): boolean {
  return getStripeConfig().secretKey.length > 0;
}
