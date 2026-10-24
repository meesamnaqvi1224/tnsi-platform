import { describe, expect, it, vi } from 'vitest';
import { fetchProviderUserEmails, ProviderLookupError, type ProviderUserReader } from './email';

const user = {
  primaryEmailAddressId: 'e1',
  emailAddresses: [
    { id: 'e1', emailAddress: 'Jane@Example.com', verification: { status: 'verified' } },
    { id: 'e2', emailAddress: 'other@example.com', verification: { status: 'unverified' } },
  ],
};

describe('fetchProviderUserEmails', () => {
  it('returns the addresses and the primary id exactly as the provider reports them', async () => {
    const getUser = vi.fn().mockResolvedValue({ ...user, id: 'user_1', firstName: 'ignored' });
    const result = await fetchProviderUserEmails('user_1', { users: { getUser } });
    expect(getUser).toHaveBeenCalledWith('user_1');
    expect(result).toEqual(user);
  });

  it('does not pass through any other profile data', async () => {
    const reader: ProviderUserReader = {
      users: { getUser: async () => ({ ...user, firstName: 'Jane', phone: '+44' }) as never },
    };
    expect(Object.keys(await fetchProviderUserEmails('u', reader))).toEqual([
      'primaryEmailAddressId',
      'emailAddresses',
    ]);
  });

  it('wraps any provider failure in a fixed error that leaks nothing', async () => {
    const reader: ProviderUserReader = {
      users: { getUser: async () => Promise.reject(new Error('secret-detail jane@example.com')) },
    };
    const error = await fetchProviderUserEmails('u', reader).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ProviderLookupError);
    expect((error as Error).message).not.toContain('secret-detail');
    expect((error as Error).message).not.toContain('jane');
  });

  it('fails with the same error when the Clerk secret key is not configured', async () => {
    const saved = process.env.CLERK_SECRET_KEY;
    delete process.env.CLERK_SECRET_KEY;
    try {
      await expect(fetchProviderUserEmails('u')).rejects.toBeInstanceOf(ProviderLookupError);
    } finally {
      if (saved !== undefined) process.env.CLERK_SECRET_KEY = saved;
    }
  });
});
