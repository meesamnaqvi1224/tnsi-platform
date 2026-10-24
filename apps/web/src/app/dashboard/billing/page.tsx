import { Container, Section } from '@tnsi/ui';
import { MembershipOverview } from '@/components/dashboard/membership/membership-overview';
import { requireAuthOrRedirect } from '@/lib/auth-api';
import { getBillingState } from '@/lib/billing';
import { reconcileCheckoutReturn } from '@/lib/reconcile-checkout-session';
import { isMembershipOpen } from '@/lib/membership';
import { buildMembershipView } from '@/lib/membership-view';
import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: 'Membership',
  description: 'Your Regulation Suite™ membership, access and billing.',
  path: '/dashboard/billing',
  noIndex: true,
});

interface BillingPageProps {
  searchParams: Promise<{ success?: string; canceled?: string; session_id?: string | string[] }>;
}

/**
 * The member's Regulation Suite™ membership page. The route stays
 * `/dashboard/billing` — it is where checkout returns, where the billing
 * portal returns, and where members without access are redirected — and it
 * reads the same entitlement-derived billing state it always has.
 */
export default async function BillingPage({ searchParams }: BillingPageProps) {
  const user = await requireAuthOrRedirect();
  const { success, canceled, session_id: sessionId } = await searchParams;
  // Returning from Checkout: verify the session with Stripe BEFORE reading the
  // membership, so a payment that has cleared is already reflected below. The
  // identifier is an unverified claim; see `reconcileCheckoutReturn`.
  const checkoutReturn =
    success && typeof sessionId === 'string'
      ? await reconcileCheckoutReturn({ userId: user.id, sessionId })
      : undefined;
  const billing = await getBillingState(user.id);

  return (
    <main id="main-content">
      <Section spacing="xl">
        <Container size="xl">
          <div className="mx-auto max-w-3xl">
            <MembershipOverview
              view={buildMembershipView(billing)}
              membershipOpen={isMembershipOpen()}
              checkoutSuccess={Boolean(success)}
              checkoutOutcome={checkoutReturn?.status}
              checkoutCanceled={Boolean(canceled)}
            />
          </div>
        </Container>
      </Section>
    </main>
  );
}
