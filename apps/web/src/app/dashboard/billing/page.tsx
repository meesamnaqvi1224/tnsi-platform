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
import { ManageBillingButton, SubscribeButton } from '@/components/dashboard/billing-actions';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { requireAuthOrRedirect } from '@/lib/auth-api';
import { getBillingState } from '@/lib/billing';
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

const STATUS_LABELS = {
  active: 'Active',
  trialing: 'Trial',
  past_due: 'Payment overdue',
  canceled: 'Canceled',
  expired: 'Expired',
} as const;

interface BillingPageProps {
  searchParams: Promise<{ success?: string; canceled?: string }>;
}

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const user = await requireAuthOrRedirect();
  const billing = await getBillingState(user.id);
  const { success, canceled } = await searchParams;

  const cardTitleClassName = 'font-heading text-2xl font-semibold tracking-tight text-foreground';

  return (
    <>
      <SiteHeader />
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
                    Your membership tier and access status.
                  </Text>
                </header>

                {success ? (
                  <Alert variant="success">Your subscription is now active. Thank you.</Alert>
                ) : null}
                {canceled ? (
                  <Alert>Checkout was canceled — you have not been charged.</Alert>
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
                        Status: {STATUS_LABELS[billing.status]}
                        {billing.cancelAtPeriodEnd && billing.currentPeriodEnd
                          ? ` — access continues until ${billing.currentPeriodEnd.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}, then won't renew`
                          : billing.currentPeriodEnd
                            ? ` — renews ${billing.currentPeriodEnd.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`
                            : ''}
                      </Text>

                      {billing.hasStripeCustomer ? (
                        <ManageBillingButton />
                      ) : (
                        <Stack gap="sm">
                          <Text tone="muted" size="sm">
                            Choose a membership to unlock full access.
                          </Text>
                          <Stack direction="row" gap="sm" wrap="wrap">
                            <SubscribeButton tier="monthly" label="Subscribe monthly" />
                            <SubscribeButton tier="annual" label="Subscribe annually" />
                            <SubscribeButton tier="lifetime" label="Get lifetime access" />
                          </Stack>
                        </Stack>
                      )}
                    </Stack>
                  </CardContent>
                </Card>

                <Divider />

                <Text tone="muted" size="sm">
                  Billing is handled securely by Stripe. Manage your payment method, view invoices,
                  or cancel anytime from the billing portal above.
                </Text>
              </Stack>
            </div>
          </Container>
        </Section>
      </main>
      <SiteFooter />
    </>
  );
}
