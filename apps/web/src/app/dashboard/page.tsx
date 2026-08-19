import NextLink from 'next/link';
import { Container, Divider, Eyebrow, Heading, Section, Stack, Text } from '@tnsi/ui';
import { CheckInForm } from '@/components/dashboard/check-in-form';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { requireAuth } from '@/lib/auth-api';
import { getTodayCheckIn } from '@/lib/check-ins';
import { createPageMetadata } from '@/lib/seo';
import type { Entitlement } from '@tnsi/db/schema';

export const metadata = createPageMetadata({
  title: 'Member Dashboard',
  description: 'Your private space for exploring the work of The Nervous System Institute.',
  path: '/dashboard',
  noIndex: true,
});

/**
 * Labels for every current entitlement tier, so this section can render a
 * paid tier correctly the moment one exists (C10) without needing a
 * redesign — no tier-specific copy beyond an honest, generic sentence is
 * written here, since nothing in the repository populates a paid tier yet.
 */
const TIER_LABELS: Record<Entitlement['tier'], string> = {
  free: 'Free Member',
  monthly: 'Monthly Member',
  annual: 'Annual Member',
  lifetime: 'Lifetime Member',
};

const exploreLinks = [
  {
    title: 'Articles',
    description: 'Ideas, research and perspectives from TNSI.',
    href: '/articles',
  },
  {
    title: 'Resources',
    description: "Explore the institute's knowledge library.",
    href: '/resources',
  },
  {
    title: 'Our Pathways',
    description: "Find the pathway that's right for you.",
    href: '/programs',
  },
] as const;

export default async function DashboardPage() {
  const user = await requireAuth();
  const todayCheckIn = await getTodayCheckIn(user.id);

  const firstName = user.fullName?.trim().split(/\s+/)[0] || null;
  const tier = user.entitlements?.tier ?? 'free';
  const accessLabel = TIER_LABELS[tier];
  const accessDescription =
    tier === 'free'
      ? "You're currently exploring the institute as a free member."
      : `Your current membership tier is ${accessLabel}.`;

  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <Section spacing="xl">
          <Container size="xl">
            <div className="mx-auto max-w-3xl">
              <Stack gap="3xl">
                <header className="border-border flex flex-col gap-(--space-md) border-b pb-(--space-2xl)">
                  <Heading as="h1" size="xl">
                    {firstName ? `Welcome, ${firstName}.` : 'Welcome.'}
                  </Heading>
                  <Text tone="muted" className="text-base leading-[1.85] lg:text-lg">
                    Your space for exploring the work of The Nervous System Institute.
                  </Text>
                </header>

                <section aria-labelledby="access-heading">
                  <Stack gap="sm">
                    <Eyebrow>Your Access</Eyebrow>
                    <Heading as="h2" id="access-heading" size="md">
                      {accessLabel}
                    </Heading>
                    <Text tone="muted" className="text-base leading-[1.85]">
                      {accessDescription}
                    </Text>
                  </Stack>
                </section>

                <Divider />

                <section aria-labelledby="checkin-heading">
                  <Stack gap="lg">
                    <Stack gap="sm">
                      <Eyebrow>Check In</Eyebrow>
                      <Heading as="h2" id="checkin-heading" size="md">
                        {todayCheckIn ? "You've checked in today." : 'Pause for a moment.'}
                      </Heading>
                      <Text tone="muted" className="text-base leading-[1.85]">
                        {todayCheckIn
                          ? 'Take a moment to notice where you are, and return whenever you need to pause.'
                          : 'Notice where you are today, without needing to change anything.'}
                      </Text>
                    </Stack>

                    {todayCheckIn ? null : <CheckInForm />}
                  </Stack>
                </section>

                <Divider />

                <section aria-labelledby="explore-heading">
                  <Stack gap="xl">
                    <Stack gap="sm">
                      <Eyebrow>Continue Exploring</Eyebrow>
                      <Heading as="h2" id="explore-heading" size="md">
                        Continue exploring
                      </Heading>
                      <Text tone="muted" className="text-base leading-[1.85]">
                        Explore the ideas, research and pathways that shape the work of The Nervous
                        System Institute.
                      </Text>
                    </Stack>

                    <ul className="flex flex-col gap-(--space-lg)">
                      {exploreLinks.map((item) => (
                        <li key={item.href}>
                          <Stack gap="3xs">
                            <NextLink
                              href={item.href}
                              className="interaction-colors interaction-focus font-heading text-foreground hover:text-muted-foreground w-fit text-lg font-semibold"
                            >
                              {item.title}
                            </NextLink>
                            <Text tone="muted" size="sm">
                              {item.description}
                            </Text>
                          </Stack>
                        </li>
                      ))}
                    </ul>
                  </Stack>
                </section>

                <Divider />

                <section aria-labelledby="account-heading">
                  <Stack gap="sm">
                    <Eyebrow>Account</Eyebrow>
                    <Heading as="h2" id="account-heading" size="md">
                      Account
                    </Heading>
                    <Text tone="muted" className="text-base leading-[1.85]">
                      Manage your account details and sign-in settings from the account menu in the
                      site header.
                    </Text>
                  </Stack>
                </section>
              </Stack>
            </div>
          </Container>
        </Section>
      </main>
      <SiteFooter />
    </>
  );
}
