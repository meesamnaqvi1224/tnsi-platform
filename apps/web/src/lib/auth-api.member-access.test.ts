import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The member-area gate (`requireMemberAccess` / `requireMemberAccessOrRedirect`)
 * against the approved lifecycle: Free account → Paid membership → Membership
 * ends → Free account. The real gate, the real `resolveMembership` and the
 * real `contentAccessFor` run; only Clerk, Next's redirect and the database
 * are replaced. No database is touched.
 */

const state = vi.hoisted(() => ({
  clerkUserId: 'clerk_1' as string | null,
  entitlements: null as Record<string, unknown> | null,
}));

class Redirected extends Error {
  constructor(public readonly to: string) {
    super(`REDIRECT:${to}`);
  }
}

vi.mock('@clerk/nextjs/server', () => ({ auth: async () => ({ userId: state.clerkUserId }) }));
vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
vi.mock('next/navigation', () => ({
  redirect: (to: string) => {
    throw new Redirected(to);
  },
}));
vi.mock('drizzle-orm', () => ({ eq: () => ({}) }));
vi.mock('@tnsi/auth/sync/user', () => ({ getOrCreateUser: async () => undefined }));
vi.mock('./user-sync-ops', () => ({ userSyncOps: {} }));

vi.mock('@tnsi/db', () => {
  // `db.select().from(table).where().limit()` — users first, entitlements second.
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
      return state.entitlements ? [state.entitlements] : [];
    },
  };
  return { db: { select: () => chain }, users, entitlements };
});

const { requireMemberAccess, requireMemberAccessOrRedirect } = await import('./auth-api');
const { contentAccessFor } = await import('./membership');
const { resolveMembership } = await import('@tnsi/auth/authorize/entitlements');

const DAY = 24 * 60 * 60 * 1000;

function entitlement(overrides: Record<string, unknown> = {}) {
  return {
    tier: 'monthly',
    status: 'active',
    programs: [],
    certifications: [],
    features: [],
    cancelAtPeriodEnd: false,
    paymentFailedAt: null,
    ...overrides,
  };
}

beforeEach(() => {
  state.clerkUserId = 'clerk_1';
  state.entitlements = null;
});

describe('member-area gate across the membership lifecycle', () => {
  // A, B, C — paid access is retained.
  it.each([
    ['A. active paid member', entitlement({ tier: 'annual', status: 'active' })],
    ['A. trialing member', entitlement({ status: 'trialing' })],
    ['B. cancelled but still within the paid period', entitlement({ cancelAtPeriodEnd: true })],
    [
      'C. past_due inside the 7-day grace period',
      entitlement({ status: 'past_due', paymentFailedAt: new Date(Date.now() - 2 * DAY) }),
    ],
  ])('%s: enters the member area and keeps PAID access', async (_label, row) => {
    state.entitlements = row;
    await expect(requireMemberAccessOrRedirect()).resolves.toMatchObject({ id: 'user-1' });
    expect(resolveMembership(row as never).hasPaidAccess).toBe(true);
    // With membership open, paid-only content is available to them.
    expect(contentAccessFor(row as never, { gatingActive: true }).canOpen({ isFree: false })).toBe(
      true,
    );
  });

  // D — ended membership becomes a Free Member.
  it.each([
    ['cancelled and the paid period over', entitlement({ tier: 'monthly', status: 'canceled' })],
    ['expired', entitlement({ tier: 'annual', status: 'expired' })],
    [
      'unpaid past the 7-day grace period',
      entitlement({ status: 'past_due', paymentFailedAt: new Date(Date.now() - 8 * DAY) }),
    ],
    ['past_due with no recorded failure', entitlement({ status: 'past_due' })],
  ])('D. ended (%s): NOT redirected, treated as a free member', async (_label, row) => {
    state.entitlements = row;
    // No redirect, no 403 — the user keeps the account…
    await expect(requireMemberAccessOrRedirect()).resolves.toMatchObject({ id: 'user-1' });
    await expect(requireMemberAccess()).resolves.toMatchObject({ id: 'user-1' });
    // …but paid access is gone, and the free-account rules apply.
    expect(resolveMembership(row as never).hasPaidAccess).toBe(false);
    const open = contentAccessFor(row as never, { gatingActive: true });
    expect(open.canOpen({ isFree: true })).toBe(true);
    expect(open.canOpen({ isFree: false })).toBe(false);
  });

  // E — a free member.
  it('E. free member: enters the member area; free content open, paid content not (membership open)', async () => {
    state.entitlements = entitlement({ tier: 'free', status: 'active' });
    await expect(requireMemberAccessOrRedirect()).resolves.toMatchObject({ id: 'user-1' });
    const access = contentAccessFor(state.entitlements as never, { gatingActive: true });
    expect(access.membership.state).toBe('free');
    expect(access.canOpen({ isFree: true })).toBe(true);
    expect(access.canOpen({ isFree: false })).toBe(false);
  });

  it('while membership is closed (today) an ended member, like any free member, has nothing locked', async () => {
    state.entitlements = entitlement({ status: 'canceled' });
    const access = contentAccessFor(state.entitlements as never, { gatingActive: false });
    expect(access.canOpen({ isFree: false })).toBe(true);
  });

  it('no redirect loop: the only member-area redirect is for a user with no entitlement row, and it targets a page that needs authentication only', async () => {
    state.entitlements = null;
    await expect(requireMemberAccessOrRedirect()).rejects.toMatchObject({
      to: '/dashboard/billing',
    });
    // An ended member on that same path is not sent anywhere.
    state.entitlements = entitlement({ status: 'canceled' });
    await expect(requireMemberAccessOrRedirect()).resolves.toBeDefined();
  });

  it('an unauthenticated visitor is still sent to sign-in', async () => {
    state.clerkUserId = null;
    await expect(requireMemberAccessOrRedirect()).rejects.toMatchObject({ to: '/sign-in' });
  });
});
