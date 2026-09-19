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
import { ProgressBar } from '@/components/dashboard/progress-bar';
import { WeekAtAGlance } from '@/components/dashboard/week-at-a-glance';
import { requireMemberAccessOrRedirect } from '@/lib/auth-api';
import { getCheckInHistory, getTodayCheckIn } from '@/lib/check-ins';
import {
  formatContentTypeLabel,
  formatPracticeDuration,
  getCompletedPracticeCount,
  getInProgressPracticeCount,
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
const IN_PROGRESS_LIMIT = 5;
/** Matches the native app's own fetch size for this same "week at a
 * glance" reflection - enough rows to cover the last 7 calendar days even
 * with gaps, since at most one check-in exists per day. */
const RECENT_CHECK_INS_LIMIT = 20;

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

/**
 * An in-progress practice's type/duration line plus a quiet visual
 * progress indicator — replaces a previous bare "45% complete" string
 * (the raw number was the most prominent thing next to every title) with
 * a thin bar, the same softening the native app's own ContinuePractiseCard
 * already applies to this identical `progressPct` field. The percentage
 * is still shown, just as a small secondary label beside the bar rather
 * than headline text.
 */
function InProgressMeta({
  practice,
}: {
  practice: { contentType: string; durationSeconds: number | null; progressPct: number };
}) {
  const meta = [
    formatContentTypeLabel(practice.contentType),
    formatPracticeDuration(practice.durationSeconds),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Stack gap="xs">
      <Text tone="muted" size="sm">
        {meta}
      </Text>
      <Stack direction="row" align="center" gap="sm">
        <ProgressBar value={practice.progressPct} className="max-w-40" />
        <Text tone="muted" size="xs">
          {Math.round(practice.progressPct * 100)}%
        </Text>
      </Stack>
    </Stack>
  );
}

/**
 * The "Your Access" card's activity line — a sentence, not a stat pair.
 * Previously read "{N} practices completed · {M} in progress" as a bare
 * KPI-tile-style line; this keeps both real numbers but folds them into
 * prose, and omits the line entirely when there's nothing to report yet
 * rather than showing zeroes (mirroring the native app's own preference
 * for hiding empty/zero quantified states over displaying them).
 */
function accessActivitySentence(completedCount: number, inProgressCount: number): string | null {
  if (completedCount === 0 && inProgressCount === 0) return null;

  const completedPart =
    completedCount > 0
      ? `completed ${completedCount} ${completedCount === 1 ? 'practice' : 'practices'}`
      : null;
  const inProgressPart = inProgressCount > 0 ? `${inProgressCount} under way` : null;

  if (completedPart && inProgressPart) {
    return `You've ${completedPart} and have ${inProgressPart}.`;
  }
  if (completedPart) {
    return `You've ${completedPart} so far.`;
  }
  return `You have ${inProgressPart} right now.`;
}

export default async function DashboardPage() {
  const user = await requireMemberAccessOrRedirect();
  const todayCheckIn = await getTodayCheckIn(user.id);
  const todayPractice = await getTodayPractice(user.id);
  const [
    inProgressPractices,
    inProgressCount,
    completedCount,
    recentCompletions,
    latestArticles,
    checkInHistory,
  ] = await Promise.all([
    getInProgressPractices(user.id, IN_PROGRESS_LIMIT),
    getInProgressPracticeCount(user.id),
    getCompletedPracticeCount(user.id),
    getRecentCompletions(user.id, RECENT_COMPLETIONS_LIMIT),
    getLatestArticles(),
    getCheckInHistory(user.id, RECENT_CHECK_INS_LIMIT, 0),
  ]);
  const [continuePractice, ...moreInProgress] = inProgressPractices;
  const latestArticle = latestArticles[0] ?? null;

  const firstName = user.fullName?.trim().split(/\s+/)[0] || null;
  const tier = user.entitlements?.tier ?? 'free';
  const accessLabel = TIER_LABELS[tier];
  const accessDescription =
    tier === 'free'
      ? "You're currently exploring the institute as a free member."
      : `Your current membership tier is ${accessLabel}.`;
  const accessActivity = accessActivitySentence(completedCount, inProgressCount);

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
                        {accessActivity ? (
                          <Text tone="muted" size="sm">
                            {accessActivity}
                          </Text>
                        ) : null}
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

                {/* Continue Learning — prioritized above Today's Practice whenever there's
                    unfinished work; omitted entirely when there's nothing in progress. */}
                {continuePractice ? (
                  <section aria-labelledby="continue-heading">
                    <Stack gap="lg">
                      <Eyebrow>Continue Learning</Eyebrow>

                      <Card>
                        <CardHeader>
                          <Eyebrow>Continue Where You Left Off</Eyebrow>
                          <CardTitle id="continue-heading" className={cardTitleClassName}>
                            {continuePractice.title}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Stack gap="md">
                            <InProgressMeta practice={continuePractice} />
                            <NextLink
                              href={`/dashboard/practices/${continuePractice.id}`}
                              className={buttonVariants({ variant: 'primary', size: 'md' })}
                            >
                              Resume Practice
                            </NextLink>
                          </Stack>
                        </CardContent>
                      </Card>

                      {moreInProgress.length > 0 ? (
                        <ul className="flex flex-col gap-(--space-md)">
                          {moreInProgress.map((practice) => (
                            <li
                              key={practice.id}
                              className="border-border border-t pt-(--space-md)"
                            >
                              <NextLink
                                href={`/dashboard/practices/${practice.id}`}
                                className="interaction-colors interaction-focus font-heading text-foreground hover:text-muted-foreground w-fit text-base font-semibold"
                              >
                                {practice.title}
                              </NextLink>
                              <InProgressMeta practice={practice} />
                            </li>
                          ))}
                        </ul>
                      ) : null}

                      {inProgressCount > inProgressPractices.length ? (
                        <NextLink
                          href="/dashboard/practices?status=in-progress"
                          className="interaction-text-link-underline w-fit"
                        >
                          View all in-progress practices
                        </NextLink>
                      ) : null}
                    </Stack>
                  </section>
                ) : null}

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
                                  `Level ${todayPractice.practice.difficulty}`,
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

                <WeekAtAGlance recentCheckIns={checkInHistory.checkIns} />

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
