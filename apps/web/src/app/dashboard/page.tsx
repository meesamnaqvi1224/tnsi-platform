import NextLink from 'next/link';
import {
  BookOpen,
  Calendar,
  Compass,
  FileText,
  Layers,
  PlayCircle,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import {
  Badge,
  buttonVariants,
  cn,
  Container,
  Divider,
  EmptyState,
  Eyebrow,
  Heading,
  Section,
  Stack,
  Text,
} from '@tnsi/ui';
import { CheckInForm } from '@/components/dashboard/check-in-form';
import {
  PracticeArt,
  StatTile,
  TINT_CLASSES,
  tintForContentType,
  tintStyle,
  type Tint,
} from '@/components/dashboard/membership/membership-visuals';
import { ProgressBar } from '@/components/dashboard/progress-bar';
import { WeekAtAGlance } from '@/components/dashboard/week-at-a-glance';
import { ResponsiveImage } from '@/components/utility/responsive-image';
import { summariseAccess } from '@/lib/academy-access';
import { requireMemberAccessOrRedirect } from '@/lib/auth-api';
import { contentAccessFor } from '@/lib/membership';
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
import { fetchSomaticSeriesDetail, fetchSomaticSeriesList } from '@/lib/somatic-cards-client';
import { getLatestArticles } from '@/content/cms/loaders';
import { articlesContent } from '@/content/articles';
import type { CheckIn } from '@tnsi/db/schema';

export const metadata = createPageMetadata({
  title: 'Member Dashboard',
  description: 'Your private space for exploring the work of The Nervous System Institute.',
  path: '/dashboard',
  noIndex: true,
});

const RECENT_COMPLETIONS_LIMIT = 5;
const IN_PROGRESS_LIMIT = 5;
/** Matches the native app's own fetch size for this same "week at a
 * glance" reflection - enough rows to cover the last 7 calendar days even
 * with gaps, since at most one check-in exists per day. */
const RECENT_CHECK_INS_LIMIT = 20;

const exploreLinks: {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  tint: Tint;
}[] = [
  {
    title: 'Articles',
    description: 'Ideas, research and perspectives from TNSI.',
    href: '/articles',
    icon: BookOpen,
    tint: 'sage',
  },
  {
    title: 'Resources',
    description: "Explore the institute's knowledge library.",
    href: '/resources',
    icon: FileText,
    tint: 'dusk',
  },
  {
    title: 'Our Pathways',
    description: "Find the pathway that's right for you.",
    href: '/programs',
    icon: Compass,
    tint: 'sand',
  },
  {
    title: 'Capacity Assessment',
    description: 'Not sure where to begin? Take the 2-minute Capacity Assessment.',
    href: '/assessment',
    icon: Sparkles,
    tint: 'clay',
  },
];

/** Shared title style so headings match the site's serif display type instead of CardTitle's default sans style. */
const cardTitleClassName = 'font-heading text-2xl font-semibold tracking-tight text-foreground';

/** A soft tinted panel: the page's one container style, coloured by what it holds. */
function Panel({
  tint,
  className,
  children,
}: {
  tint: Tint;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('rounded-xl border p-5', TINT_CLASSES[tint].card, className)}>
      {children}
    </div>
  );
}

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

/** Section label with a small leading icon — same "icon + tracked-uppercase eyebrow" motif already used on the Somatic Card reading page, reused here for visual consistency across the app rather than inventing a second pattern. */
function SectionEyebrow({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <Stack direction="row" align="center" gap="xs">
      <Icon aria-hidden className="text-muted-foreground size-3.5" />
      <Eyebrow as="span">{children}</Eyebrow>
    </Stack>
  );
}

/**
 * Current consecutive-day check-in streak, ending today or yesterday (a
 * streak "survives" until a day is fully missed - checking in later today
 * shouldn't be required to see yesterday's streak still standing). Derived
 * from the same `checkInHistory` rows the page already fetches for
 * `WeekAtAGlance` - no separate query. Undercounts only if the 20-row
 * history window itself doesn't reach far enough back, which matches this
 * page's existing "recent" framing rather than an all-time record.
 */
