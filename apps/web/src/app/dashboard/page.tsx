import NextLink from 'next/link';
import {
  buttonVariants,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Container,
  Divider,
  EmptyState,
  Eyebrow,
  Grid,
  Heading,
  Section,
  Stack,
  Text,
} from '@tnsi/ui';
import { CheckInForm } from '@/components/dashboard/check-in-form';
import { requireAuthOrRedirect } from '@/lib/auth-api';
import { getTodayCheckIn } from '@/lib/check-ins';
import {
  formatContentTypeLabel,
  formatPracticeDuration,
  getCompletedPracticeCount,
  getInProgressPractices,
  getRecentCompletions,
  getTodayPractice,
} from '@/lib/practices';
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

const RECENT_COMPLETIONS_LIMIT = 5;

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
  {
    title: 'Capacity Assessment',
    description: 'Not sure where to begin? Take the 2-minute Capacity Assessment.',
    href: '/assessment',
  },
] as const;

/** Shared title style so Card headings match the site's serif display type instead of CardTitle's default sans style. */
const cardTitleClassName = 'font-heading text-2xl font-semibold tracking-tight text-foreground';

export default async function DashboardPage() {
  const user = await requireAuthOrRedirect();
  const todayCheckIn = await getTodayCheckIn(user.id);
  const todayPractice = await getTodayPractice(user.id);
  const [inProgressPractices, completedCount, recentCompletions, latestArticles] =
    await Promise.all([
      getInProgressPractices(user.id, 1),
      getCompletedPracticeCount(user.id),
      getRecentCompletions(user.id, RECENT_COMPLETIONS_LIMIT),
      getLatestArticles(),
    ]);
  const continuePractice = inProgressPractices[0] ?? null;
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
      <main id="main-content">
        <Section spacing="xl">
          <Container size="xl">
            <div className="mx-auto max-w-5xl">
              <Stack gap="3xl">
                <header className="border-border flex flex-col gap-(--space-md) border-b pb-(--space-2xl)">
                  <Eyebrow>Academy Home</Eyebrow>
                  <Heading as="h1" size="xl">
                    {firstName
                      ? `Welcome to the Academy, ${firstName}.`
                      : 'Welcome to the Academy.'}
                  </Heading>
                  <Text tone="muted" className="text-base leading-[1.85] lg:text-lg">
                    Your space for exploring the work of The Nervous System Institute.
                  </Text>
                </header>

                {/* Where am I */}
                <section aria-labelledby="access-heading">
                  <Card>
                    <CardHeader>
                      <Eyebrow>Your Access</Eyebrow>
                      <CardTitle id="access-heading" className={cardTitleClassName}>
                        {accessLabel}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Stack gap="sm">
                        <Text tone="muted" className="text-base leading-[1.85]">
                          {accessDescription}
                        </Text>
                        <NextLink
                          href="/dashboard/billing"
                          className="interaction-text-link-underline w-fit text-sm"
                        >
                          Manage billing
                        </NextLink>
                      </Stack>
                    </CardContent>
                  </Card>
                </section>

                {/* Today */}
                <Stack gap="xl">
                  <Eyebrow>Today</Eyebrow>
                  <Grid cols="2" gap="xl" className="items-start">
                    <section aria-labelledby="checkin-heading">
                      <Card>
                        <CardHeader>
                          <Eyebrow>Check In</Eyebrow>
                          <CardTitle id="checkin-heading" className={cardTitleClassName}>
                            {todayCheckIn ? "You've checked in today." : 'Pause for a moment.'}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Stack gap="lg">
                            <Text tone="muted" className="text-base leading-[1.85]">
                              {todayCheckIn
                                ? 'Take a moment to notice where you are, and return whenever you need to pause.'
                                : 'Notice where you are today, without needing to change anything.'}
                            </Text>

                            {todayCheckIn ? null : <CheckInForm />}
                          </Stack>
                        </CardContent>
                      </Card>
                    </section>

                    <section aria-labelledby="practice-heading">
                      <Card>
                        <CardHeader>
                          <Eyebrow>Today&rsquo;s Practice</Eyebrow>
                          <CardTitle id="practice-heading" className={cardTitleClassName}>
                            {todayPractice ? todayPractice.practice.title : "Today's Practice"}
                          </CardTitle>
                          {todayPractice?.practice.description ? (
                            <Text tone="muted" className="text-base leading-[1.85]">
                              {todayPractice.practice.description}
                            </Text>
                          ) : null}
                        </CardHeader>
                        <CardContent>
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
                          ) : (
                            <EmptyState
                              title="Practices are being prepared."
                              description="The practice library will appear here as content becomes available."
                              action={
                                <NextLink
                                  href="/dashboard/practices"
                                  className={buttonVariants({ variant: 'outline', size: 'sm' })}
                                >
                                  Visit the Practice Library
                                </NextLink>
                              }
                            />
                          )}
                        </CardContent>
                      </Card>
                    </section>
                  </Grid>
                </Stack>

                {/* Continue where you left off — omitted entirely when there's nothing in progress. */}
                {continuePractice ? (
                  <section aria-labelledby="continue-heading">
                    <Card>
                      <CardHeader>
                        <Eyebrow>Continue Where You Left Off</Eyebrow>
                        <CardTitle id="continue-heading" className={cardTitleClassName}>
                          {continuePractice.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Stack gap="sm">
                          <Text tone="muted" size="sm">
                            {[
                              formatContentTypeLabel(continuePractice.contentType),
                              formatPracticeDuration(continuePractice.durationSeconds),
                              `${Math.round(continuePractice.progressPct * 100)}% complete`,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </Text>
                          <NextLink
                            href={`/dashboard/practices/${continuePractice.id}`}
                            className={buttonVariants({ variant: 'primary', size: 'md' })}
                          >
                            Resume Practice
                          </NextLink>
                          <NextLink
                            href="/dashboard/practices?status=in-progress"
                            className="interaction-text-link-underline w-fit"
                          >
                            View all in-progress practices
                          </NextLink>
                        </Stack>
                      </CardContent>
                    </Card>
                  </section>
                ) : null}

                {/* Completed — omitted entirely for a member with nothing completed yet. */}
                {completedCount > 0 ? (
                  <section aria-labelledby="completed-heading">
                    <Stack gap="lg">
                      <Stack gap="sm">
                        <Eyebrow>Completed</Eyebrow>
                        <Heading as="h2" id="completed-heading" size="md">
                          {completedCount}{' '}
                          {completedCount === 1 ? 'practice completed' : 'practices completed'}
                        </Heading>
                      </Stack>

                      <ul className="flex flex-col gap-(--space-md)">
                        {recentCompletions.map((practice) => (
                          <li key={practice.id} className="border-border border-t pt-(--space-md)">
                            <NextLink
                              href={`/dashboard/practices/${practice.id}`}
                              className="interaction-colors interaction-focus font-heading text-foreground hover:text-muted-foreground w-fit text-base font-semibold"
                            >
                              {practice.title}
                            </NextLink>
                            <Text tone="muted" size="sm">
                              {[
                                formatContentTypeLabel(practice.contentType),
                                practice.completedAt
                                  ? new Date(practice.completedAt).toLocaleDateString('en-GB', {
                                      day: 'numeric',
                                      month: 'long',
                                      year: 'numeric',
                                    })
                                  : null,
                              ]
                                .filter(Boolean)
                                .join(' · ')}
                            </Text>
                          </li>
                        ))}
                      </ul>
                    </Stack>
                  </section>
                ) : null}

                <Divider />

                {/* Next */}
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
                      top navigation.
                    </Text>
                  </Stack>
                </section>
              </Stack>
            </div>
          </Container>
        </Section>
      </main>
    </>
  );
}
