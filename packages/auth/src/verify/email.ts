/**
 * Looks up a user's email addresses at the identity provider (Clerk), because
 * the free-trial eligibility check must rely on a VERIFIED PRIMARY address
 * as the provider reports it - never on `users.email` in our own database,
 * which is copied from the first listed address and carries no verification
 * status. Server-side only (needs the Clerk secret key).
 *
 * Failures are reported as `ProviderLookupError` with a fixed message: the
 * underlying error can carry request details and is deliberately not passed on.
 */
import { createClerkClient } from '@clerk/backend';
import type { ProviderUserEmails } from '../trial/email';

export class ProviderLookupError extends Error {
  constructor() {
    super('Could not read the account email from the identity provider.');
    this.name = 'ProviderLookupError';
  }
}

/** The one Clerk call this needs; Clerk's backend client satisfies it. */
export interface ProviderUserReader {
  users: { getUser(userId: string): Promise<ProviderUserEmails> };
}

let cachedClient: ReturnType<typeof createClerkClient> | null = null;

function defaultReader(): ProviderUserReader {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) throw new ProviderLookupError();
  cachedClient ??= createClerkClient({ secretKey });
  return cachedClient as unknown as ProviderUserReader;
}

/** The user's email addresses and which one is primary, exactly as the provider reports them. */
export async function fetchProviderUserEmails(
  clerkUserId: string,
  reader?: ProviderUserReader,
): Promise<ProviderUserEmails> {
  try {
    const user = await (reader ?? defaultReader()).users.getUser(clerkUserId);
    return {
      primaryEmailAddressId: user.primaryEmailAddressId,
      emailAddresses: user.emailAddresses,
    };
  } catch {
    throw new ProviderLookupError();
  }
}
