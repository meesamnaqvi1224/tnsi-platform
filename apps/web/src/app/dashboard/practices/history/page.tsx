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
import {
  formatContentTypeLabel,
  formatPracticeDuration,
  getPracticeHistory,
} from '@/lib/practices';
import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: 'Practice History',
  description: 'Practice sessions completed on The Nervous System Institute.',
  path: '/dashboard/practices/history',
  noIndex: true,
});

/** Matches getCheckInHistory/getPracticeHistory's own page-size convention elsewhere in this app (the project's existing "reasonable page size" - see check-in history). */
const PAGE_SIZE = 20;

const RESPONSE_LABELS: Record<string, string> = {
  DIFFERENT: 'I feel different',
  SAME: 'I feel the same',
  NOT_SURE: "I'm not sure yet",
};

interface PracticeHistoryPageProps {
  searchParams: Promise<{ page?: string }>;
}

/** "Today" / "Yesterday" for the two most useful relative days, a plain date otherwise — mirrors how the example in the brief reads, without inventing a full relative-time library for two cases. */
function formatSessionDate(date: Date): string {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
  const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (startOfDay.getTime() === startOfToday.getTime()) return 'Today';
  if (startOfDay.getTime() === startOfYesterday.getTime()) return 'Yesterday';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default async function PracticeHistoryPage({ searchParams }: PracticeHistoryPageProps) {
  const user = await requireMemberAccessOrRedirect();
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Math.trunc(Number(pageParam)) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const { history, hasMore } = await getPracticeHistory(user.id, PAGE_SIZE, offset);

  return (
    <main id="main-content">
      <Section spacing="xl">
        <Container size="xl">
          <div className="mx-auto max-w-3xl">
            <Stack gap="2xl">
              <NextLink
                href="/dashboard/practices"
                className="interaction-text-link-underline w-fit"
              >
                ← Practice Library
              </NextLink>

              <header className="border-border flex flex-col gap-(--space-md) border-b pb-(--space-2xl)">
                <Eyebrow>Practice History</Eyebrow>
                <Heading as="h1" size="xl">
                  Practice History
                </Heading>
                <Text tone="muted" className="text-base leading-[1.85] lg:text-lg">
                  Every practice you&rsquo;ve completed, most recent first.
                </Text>
              </header>

              {history.length === 0 && page === 1 ? (
                <EmptyState
                  title="Your practice history will appear here"
                  description="As you complete practices, each session will show up here."
                  action={
                    <NextLink
                      href="/dashboard/practices"
                      className={buttonVariants({ variant: 'outline', size: 'sm' })}
                    >
                      Browse Practices
                    </NextLink>
                  }
                />
              ) : (
                <Stack gap="md">
                  {history.map((entry) => {
                    const duration = formatPracticeDuration(entry.durationSeconds);
                    const metaParts = [
                      'Completed',
                      ...(duration ? [duration] : []),
                      ...(entry.category ? [entry.category] : []),
                    ];
                    const reflectionText =
                      entry.reflection?.reflection ??
                      (entry.reflection?.response
                        ? RESPONSE_LABELS[entry.reflection.response]
                        : null);

                    return (
                      <NextLink
                        key={entry.completionId}
                        href={`/dashboard/practices/${entry.id}`}
                        className="interaction-focus interaction-colors rounded-lg"
                      >
                        <div className="border-border/80 bg-background hover:border-foreground/40 duration-base ease-standard flex flex-col gap-(--space-2xs) rounded-sm border p-(--space-lg) transition-colors">
                          <Text tone="muted" size="xs" className="tracking-[0.05em] uppercase">
                            {formatSessionDate(entry.completedAt)}
                          </Text>
                          <Stack direction="row" gap="sm" className="items-center justify-between">
                            <Heading
                              as="h2"
                              size="xs"
                              className="font-heading text-foreground text-lg font-semibold"
                            >
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
                              &ldquo;{reflectionText}&rdquo;
                            </Text>
                          ) : null}
                        </div>
                      </NextLink>
                    );
                  })}
                </Stack>
              )}

              {page > 1 || hasMore ? (
                <Stack direction="row" gap="md" className="items-center justify-between">
                  {page > 1 ? (
                    <NextLink
                      href={`/dashboard/practices/history?page=${page - 1}`}
                      className={buttonVariants({ variant: 'outline', size: 'sm' })}
                    >
                      ← Newer
                    </NextLink>
                  ) : (
                    <span />
                  )}
                  {hasMore ? (
                    <NextLink
                      href={`/dashboard/practices/history?page=${page + 1}`}
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
