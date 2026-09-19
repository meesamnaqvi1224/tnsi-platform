import NextLink from 'next/link';
import {
  Badge,
  buttonVariants,
  Container,
  EmptyState,
  Eyebrow,
  Heading,
  Section,
  Stack,
  Text,
} from '@tnsi/ui';
import { requireMemberAccessOrRedirect } from '@/lib/auth-api';
import { getJourneyEntries } from '@/lib/journey';
import {
  checkInJourneyLabel,
  groupJourneyEntriesByDate,
  truncateReflection,
  type JourneyEntry,
} from '@/lib/journey-presentation';
import { formatContentTypeLabel, formatPracticeDuration } from '@/lib/practices';
import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: 'My Journey',
  description: 'A record of the practices and moments you have chosen to spend time with.',
  path: '/dashboard/journey',
  noIndex: true,
});

/** Matches getPracticeHistory/getCheckInHistory's own page-size convention. */
const PAGE_SIZE = 20;

const RESPONSE_LABELS: Record<string, string> = {
  DIFFERENT: 'I feel different',
  SAME: 'I feel the same',
  NOT_SURE: "I'm not sure yet",
};

interface JourneyPageProps {
  searchParams: Promise<{ page?: string }>;
}

function PracticeEntryCard({ entry }: { entry: Extract<JourneyEntry, { kind: 'practice' }> }) {
  const duration = formatPracticeDuration(entry.durationSeconds);
  const metaParts = [
    'Completed',
    ...(duration ? [duration] : []),
    ...(entry.category ? [entry.category] : []),
  ];
  const reflectionText =
    entry.reflection?.reflection ??
    (entry.reflection?.response ? RESPONSE_LABELS[entry.reflection.response] : null);

  return (
    <NextLink
      href={`/dashboard/practices/${entry.practiceId}`}
      className="interaction-focus interaction-colors rounded-lg"
    >
      <div className="border-border/80 bg-background hover:border-foreground/40 duration-base ease-standard flex flex-col gap-(--space-2xs) rounded-sm border p-(--space-lg) transition-colors">
        <Stack direction="row" gap="sm" className="items-center justify-between">
          <Heading as="h2" size="xs" className="font-heading text-foreground text-lg font-semibold">
            {entry.title}
          </Heading>
          <Badge variant="outline" className="shrink-0">
            {formatContentTypeLabel(entry.contentType)}
          </Badge>
        </Stack>
        <Text tone="muted" size="sm">
          {metaParts.join(' · ')}
        </Text>
        {reflectionText ? (
          <Text tone="muted" size="sm" className="italic">
            &ldquo;{truncateReflection(reflectionText)}&rdquo;
          </Text>
        ) : null}
      </div>
    </NextLink>
  );
}

function CheckInEntryCard({ entry }: { entry: Extract<JourneyEntry, { kind: 'check_in' }> }) {
  const label = checkInJourneyLabel(entry);

  return (
    <div className="border-border/80 bg-background flex flex-col gap-(--space-2xs) rounded-sm border p-(--space-lg)">
      <Heading as="h2" size="xs" className="font-heading text-foreground text-lg font-semibold">
        Daily Check-In
      </Heading>
      <Text tone="muted" size="sm">
        {label ?? `Mood ${entry.moodScore} of 5 · Capacity ${entry.capacityScore} of 5`}
      </Text>
      {entry.notes ? (
        <Text tone="muted" size="sm" className="italic">
          &ldquo;{truncateReflection(entry.notes)}&rdquo;
        </Text>
      ) : null}
    </div>
  );
}

export default async function JourneyPage({ searchParams }: JourneyPageProps) {
  const user = await requireMemberAccessOrRedirect();
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Math.trunc(Number(pageParam)) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const { entries, hasMore } = await getJourneyEntries(user.id, PAGE_SIZE, offset);
  const groups = groupJourneyEntriesByDate(entries, new Date());

  return (
    <main id="main-content">
      <Section spacing="xl">
        <Container size="xl">
          <div className="mx-auto max-w-3xl">
            <Stack gap="2xl">
              <NextLink href="/dashboard" className="interaction-text-link-underline w-fit">
                ← Dashboard
              </NextLink>

              <header className="border-border flex flex-col gap-(--space-md) border-b pb-(--space-2xl)">
                <Eyebrow>My Journey</Eyebrow>
                <Heading as="h1" size="xl">
                  My Journey
                </Heading>
                <Text tone="muted" className="text-base leading-[1.85] lg:text-lg">
                  A record of the practices and moments you&rsquo;ve chosen to spend time with.
                </Text>
              </header>

              {entries.length === 0 && page === 1 ? (
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
                  {groups.map((group) => (
                    <Stack key={`${group.label}-${group.entries[0]?.id}`} gap="sm">
                      <Text tone="muted" size="xs" className="tracking-[0.05em] uppercase">
                        {group.label}
                      </Text>
                      <Stack gap="md">
                        {group.entries.map((entry) =>
                          entry.kind === 'practice' ? (
                            <PracticeEntryCard key={`practice-${entry.id}`} entry={entry} />
                          ) : (
                            <CheckInEntryCard key={`check-in-${entry.id}`} entry={entry} />
                          ),
                        )}
                      </Stack>
                    </Stack>
                  ))}
                </Stack>
              )}

              {page > 1 || hasMore ? (
                <Stack direction="row" gap="md" className="items-center justify-between">
                  {page > 1 ? (
                    <NextLink
                      href={`/dashboard/journey?page=${page - 1}`}
                      className={buttonVariants({ variant: 'outline', size: 'sm' })}
                    >
                      ← Newer
                    </NextLink>
                  ) : (
                    <span />
                  )}
                  {hasMore ? (
                    <NextLink
                      href={`/dashboard/journey?page=${page + 1}`}
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
