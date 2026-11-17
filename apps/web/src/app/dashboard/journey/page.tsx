import NextLink from 'next/link';
import {
  buttonVariants,
  cn,
  Container,
  EmptyState,
  Eyebrow,
  Heading,
  Section,
  Stack,
  Text,
} from '@tnsi/ui';
import {
  StatTile,
  ThumbArt,
  TINT_CLASSES,
  tintForContentType,
  tintStyle,
} from '@/components/dashboard/membership/membership-visuals';
import { ProgressBar } from '@/components/dashboard/progress-bar';
import { requireMemberAccessOrRedirect } from '@/lib/auth-api';
import { getCheckInHistory } from '@/lib/check-ins';
import { getJourneyEntries, getMilestoneDates } from '@/lib/journey';
import {
  buildMilestones,
  checkInJourneyLabel,
  formatJourneyDayLabel,
  groupJourneyByMonth,
  mergeMilestones,
  truncateReflection,
  type JourneyEntry,
  type MilestoneItem,
} from '@/lib/journey-presentation';
import { contentAccessFor } from '@/lib/membership';
import {
  formatContentTypeLabel,
  formatPracticeDuration,
  getCompletedPracticeCount,
  getInProgressPracticeCount,
  getInProgressPractices,
  getTodayPractice,
} from '@/lib/practices';
import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: 'My Journey',
  description: 'A record of the practices and moments you have chosen to spend time with.',
  path: '/dashboard/journey',
  noIndex: true,
});

/** Matches getPracticeHistory/getCheckInHistory's own page-size convention. */
const PAGE_SIZE = 20;
/** Enough rows to count a whole month of check-ins (at most one a day). */
const MONTH_CHECK_INS_LIMIT = 31;

const RESPONSE_LABELS: Record<string, string> = {
  DIFFERENT: 'I feel different',
  SAME: 'I feel the same',
  NOT_SURE: "I'm not sure yet",
};

type TypeFilter = 'check-ins' | 'practices';

const TYPE_FILTERS: { value: TypeFilter | undefined; label: string }[] = [
  { value: undefined, label: 'All' },
  { value: 'check-ins', label: 'Check-ins' },
  { value: 'practices', label: 'Practices' },
];

interface JourneyPageProps {
  searchParams: Promise<{ page?: string; type?: string }>;
}

function journeyHref(params: { page?: number; type?: TypeFilter }): string {
  const search = new URLSearchParams();
  if (params.type) search.set('type', params.type);
  if (params.page && params.page > 1) search.set('page', String(params.page));
  const query = search.toString();
  return query ? `/dashboard/journey?${query}` : '/dashboard/journey';
}

const chipBase =
  'interaction-focus rounded-full border px-3 py-1 text-sm font-medium transition-colors';
const chipOn = 'border-foreground bg-foreground text-background';
const chipOff = 'border-foreground/30 bg-background/70 text-foreground/80 hover:border-foreground';

/** The dot on the timeline line, tinted by what happened. */
function TimelineDot({ className }: { className: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'border-background absolute top-5 -left-[1.9rem] size-[1.15rem] rounded-full border-2',
        className,
      )}
    />
  );
}

function PracticeEntryCard({
  entry,
  now,
}: {
  entry: Extract<JourneyEntry, { kind: 'practice' }>;
  now: Date;
}) {
  const duration = formatPracticeDuration(entry.durationSeconds);
  const metaParts = [
    'Completed',
    ...(duration ? [duration] : []),
    ...(entry.category ? [entry.category] : []),
  ];
  const reflectionText =
    entry.reflection?.reflection ??
    (entry.reflection?.response ? RESPONSE_LABELS[entry.reflection.response] : null);
  const tint = tintForContentType(entry.contentType);

  return (
    <li className="relative">
      <TimelineDot className={TINT_CLASSES[tint].chip} />
      <NextLink
        href={`/dashboard/practices/${entry.practiceId}`}
        className={cn(
          'interaction-focus interaction-colors flex items-center gap-(--space-md) rounded-xl border p-3',
          TINT_CLASSES[tint].card,
        )}
      >
        <ThumbArt kind={entry.contentType} />
        <div className="flex min-w-0 flex-1 flex-col gap-(--space-3xs)">
          <div className="flex items-start justify-between gap-(--space-sm)">
            <div className="min-w-0">
              <Text tone="muted" size="xs" className="font-medium">
                {formatJourneyDayLabel(entry.occurredAt, now)}
              </Text>
              <Heading
                as="h3"
                size="xs"
                className="font-heading text-foreground text-lg font-semibold"
              >
                {entry.title}
              </Heading>
            </div>
            <span
              className={cn(
                'shrink-0 rounded-md px-2 py-0.5 text-xs font-medium',
                TINT_CLASSES[tint].tag,
              )}
            >
              {formatContentTypeLabel(entry.contentType)}
            </span>
          </div>
          <Text tone="muted" size="sm">
            {metaParts.join(' · ')}
          </Text>
          {reflectionText ? (
            <Text tone="muted" size="sm" className="border-foreground/20 border-l-2 pl-3 italic">
              &ldquo;{truncateReflection(reflectionText)}&rdquo;
            </Text>
          ) : null}
          <span className="text-foreground text-sm font-medium underline underline-offset-4">
            View practice →
          </span>
        </div>
      </NextLink>
    </li>
  );
}

