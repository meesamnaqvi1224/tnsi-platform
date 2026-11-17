import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The billing portal only manages an EXISTING Stripe customer (cancel, payment
 * method, invoices). It takes no input from the client and cannot start a new
 * purchase. Auth, the database and Stripe are mocked.
 */
const state = vi.hoisted(() => ({
  user: null as null | { id: string },
  customerId: null as string | null,
}));

vi.mock('@/lib/auth-api', () => ({
  requireAuth: async () => {
    if (!state.user) throw new Error('UNAUTHENTICATED');
    return state.user;
  },
}));

vi.mock('@tnsi/db', () => {
  const chain = {
    from: () => chain,
    where: () => chain,
    limit: async () => [{ stripeCustomerId: state.customerId }],
  };
  return { db: { select: () => chain }, entitlements: {} };
});

const createPortal = vi.fn();
vi.mock('@tnsi/integrations', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tnsi/integrations')>();
  return {
    ...actual,
    createBillingPortalSession: (input: unknown) => createPortal(input),
  };
});

const { POST } = await import('./route');
const { NoStripeCustomerError } = await import('@tnsi/integrations');

beforeEach(() => {
  createPortal.mockReset();
  createPortal.mockResolvedValue({ url: 'https://portal.stripe.test/p' });
  state.user = { id: 'user-1' };
  state.customerId = 'cus_placeholder';
});

describe('POST /api/v1/billing/portal', () => {
  it('requires authentication', async () => {
    state.user = null;
    const response = await POST();
    expect(response.status).toBe(401);
    expect(createPortal).not.toHaveBeenCalled();
  });

  it("opens the portal only for the signed-in user's own Stripe customer", async () => {
    const response = await POST();
    expect(response.status).toBe(200);
    expect(createPortal.mock.calls[0]![0]).toMatchObject({ stripeCustomerId: 'cus_placeholder' });
  });

  it('refuses an account with no Stripe customer (it cannot be used to start a purchase)', async () => {
    state.customerId = null;
    createPortal.mockRejectedValue(
      new NoStripeCustomerError('This account has no billing history yet.'),
    );
    const response = await POST();
    expect(response.status).toBe(400);
  });
});
