import NextLink from 'next/link';
import {
  buttonVariants,
  Container,
  Divider,
  Eyebrow,
  Heading,
  Section,
  Stack,
  Text,
} from '@tnsi/ui';
import { CheckInForm } from '@/components/dashboard/check-in-form';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { requireAuthOrRedirect } from '@/lib/auth-api';
import { getTodayCheckIn } from '@/lib/check-ins';
import { formatContentTypeLabel, formatPracticeDuration, getTodayPractice } from '@/lib/practices';
import { createPageMetadata } from '@/lib/seo';
import { getLatestArticles } from '@/content/cms/loaders';
import { articlesContent } from '@/content/articles';
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
  const user = await requireAuthOrRedirect();
  const todayCheckIn = await getTodayCheckIn(user.id);
  const todayPractice = await getTodayPractice(user.id);
  const latestArticles = await getLatestArticles();
  const latestArticle = latestArticles[0] ?? null;

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

                <section aria-labelledby="practice-heading">
                  <Stack gap="lg">
                    <Stack gap="sm">
                      <Eyebrow>Today&rsquo;s Practice</Eyebrow>
                      <Heading as="h2" id="practice-heading" size="md">
                        {todayPractice
                          ? todayPractice.practice.title
                          : 'Practices are being prepared.'}
                      </Heading>
                      <Text tone="muted" className="text-base leading-[1.85]">
                        {todayPractice
                          ? (todayPractice.practice.description ??
                            'A practice from The Nervous System Institute.')
                          : 'The practice library will appear here as content becomes available.'}
                      </Text>
                    </Stack>

                    {todayPractice ? (
                      <Stack gap="sm">
                        <Text tone="muted" size="sm">
                          {[
                            formatContentTypeLabel(todayPractice.practice.contentType),
                            formatPracticeDuration(todayPractice.practice.durationSeconds),
                            todayPractice.practice.category,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </Text>

                        {todayPractice.completed ? (
                          <Text role="status" tone="muted">
                            Completed
                          </Text>
                        ) : (
                          <NextLink
                            href={`/dashboard/practices/${todayPractice.practice.id}`}
                            className={buttonVariants({ variant: 'primary', size: 'md' })}
                          >
                            Begin Practice
                          </NextLink>
                        )}

                        <NextLink
                          href="/dashboard/practices"
                          className="interaction-text-link-underline w-fit"
                        >
                          View the Practice Library
                        </NextLink>
                      </Stack>
                    ) : null}
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

                    {latestArticle ? (
                      <Stack gap="3xs">
                        <Eyebrow>Latest from the Institute</Eyebrow>
                        <NextLink
                          href={latestArticle.href}
                          className="interaction-colors interaction-focus font-heading text-foreground hover:text-muted-foreground w-fit text-lg font-semibold"
                        >
                          {latestArticle.title}
                        </NextLink>
                        <Text tone="muted" size="sm">
                          {[latestArticle.category, latestArticle.publishedAt]
                            .filter(Boolean)
                            .join(' · ')}
                        </Text>
                        <Text tone="muted" className="mt-(--space-2xs) text-base leading-[1.7]">
                          {latestArticle.summary}
                        </Text>
                      </Stack>
                    ) : null}

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

                    <Stack gap="xs">
                      <Text size="sm" weight="medium">
                        Browse articles by category
                      </Text>
                      <Stack direction="row" wrap="wrap" gap="md">
                        {articlesContent.categories.items.map((category) => (
                          <NextLink
                            key={category.id}
                            href={category.href}
                            className="interaction-text-link-underline"
                          >
                            {category.label}
                          </NextLink>
                        ))}
                      </Stack>
                    </Stack>
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