function CheckInEntryCard({
  entry,
  now,
}: {
  entry: Extract<JourneyEntry, { kind: 'check_in' }>;
  now: Date;
}) {
  const label = checkInJourneyLabel(entry);

  return (
    <li className="relative">
      <TimelineDot className={TINT_CLASSES.sand.chip} />
      <div
        className={cn(
          'flex items-center gap-(--space-md) rounded-xl border p-3',
          TINT_CLASSES.sand.card,
        )}
      >
        <ThumbArt kind="check_in" />
        <div className="flex min-w-0 flex-1 flex-col gap-(--space-3xs)">
          <Text tone="muted" size="xs" className="font-medium">
            {formatJourneyDayLabel(entry.occurredAt, now)}
          </Text>
          <Heading as="h3" size="xs" className="font-heading text-foreground text-lg font-semibold">
            Daily Check-In
          </Heading>
          <Text tone="muted" size="sm">
            {label ?? `Mood ${entry.moodScore} of 5 · Capacity ${entry.capacityScore} of 5`}
          </Text>
          {entry.notes ? (
            <Text tone="muted" size="sm" className="border-foreground/20 border-l-2 pl-3 italic">
              &ldquo;{truncateReflection(entry.notes)}&rdquo;
            </Text>
          ) : null}
        </div>
      </div>
    </li>
  );
}

/** A quiet marker on the line: a date the member's own records contain, in plain words. Not a badge, not a reward. */
function MilestoneRow({ item, now }: { item: MilestoneItem; now: Date }) {
  return (
    <li className="relative flex flex-wrap items-baseline gap-x-3 py-1">
      <span
        aria-hidden
        className="border-background absolute top-2 -left-[1.75rem] size-3 rounded-full border-2 bg-(--membership-gold)"
      />
      <span className="font-heading text-foreground text-base italic">{item.label}</span>
      <Text tone="muted" size="xs">
        {formatJourneyDayLabel(item.occurredAt, now)}
      </Text>
    </li>
  );
}