function computeCheckInStreak(checkIns: Pick<CheckIn, 'completedDate'>[]): number {
  const dates = new Set(checkIns.map((c) => c.completedDate.toISOString().slice(0, 10)));
  const today = new Date();
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (!dates.has(cursor.toISOString().slice(0, 10))) {
    cursor.setDate(cursor.getDate() - 1); // streak can still be "current" if today just hasn't happened yet
  }
  let streak = 0;
  while (dates.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export default async function DashboardPage() {
  const user = await requireMemberAccessOrRedirect();
  const todayCheckIn = await getTodayCheckIn(user.id);
  // Don't feature a paid practice as "today's" for a member who can't open it.
  const contentAccess = contentAccessFor(user.entitlements);
  const todayPractice = await getTodayPractice(user.id, {
    freeOnly: contentAccess.gatingActive && !contentAccess.membership.hasPaidAccess,
  });
  const [
    inProgressPractices,
    inProgressCount,
    completedCount,
    recentCompletions,
    latestArticles,
    checkInHistory,
    somaticSeriesResult,
  ] = await Promise.all([
    getInProgressPractices(user.id, IN_PROGRESS_LIMIT),
    getInProgressPracticeCount(user.id),
    getCompletedPracticeCount(user.id),
    getRecentCompletions(user.id, RECENT_COMPLETIONS_LIMIT),
    getLatestArticles(),
    getCheckInHistory(user.id, RECENT_CHECK_INS_LIMIT, 0),
    fetchSomaticSeriesList(),
  ]);
  const [continuePractice, ...moreInProgress] = inProgressPractices;
  const latestArticle = latestArticles[0] ?? null;
  // Dynamic so this tile never needs a manual update as Series 06+ are
  // added - falls back to no count (not a hardcoded "5") if the API call
  // fails, rather than showing a stale/wrong number.
  const somaticSeriesCount =
    somaticSeriesResult.status === 'ok' ? somaticSeriesResult.data.length : null;
  // The most recently added Series (highest seriesNumber), used for the
  // dashboard tile's "New" callout and thumbnail strip - never a hardcoded
  // series, so this stays correct as further series are added.
  const latestSeries =
    somaticSeriesResult.status === 'ok' && somaticSeriesResult.data.length > 0
      ? somaticSeriesResult.data.reduce((a, b) => (b.seriesNumber > a.seriesNumber ? b : a))
      : null;
  const latestSeriesDetailResult = latestSeries
    ? await fetchSomaticSeriesDetail(latestSeries.slug)
    : null;
  const latestSeriesArtwork =
    latestSeriesDetailResult?.status === 'ok'
      ? latestSeriesDetailResult.data.cards
          .filter((c) => c.cardArtwork !== null)
          .slice(0, 3)
          .map((c) => c.cardArtwork!)
      : [];

  const checkInStreak = computeCheckInStreak(checkInHistory.checkIns);
  const firstName = user.fullName?.trim().split(/\s+/)[0] || null;
  // How access is described follows the resolved membership, not the stored
  // plan: a trial member is a Trial Membership, and a member whose paid
  // membership has ended is a Free Member again whatever plan the row last held.
  const access = summariseAccess(contentAccess.membership, user.entitlements?.tier ?? 'free');
  // Zero is hidden rather than shown: don't display an empty/zero quantified
  // state, mirroring the native app's own preference.
  const dashboardStats: { value: number; label: string; tint: Tint }[] = [
    ...(checkInStreak > 0
      ? [{ value: checkInStreak, label: 'Day check-in streak', tint: 'clay' as const }]
      : []),
    ...(completedCount > 0
      ? [{ value: completedCount, label: 'Practices completed', tint: 'sage' as const }]
      : []),
    ...(somaticSeriesCount !== null
      ? [{ value: somaticSeriesCount, label: 'Core Series available', tint: 'dusk' as const }]
      : []),
  ];
  const statsGridCols =
    dashboardStats.length >= 3
      ? 'sm:grid-cols-3'
      : dashboardStats.length === 2
        ? 'sm:grid-cols-2'
        : 'sm:grid-cols-1';

  // One clear next step: check in first, then pick up unfinished work, then today's practice.
  const primaryAction = !todayCheckIn
    ? { href: '#check-in', label: 'Check in today' }
    : continuePractice
      ? { href: `/dashboard/practices/${continuePractice.id}`, label: 'Resume practice' }
      : todayPractice && !todayPractice.completed
        ? { href: `/dashboard/practices/${todayPractice.practice.id}`, label: 'Begin practice' }
        : null;

  return (
    <>
      <main id="main-content">
        <Section spacing="xl">
          <Container size="xl">
            {/* Secondary text is darkened on this page so it holds its contrast on the tinted panels. */}
            <div
              className="[&_.text-muted-foreground]:text-foreground/70 mx-auto max-w-5xl"
              style={tintStyle}
            >
              <Stack gap="3xl">
                <header className="flex flex-col gap-(--space-xl)">
                  <div className="flex flex-col gap-(--space-lg) sm:flex-row sm:items-start sm:justify-between">
                    <Stack gap="md">
                      <Eyebrow>Academy Home</Eyebrow>
                      <Heading as="h1" size="xl">
                        {firstName ? `Welcome back, ${firstName}.` : 'Welcome back.'}
                      </Heading>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        <span
                          className={cn(
                            'rounded-md px-3 py-1 text-sm font-medium',
                            TINT_CLASSES.sand.tag,
                          )}
                        >
                          {access.chip}
                        </span>
                        <NextLink
                          href="/dashboard/billing"
                          className="interaction-text-link-underline w-fit text-sm whitespace-nowrap"
                        >
                          View membership
                        </NextLink>
                      </div>
                      {access.description ? (
                        <Text tone="muted" className="max-w-xl text-base leading-[1.85]">
                          {access.description}
                        </Text>
                      ) : null}
                    </Stack>
                    {primaryAction ? (
                      <NextLink
                        href={primaryAction.href}
                        className={cn(buttonVariants({ variant: 'primary', size: 'lg' }), 'w-fit')}
                      >
                        {primaryAction.label}
                      </NextLink>
                    ) : null}
                  </div>

                  {dashboardStats.length > 0 ? (
                    <div className={cn('grid grid-cols-1 gap-3', statsGridCols)}>
                      {dashboardStats.map((stat) => (
                        <StatTile
                          key={stat.label}
                          tint={stat.tint}
                          label={stat.label}
                          value={stat.value}
                        />
                      ))}
                    </div>
                  ) : null}
                </header>

                {/* Continue Learning — prioritized above Today's Practice whenever there's
                    unfinished work; omitted entirely when there's nothing in progress. */}
                {continuePractice ? (
                  <section aria-labelledby="continue-heading">
                    <Stack gap="lg">
                      <Eyebrow>Continue Learning</Eyebrow>

                      <Panel tint="sand">
                        <Stack gap="md">
                          <Eyebrow>Continue Where You Left Off</Eyebrow>
                          <h2 id="continue-heading" className={cardTitleClassName}>
                            {continuePractice.title}
                          </h2>
                          <InProgressMeta practice={continuePractice} />
                          <NextLink
                            href={`/dashboard/practices/${continuePractice.id}`}
                            className={cn(
                              buttonVariants({ variant: 'primary', size: 'md' }),
                              'w-fit',
                            )}
                          >
                            Resume Practice
                          </NextLink>
                        </Stack>
                      </Panel>

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
                  <SectionEyebrow icon={Calendar}>Today</SectionEyebrow>
                  <div className="grid grid-cols-1 items-start gap-(--space-lg) lg:grid-cols-[1.05fr_1fr]">
                    <section
                      id="check-in"
                      aria-labelledby="checkin-heading"
                      className="scroll-mt-6"
                    >
                      <Panel tint="sand">
                        <Stack gap="lg">
                          <Stack gap="sm">
                            <SectionEyebrow icon={Sparkles}>Check In</SectionEyebrow>
                            <h2 id="checkin-heading" className={cardTitleClassName}>
                              {todayCheckIn ? "You've checked in today." : 'Pause for a moment.'}
                            </h2>
                          </Stack>
                          <Text tone="muted" className="text-base leading-[1.85]">
                            {todayCheckIn
                              ? 'Take a moment to notice where you are, and return whenever you need to pause.'
                              : 'Notice where you are today, without needing to change anything.'}
                          </Text>

                          {todayCheckIn ? null : <CheckInForm />}
                        </Stack>
                      </Panel>
                    </section>

                    <div className="flex flex-col gap-(--space-lg)">
                      <section aria-labelledby="practice-heading">
                        <div
                          className={cn(
                            'overflow-hidden rounded-xl border',
                            TINT_CLASSES.sage.card,
                          )}
                        >
                          {todayPractice ? (
                            <PracticeArt contentType={todayPractice.practice.contentType} />
                          ) : null}
                          <div className="p-5">
                            <Stack gap="md">
                              <Stack gap="sm">
                                <SectionEyebrow icon={PlayCircle}>
                                  Today&rsquo;s Practice
                                </SectionEyebrow>
                                <h2 id="practice-heading" className={cardTitleClassName}>
                                  {todayPractice
                                    ? todayPractice.practice.title
                                    : "Today's Practice"}
                                </h2>
                                {todayPractice?.practice.description ? (
                                  <Text
                                    tone="muted"
                                    className="line-clamp-4 text-base leading-[1.85]"
                                  >
                                    {todayPractice.practice.description}
                                  </Text>
                                ) : null}
                              </Stack>
                              {todayPractice ? (
                                <Stack gap="sm">
                                  <Text tone="muted" size="sm">
                                    {[
                                      formatContentTypeLabel(todayPractice.practice.contentType),
                                      formatPracticeDuration(
                                        todayPractice.practice.durationSeconds,
                                      ),
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
                                      className={cn(
                                        buttonVariants({ variant: 'primary', size: 'md' }),
                                        'w-fit',
                                      )}
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
                                      className={buttonVariants({
                                        variant: 'outline',
                                        size: 'sm',
                                      })}
                                    >
                                      Visit the Practice Library
                                    </NextLink>
                                  }
                                />
                              )}
                            </Stack>
                          </div>
                        </div>
                      </section>

                      <section aria-labelledby="somatic-cards-heading">
                        <Panel tint="dusk" className="relative">
                          {latestSeries ? (
                            <Badge className="absolute top-(--space-lg) right-(--space-lg)">
                              New &middot; {latestSeries.title}
                            </Badge>
                          ) : null}
                          <Stack gap="md">
                            <Stack gap="sm">
                              <SectionEyebrow icon={Layers}>Somatic Cards</SectionEyebrow>
                              <h2 id="somatic-cards-heading" className={cardTitleClassName}>
                                Explore the Core Series
                              </h2>
                            </Stack>
                            {latestSeriesArtwork.length > 0 ? (
                              <div className="flex h-24 gap-(--space-2xs)">
                                {latestSeriesArtwork.map((art, i) => (
                                  <div
                                    key={i}
                                    className="bg-secondary/40 relative flex-1 overflow-hidden rounded-md"
                                  >
                                    <ResponsiveImage
                                      src={art.url}
                                      alt={art.alt}
                                      fill
                                      sizes="200px"
                                      className="object-cover"
                                    />
                                  </div>
                                ))}
                              </div>
                            ) : null}
                            <Text tone="muted" className="text-base leading-[1.85]">
                              Explore guided somatic experiences through the Core Series
                              {somaticSeriesCount !== null
                                ? ` — ${somaticSeriesCount} ${somaticSeriesCount === 1 ? 'series' : 'series'} available`
                                : ''}
                              .
                            </Text>
                            <NextLink
                              href="/dashboard/somatic-cards"
                              className={cn(
                                buttonVariants({ variant: 'primary', size: 'md' }),
                                'w-fit',
                              )}
                            >
                              Explore Cards
                            </NextLink>
                          </Stack>
                        </Panel>
                      </section>
                    </div>
                  </div>
                </Stack>

                <WeekAtAGlance recentCheckIns={checkInHistory.checkIns} />

                {/* Recently practised — omitted entirely for a member with nothing completed yet. */}
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

                      <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-3">
                        {recentCompletions.map((practice) => {
                          const tint = tintForContentType(practice.contentType);
                          return (
                            <li key={practice.id} className="contents">
                              <NextLink
                                href={`/dashboard/practices/${practice.id}`}
                                className={cn(
                                  'focus-visible:ring-ring flex flex-col overflow-hidden rounded-xl border transition-transform focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none motion-safe:hover:-translate-y-0.5',
                                  TINT_CLASSES[tint].card,
                                )}
                              >
                                <PracticeArt contentType={practice.contentType} />
                                <span className="flex flex-col gap-1 px-4 py-3">
                                  <span className="font-heading text-foreground text-base font-semibold">
                                    {practice.title}
                                  </span>
                                  <span className="text-foreground/70 text-sm">
                                    {[
                                      formatContentTypeLabel(practice.contentType),
                                      practice.completedAt
                                        ? new Date(practice.completedAt).toLocaleDateString(
                                            'en-GB',
                                            { day: 'numeric', month: 'long', year: 'numeric' },
                                          )
                                        : null,
                                    ]
                                      .filter(Boolean)
                                      .join(' · ')}
                                  </span>
                                </span>
                              </NextLink>
                            </li>
                          );
                        })}
                      </ul>
                      <NextLink
                        href="/dashboard/practices/history"
                        className="interaction-text-link-underline w-fit"
                      >
                        View practice history
                      </NextLink>
                    </Stack>
                  </section>
                ) : null}

                <Divider />

                {/* Next */}
                <section aria-labelledby="explore-heading">
                  <Stack gap="xl">
                    <Stack gap="sm">
                      <SectionEyebrow icon={Compass}>Continue Exploring</SectionEyebrow>
                      <Heading as="h2" id="explore-heading" size="md">
                        Continue exploring
                      </Heading>
                      <Text tone="muted" className="text-base leading-[1.85]">
                        Explore the ideas, research and pathways that shape the work of The Nervous
                        System Institute.
                      </Text>
                    </Stack>

                    {latestArticle ? (
                      <NextLink
                        href={latestArticle.href}
                        className="interaction-colors bg-foreground text-background flex flex-col gap-(--space-2xs) rounded-2xl p-(--space-2xl)"
                      >
                        <Eyebrow className="text-background/60">Latest from the Institute</Eyebrow>
                        <span className="font-heading max-w-xl text-2xl font-semibold tracking-tight">
                          {latestArticle.title}
                        </span>
                        <Text className="text-background/60" size="sm">
                          {[latestArticle.category, latestArticle.publishedAt]
                            .filter(Boolean)
                            .join(' · ')}
                        </Text>
                        <Text className="text-background/80 mt-(--space-2xs) max-w-xl text-base leading-[1.7]">
                          {latestArticle.summary}
                        </Text>
                        <span className="mt-(--space-sm) text-sm font-semibold">
                          Read the article &rarr;
                        </span>
                      </NextLink>
                    ) : null}

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {exploreLinks.map((item) => (
                        <NextLink
                          key={item.href}
                          href={item.href}
                          className={cn(
                            'interaction-colors focus-visible:ring-ring flex items-start gap-(--space-sm) rounded-xl border p-(--space-md) focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
                            TINT_CLASSES[item.tint].card,
                          )}
                        >
                          <span
                            className={cn(
                              'flex size-9 shrink-0 items-center justify-center rounded-[0.65rem]',
                              TINT_CLASSES[item.tint].chip,
                            )}
                          >
                            <item.icon aria-hidden className="size-5" />
                          </span>
                          <Stack gap="3xs">
                            <span className="font-heading text-foreground text-base font-semibold">
                              {item.title}
                            </span>
                            <Text tone="muted" size="sm">
                              {item.description}
                            </Text>
                          </Stack>
                        </NextLink>
                      ))}
                    </div>

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
              </Stack>
            </div>
          </Container>
        </Section>
      </main>
    </>
  );
}
