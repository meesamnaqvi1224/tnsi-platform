import {
  Alert,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Container,
  Divider,
  Eyebrow,
  Heading,
  Section,
  Stack,
  Text,
} from '@tnsi/ui';
import { MEMBERSHIP_PLANS, MEMBERSHIP_TRIAL_DAYS } from '@tnsi/integrations';
import { ManageBillingButton, SubscribeButton } from '@/components/dashboard/billing-actions';
import { requireAuthOrRedirect } from '@/lib/auth-api';
import { getBillingState } from '@/lib/billing';
import { isMembershipOpen } from '@/lib/membership';
import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: 'Billing',
  description: 'Manage your membership and billing details.',
  path: '/dashboard/billing',
  noIndex: true,
});

const TIER_LABELS = {
  free: 'Free Member',
  monthly: 'Monthly Member',
  annual: 'Annual Member',
  lifetime: 'Lifetime Member',
} as const;

const STATE_LABELS = {
  free: 'Free account',
  trialing: 'Free trial',
  active: 'Active',
  grace: 'Payment needs attention',
  inactive: 'Membership ended',
} as const;

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

interface BillingPageProps {
  searchParams: Promise<{ success?: string; canceled?: string }>;
}

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const user = await requireAuthOrRedirect();
  const billing = await getBillingState(user.id);
  const { success, canceled } = await searchParams;
  const membershipOpen = isMembershipOpen();
  const { membership } = billing;

  const cardTitleClassName = 'font-heading text-2xl font-semibold tracking-tight text-foreground';

  // The 30-day trial is only offered to an account that has never had a
  // subscription — the same rule the checkout route enforces server-side.
  const trialEligible = !billing.hasHadSubscription;
  const canSubscribe = membershipOpen && !membership.hasPaidAccess;
  const monthly = MEMBERSHIP_PLANS.monthly;
  const annual = MEMBERSHIP_PLANS.annual;

  return (
    <>
      <main id="main-content">
        <Section spacing="xl">
          <Container size="xl">
            <div className="mx-auto max-w-2xl">
              <Stack gap="2xl">
                <header className="border-border flex flex-col gap-(--space-md) border-b pb-(--space-2xl)">
                  <Eyebrow>Billing</Eyebrow>
                  <Heading as="h1" size="xl">
                    Billing
                  </Heading>
                  <Text tone="muted" className="text-base leading-[1.85] lg:text-lg">
                    Your membership and access status.
                  </Text>
                </header>

                {success ? (
                  membership.hasPaidAccess ? (
                    <Alert variant="success">
                      {membership.state === 'trialing'
                        ? 'Your free trial has started. Thank you.'
                        : 'Your membership is now active. Thank you.'}
                    </Alert>
                  ) : (
                    <Alert variant="info">
                      Thank you — we are confirming your membership with Stripe. This can take a
                      moment; refresh this page shortly.
                    </Alert>
                  )
                ) : null}
                {canceled ? (
                  <Alert>Checkout was canceled — you have not been charged.</Alert>
                ) : null}

                {membership.state === 'grace' && membership.graceEndsAt ? (
                  <Alert variant="warning">
                    We could not take your latest payment. Your access continues until{' '}
                    {formatDate(membership.graceEndsAt)}. Update your payment method in the billing
                    portal to keep your membership.
                  </Alert>
                ) : null}

                <Card>
                  <CardHeader>
                    <CardTitle className={cardTitleClassName}>
                      {TIER_LABELS[billing.tier]}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Stack gap="md">
                      <Text tone="muted">
                        Status: {STATE_LABELS[membership.state]}
                        {membership.state === 'trialing' && billing.currentPeriodEnd
                          ? ` — your ${MEMBERSHIP_TRIAL_DAYS}-day free trial ends ${formatDate(billing.currentPeriodEnd)}, then your plan begins`
                          : membership.cancelsAtPeriodEnd && billing.currentPeriodEnd
                            ? ` — access continues until ${formatDate(billing.currentPeriodEnd)}, then won't renew`
                            : membership.state === 'active' && billing.currentPeriodEnd
                              ? ` — renews ${formatDate(billing.currentPeriodEnd)}`
                              : ''}
                      </Text>

                      {billing.hasStripeCustomer ? <ManageBillingButton /> : null}

                      {canSubscribe ? (
                        <Stack gap="sm">
                          <Text tone="muted" size="sm">
                            {trialEligible
                              ? `Start your ${MEMBERSHIP_TRIAL_DAYS}-day free trial of the Regulation Suite™ for full access. Choose a plan — your first payment is taken when the trial ends.`
                              : 'Choose a plan to restore full Regulation Suite™ access.'}
                          </Text>
                          <Stack direction="row" gap="sm" wrap="wrap">
                            <SubscribeButton
                              tier="monthly"
                              label={`${trialEligible ? 'Start free trial' : 'Subscribe'} — ${monthly.price}/${monthly.interval}`}
                            />
                            <SubscribeButton
                              tier="annual"
                              label={`${trialEligible ? 'Start free trial' : 'Subscribe'} — ${annual.price}/${annual.interval}`}
                            />
                          </Stack>
                        </Stack>
                      ) : null}

                      {!membershipOpen && !membership.hasPaidAccess ? (
                        <Text tone="muted" size="sm">
                          Regulation Suite™ membership is not open for enrolment yet.
                        </Text>
                      ) : null}
                    </Stack>
                  </CardContent>
                </Card>

                <Divider />

                <Text tone="muted" size="sm">
                  Billing is handled securely by Stripe. Manage your payment method, view invoices,
                  or cancel anytime from the billing portal above — if you cancel, your access
                  continues until the end of the period you have paid for.
                </Text>
              </Stack>
            </div>
          </Container>
        </Section>
      </main>
    </>
  );
}