export default async function JourneyPage({ searchParams }: JourneyPageProps) {
  const user = await requireMemberAccessOrRedirect();
  const { page: pageParam, type: typeParam } = await searchParams;
  const page = Math.max(1, Math.trunc(Number(pageParam)) || 1);
  const offset = (page - 1) * PAGE_SIZE;
  const activeType = TYPE_FILTERS.find((f) => f.value === typeParam)?.value;
  const kind =
    activeType === 'check-ins' ? 'check_in' : activeType === 'practices' ? 'practice' : undefined;
  const now = new Date();

  const access = contentAccessFor(user.entitlements);
  const [journey, milestoneDates, inProgress, inProgressCount, completedCount, monthCheckIns] =
    await Promise.all([
      getJourneyEntries(user.id, PAGE_SIZE, offset, kind),
      getMilestoneDates(user.id),
      getInProgressPractices(user.id, 1),
      getInProgressPracticeCount(user.id),
      getCompletedPracticeCount(user.id),
      getCheckInHistory(user.id, MONTH_CHECK_INS_LIMIT, 0),
    ]);
  const { entries, hasMore } = journey;

  // Where you left off: unfinished work first; otherwise the same "today's
  // practice" the Academy Home offers, if the member has not done it yet.
  const resume = inProgress[0] ?? null;
  const next = resume
    ? null
    : await getTodayPractice(user.id, {
        freeOnly: access.gatingActive && !access.membership.hasPaidAccess,
      });
  const nextPractice = next && !next.completed ? next.practice : null;

  const thisMonth = now.toISOString().slice(0, 7);
  const checkInsThisMonth = monthCheckIns.checkIns.filter(
    (checkIn) => checkIn.completedDate.toISOString().slice(0, 7) === thisMonth,
  ).length;

  // Milestones belong to the whole journey, so they appear only on the unfiltered view.
  const items = activeType
    ? entries
    : mergeMilestones(entries, buildMilestones(milestoneDates, now), {
        isFirstPage: page === 1,
        hasMore,
      });
  const months = groupJourneyByMonth(items);
  const hasAnyActivity = entries.length > 0 || page > 1;

  return (
    <main id="main-content">
      <Section spacing="xl">
        <Container size="xl">
          {/* Secondary text is darkened here so it holds its contrast on the tinted cards. */}
          <div
            className="[&_.text-muted-foreground]:text-foreground/70 mx-auto max-w-3xl"
            style={tintStyle}
          >
            <Stack gap="2xl">
              <header className="flex flex-col gap-(--space-md)">
                <Eyebrow>My Journey</Eyebrow>
                <Heading as="h1" size="xl">
                  My Journey
                </Heading>
                <Text tone="muted" className="text-base leading-[1.85] lg:text-lg">
                  A record of the practices and moments you&rsquo;ve chosen to spend time with.
                </Text>
              </header>

              {resume || nextPractice ? (
                <section
                  aria-labelledby="next-heading"
                  className={cn(
                    'flex flex-col gap-(--space-md) rounded-2xl border p-4 sm:flex-row sm:items-center',
                    TINT_CLASSES.sage.card,
                  )}
                >
                  <ThumbArt kind={(resume ?? nextPractice)!.contentType} />
                  <div className="flex min-w-0 flex-1 flex-col gap-(--space-2xs)">
                    <Eyebrow>
                      {resume ? 'Pick up where you left off' : 'A place to begin next'}
                    </Eyebrow>
                    <h2
                      id="next-heading"
                      className="font-heading text-foreground text-xl font-semibold"
                    >
                      {(resume ?? nextPractice)!.title}
                    </h2>
                    {resume ? (
                      <Stack direction="row" align="center" gap="sm">
                        <ProgressBar value={resume.progressPct} className="max-w-40" />
                        <Text tone="muted" size="xs">
                          {Math.round(resume.progressPct * 100)}%
                        </Text>
                      </Stack>
                    ) : (
                      <Text tone="muted" size="sm">
                        {[
                          formatContentTypeLabel(nextPractice!.contentType),
                          formatPracticeDuration(nextPractice!.durationSeconds),
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </Text>
                    )}
                  </div>
                  <NextLink
                    href={`/dashboard/practices/${(resume ?? nextPractice)!.id}`}
                    className={cn(buttonVariants({ variant: 'primary', size: 'md' }), 'w-fit')}
                  >
                    {resume ? 'Resume practice' : 'Begin practice'}
                  </NextLink>
                </section>
              ) : null}

              {hasAnyActivity ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <StatTile tint="sand" label="Check-ins this month" value={checkInsThisMonth} />
                  <StatTile tint="sage" label="Practices completed" value={completedCount} />
                  <StatTile tint="dusk" label="In progress" value={inProgressCount} />
                </div>
              ) : null}

              {entries.length === 0 && page === 1 && !activeType ? (
                <EmptyState
                  title="Your journey starts here"
                  description="Your completed practices and reflections will appear here as you spend time with the practices."
                  action={
                    <NextLink
                      href="/dashboard/practices"
                      className={buttonVariants({ variant: 'outline', size: 'sm' })}
                    >
                      Explore Practices
                    </NextLink>
                  }
                />
              ) : (
                <Stack gap="xl">
                  <nav aria-label="Show">
                    <Stack direction="row" gap="xs" wrap="wrap" className="items-center">
                      {TYPE_FILTERS.map((filter) => (
                        <NextLink
                          key={filter.label}
                          href={journeyHref({ type: filter.value })}
                          aria-current={activeType === filter.value ? 'page' : undefined}
                          className={cn(chipBase, activeType === filter.value ? chipOn : chipOff)}
                        >
                          {filter.label}
                        </NextLink>
                      ))}
                    </Stack>
                  </nav>

                  {items.length === 0 ? (
                    <EmptyState
                      title="Nothing here yet"
                      description="No entries of this kind yet. They will appear as you spend time with the practices."
                    />
                  ) : (
                    <Stack gap="xl">
                      {months.map((month) => (
                        <section key={`${month.label}-${month.items[0]?.id}`}>
                          <Stack gap="md">
                            <Heading
                              as="h2"
                              size="xs"
                              className="text-muted-foreground font-mono text-xs font-normal tracking-[0.18em] uppercase"
                            >
                              {month.label}
                            </Heading>
                            <ol className="border-foreground/20 relative m-0 flex list-none flex-col gap-(--space-md) border-l p-0 pl-(--space-xl)">
                              {month.items.map((item) =>
                                item.kind === 'milestone' ? (
                                  <MilestoneRow key={item.id} item={item} now={now} />
                                ) : item.kind === 'practice' ? (
                                  <PracticeEntryCard
                                    key={`practice-${item.id}`}
                                    entry={item}
                                    now={now}
                                  />
                                ) : (
                                  <CheckInEntryCard
                                    key={`check-in-${item.id}`}
                                    entry={item}
                                    now={now}
                                  />
                                ),
                              )}
                            </ol>
                          </Stack>
                        </section>
                      ))}
                    </Stack>
                  )}
                </Stack>
              )}

              {page > 1 || hasMore ? (
                <Stack direction="row" gap="md" className="items-center justify-between">
                  {page > 1 ? (
                    <NextLink
                      href={journeyHref({ page: page - 1, type: activeType })}
                      className={buttonVariants({ variant: 'outline', size: 'sm' })}
                    >
                      ← Newer
                    </NextLink>
                  ) : (
                    <span />
                  )}
                  {hasMore ? (
                    <NextLink
                      href={journeyHref({ page: page + 1, type: activeType })}
                      className={buttonVariants({ variant: 'outline', size: 'sm' })}
                    >
                      Older →
                    </NextLink>
                  ) : (
                    <span />
                  )}
                </Stack>
              ) : null}
            </Stack>
          </div>
        </Container>
      </Section>
    </main>
  );
}
