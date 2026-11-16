import NextLink from 'next/link';
import { Alert, buttonVariants, Container, Heading, Section, Stack, Text } from '@tnsi/ui';
import {
  formatReflectionDate,
  PRIVACY_LINE,
  REFLECTION_EDITOR,
  REFLECTION_STATES,
  REFLECTIONS_LIST,
} from '@tnsi/core';
import { RefreshOnReturn } from '@/components/dashboard/reflections/refresh-on-return';
import { getJournalPageAccess } from '@/lib/journal-page-access';
import { listJournalEntries, type JournalEntryListItem } from '@/lib/journal';
import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: REFLECTIONS_LIST.title,
  description: 'Your private writing space.',
  path: '/dashboard/reflections',
  noIndex: true,
});

// A member's private writing is never cached or prerendered.
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

interface PageProps {
  searchParams: Promise<{ page?: string; notice?: string }>;
}

function pageHref(page: number): string {
  return page > 1 ? `/dashboard/reflections?page=${page}` : '/dashboard/reflections';
}

function Row({ entry }: { entry: JournalEntryListItem }) {
  const preview = entry.preview + (entry.previewTruncated ? '…' : '');
  return (
    <li>
      <NextLink
        href={`/dashboard/reflections/${entry.id}`}
        className="interaction-colors interaction-focus border-foreground/15 hover:border-foreground/40 flex flex-col gap-2 rounded-xl border p-(--space-md)"
      >
        <span className="text-muted-foreground flex items-center justify-between gap-3 text-xs">
          <span>{formatReflectionDate(entry.createdAt.toISOString())}</span>
          {entry.status === 'draft' ? (
            <span className="text-xs font-semibold tracking-[0.1em] uppercase">Draft</span>
          ) : null}
        </span>
        {entry.title ? (
          <span className="font-heading text-foreground text-lg font-semibold">{entry.title}</span>
        ) : null}
        {preview ? (
          <span className="text-muted-foreground line-clamp-3 text-sm">{preview}</span>
        ) : null}
      </NextLink>
    </li>
  );
}

/**
 * My Reflections: the member's private writing space. Saved reflections newest first (by when the
 * writing began), with any drafts above them. Nothing is counted, scored or summarised, and nothing here
 * reads check-ins, recommendations or practice progress. Only previews are loaded; the full text is read
 * one reflection at a time, when it is opened.
 */
export default async function ReflectionsPage({ searchParams }: PageProps) {
  const { page: pageParam, notice } = await searchParams;
  const access = await getJournalPageAccess();

  const header = (
    <Stack gap="sm">
      <Heading as="h1" size="xl" id="reflections-heading">
        {REFLECTIONS_LIST.title}
      </Heading>
      <Text tone="muted">{REFLECTIONS_LIST.generalPrinciple}</Text>
      <Text tone="muted" size="sm">
        {PRIVACY_LINE}
      </Text>
    </Stack>
  );

  if (access.state !== 'ok') {
    return (
      <Section spacing="lg" aria-labelledby="reflections-heading">
        <Container size="lg">
          <Stack gap="lg">
            {header}
            <Alert variant="destructive">
              {access.state === 'locked'
                ? REFLECTION_STATES.lockedForDeletion
                : REFLECTION_STATES.listFailed}
            </Alert>
          </Stack>
        </Container>
      </Section>
    );
  }

  const page = Math.max(1, Number.parseInt(pageParam ?? '1', 10) || 1);
  const [saved, drafts] = await Promise.all([
    listJournalEntries(access.userId, {
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
      status: 'saved',
    }),
    // Drafts are shown on the first page only.
    page === 1
      ? listJournalEntries(access.userId, { limit: PAGE_SIZE, offset: 0, status: 'draft' })
      : Promise.resolve({ entries: [] as JournalEntryListItem[], hasMore: false }),
  ]);

  const empty = page === 1 && saved.entries.length === 0 && drafts.entries.length === 0;

  return (
    <Section spacing="lg" aria-labelledby="reflections-heading">
      <Container size="lg">
        <RefreshOnReturn />
        <Stack gap="xl">
          {header}

          {/* Only the fixed token the editor sets is recognised; anything else in the address is ignored. */}
          {notice === 'saved' ? (
            <div aria-live="polite">
              <Alert variant="success">{REFLECTION_EDITOR.savedMessage}</Alert>
            </div>
          ) : null}

          {empty ? (
            <Stack gap="md">
              <Heading as="h2" size="md">
                {REFLECTIONS_LIST.emptyTitle}
              </Heading>
              <Text tone="muted">{REFLECTIONS_LIST.emptyBody}</Text>
              <Text tone="muted">{REFLECTIONS_LIST.emptyHint}</Text>
              <div>
                <NextLink
                  href="/dashboard/reflections/new"
                  className={buttonVariants({ variant: 'primary', size: 'lg' })}
                >
                  {REFLECTIONS_LIST.emptyButton}
                </NextLink>
              </div>
            </Stack>
          ) : (
            <div>
              <NextLink
                href="/dashboard/reflections/new"
                className={buttonVariants({ variant: 'primary', size: 'lg' })}
              >
                {REFLECTIONS_LIST.newButton}
              </NextLink>
            </div>
          )}

          {drafts.entries.length > 0 ? (
            <section aria-labelledby="drafts-heading">
              <Stack gap="md">
                <Heading as="h2" size="md" id="drafts-heading">
                  {REFLECTIONS_LIST.draftsHeading}
                </Heading>
                <ul className="flex flex-col gap-3">
                  {drafts.entries.map((entry) => (
                    <Row key={entry.id} entry={entry} />
                  ))}
                </ul>
              </Stack>
            </section>
          ) : null}

          {saved.entries.length > 0 ? (
            <section aria-labelledby="saved-heading">
              <Stack gap="md">
                <Heading as="h2" size="md" id="saved-heading">
                  {REFLECTIONS_LIST.savedHeading}
                </Heading>
                <ul className="flex flex-col gap-3">
                  {saved.entries.map((entry) => (
                    <Row key={entry.id} entry={entry} />
                  ))}
                </ul>
                <nav aria-label="Reflections pages" className="flex gap-3">
                  {page > 1 ? (
                    <NextLink
                      href={pageHref(page - 1)}
                      className={buttonVariants({ variant: 'outline' })}
                    >
                      Newer
                    </NextLink>
                  ) : null}
                  {saved.hasMore ? (
                    <NextLink
                      href={pageHref(page + 1)}
                      className={buttonVariants({ variant: 'outline' })}
                    >
                      Older
                    </NextLink>
                  ) : null}
                </nav>
              </Stack>
            </section>
          ) : null}
        </Stack>
      </Container>
    </Section>
  );
}
