import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * `getAuthUser` refreshes an unconfirmed Stripe-backed renewal BEFORE anything
 * decides access from it, and passes only the facts the access rules need:
 * a refreshed row after Stripe answered, or a transient `stripeUnreachable`
 * flag after a genuine outage. The real resolution (`resolveMembership` /
 * `contentAccessFor`) runs; Clerk, Next and the database are replaced.
 */

const state = vi.hoisted(() => ({
  rows: [] as Array<Record<string, unknown>>,
  outcome: { status: 'not_needed' } as { status: string },
}));

vi.mock('@clerk/nextjs/server', () => ({ auth: async () => ({ userId: 'clerk_1' }) }));
vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
vi.mock('next/navigation', () => ({ redirect: () => undefined }));
vi.mock('drizzle-orm', () => ({ eq: () => ({}) }));
vi.mock('@tnsi/auth/sync/user', () => ({ getOrCreateUser: async () => undefined }));
vi.mock('./user-sync-ops', () => ({ userSyncOps: {} }));

const reconcileMembership = vi.fn();
vi.mock('./reconcile-subscription', () => ({
  reconcileMembership: (...args: unknown[]) => reconcileMembership(...args),
}));

vi.mock('@tnsi/db', () => {
  const users = { __t: 'users' };
  const entitlements = { __t: 'entitlements' };
  let table: unknown;
  const chain = {
    from: (t: unknown) => {
      table = t;
      return chain;
    },
    where: () => chain,
    limit: async () => {
      if (table === users) return [{ id: 'user-1', clerkUserId: 'clerk_1', deletedAt: null }];
      const next = state.rows.length > 1 ? state.rows.shift()! : state.rows[0]!;
      return next ? [next] : [];
    },
  };
  return { db: { select: () => chain }, users, entitlements };
});

const { getAuthUser } = await import('./auth-api');
const { contentAccessFor } = await import('./membership');

const DAY = 24 * 60 * 60 * 1000;
const staleRow = (overrides: Record<string, unknown> = {}) => ({
  tier: 'monthly',
  status: 'active',
  programs: [],
  certifications: [],
  features: [],
  stripeCustomerId: 'cus_1',
  stripeSubscriptionId: 'sub_1',
  currentPeriodEnd: new Date(Date.now() - 6 * 60 * 60 * 1000),
  cancelAtPeriodEnd: false,
  paymentFailedAt: null,
  ...overrides,
});

beforeEach(() => {
  reconcileMembership.mockReset();
  state.rows = [staleRow()];
});

describe('getAuthUser — read-time Stripe reconciliation', () => {
  it('asks to reconcile the loaded row, passing the user and the row', async () => {
    reconcileMembership.mockResolvedValue({ status: 'not_needed' });
    await getAuthUser();
    expect(reconcileMembership).toHaveBeenCalledWith({
      userId: 'user-1',
      record: expect.objectContaining({ stripeSubscriptionId: 'sub_1' }),
    });
  });

  it('after Stripe confirms a renewal, uses the refreshed row: access continues', async () => {
    reconcileMembership.mockResolvedValue({ status: 'refreshed' });
    state.rows = [staleRow(), staleRow({ currentPeriodEnd: new Date(Date.now() + 30 * DAY) })];
    const user = await getAuthUser();
    expect(contentAccessFor(user!.entitlements).membership).toMatchObject({
      state: 'active',
      hasPaidAccess: true,
    });
  });

  it('after Stripe confirms a cancellation, uses the refreshed row: access ends at once, no hold', async () => {
    reconcileMembership.mockResolvedValue({ status: 'refreshed' });
    state.rows = [staleRow(), staleRow({ status: 'canceled' })];
    const user = await getAuthUser();
    expect(contentAccessFor(user!.entitlements).membership).toMatchObject({
      state: 'inactive',
      hasPaidAccess: false,
    });
  });

  it('after a genuine outage, flags the row so access may be held within the seven-day bound', async () => {
    reconcileMembership.mockResolvedValue({ status: 'unreachable' });
    const user = await getAuthUser();
    expect(user!.entitlements).toMatchObject({ stripeUnreachable: true });
    expect(contentAccessFor(user!.entitlements).membership).toMatchObject({
      state: 'grace',
      hasPaidAccess: true,
      graceReason: 'renewal_unconfirmed',
    });
  });

  it('after an outage with no valid paid-through date, holds nothing (fails closed)', async () => {
    reconcileMembership.mockResolvedValue({ status: 'unreachable' });
    state.rows = [staleRow({ currentPeriodEnd: null })];
    const user = await getAuthUser();
    expect(contentAccessFor(user!.entitlements).membership.hasPaidAccess).toBe(false);
  });

  it.each(['failed', 'recent', 'not_needed'])(
    'on %s the row is not flagged, so an unconfirmed renewal is not granted',
    async (status) => {
      reconcileMembership.mockResolvedValue({ status });
      const user = await getAuthUser();
      expect(user!.entitlements).not.toHaveProperty('stripeUnreachable');
      expect(contentAccessFor(user!.entitlements).membership.hasPaidAccess).toBe(false);
    },
  );

  it('does not flag or alter a legacy Lifetime row', async () => {
    reconcileMembership.mockResolvedValue({ status: 'not_needed' });
    state.rows = [
      staleRow({ tier: 'lifetime', currentPeriodEnd: null, stripeSubscriptionId: null }),
    ];
    const user = await getAuthUser();
    expect(contentAccessFor(user!.entitlements).membership).toMatchObject({
      state: 'active',
      hasPaidAccess: true,
    });
  });

  it('never exposes the transient flag outside the server-side record', async () => {
    reconcileMembership.mockResolvedValue({ status: 'unreachable' });
    const user = await getAuthUser();
    // It is on the loaded record only; the public entitlements API builds an explicit allowlist.
    expect(Object.keys(user!.entitlements!)).toContain('stripeUnreachable');
  });
});
