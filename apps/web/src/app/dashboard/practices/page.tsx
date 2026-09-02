import NextLink from 'next/link';
import {
  buttonVariants,
  Card,
  CardContent,
  CardHeader,
  Container,
  EmptyState,
  Eyebrow,
  Grid,
  Heading,
  Section,
  Stack,
  Text,
} from '@tnsi/ui';
import { requireAuthOrRedirect } from '@/lib/auth-api';
import {
  formatContentTypeLabel,
  formatPracticeDuration,
  getPracticeCompletion,
  getPublishedPractices,
} from '@/lib/practices';
import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: 'Practice Library',
  description: 'The Nervous System Institute practice library.',
  path: '/dashboard/practices',
  noIndex: true,
});

function practiceMeta(practice: {
  contentType: string;
  durationSeconds: number | null;
  category: string | null;
  difficulty: number;
}): string {
  const parts = [formatContentTypeLabel(practice.contentType)];
  const duration = formatPracticeDuration(practice.durationSeconds);
  if (duration) parts.push(duration);
  if (practice.category) parts.push(practice.category);
  return parts.join(' · ');
}

interface PracticeLibraryPageProps {
  searchParams: Promise<{ category?: string; contentType?: string }>;
}

/** Builds a `/dashboard/practices` link carrying whichever filters are still active. */
function filterHref(params: { category?: string; contentType?: string }): string {
  const search = new URLSearchParams();
  if (params.category) search.set('category', params.category);
  if (params.contentType) search.set('contentType', params.contentType);
  const query = search.toString();
  return query ? `/dashboard/practices?${query}` : '/dashboard/practices';
}

function FilterRow({
  label,
  options,
  active,
  hrefFor,
}: {
  label: string;
  options: { value: string; label: string }[];
  active?: string;
  hrefFor: (value: string | undefined) => string;
}) {
  if (options.length < 2) return null;

  return (
    <nav aria-label={label}>
      <Stack direction="row" gap="sm" wrap="wrap" className="items-center">
        <Text tone="muted" size="xs" className="tracking-[0.1em] uppercase">
          {label}
        </Text>
        <NextLink
          href={hrefFor(undefined)}
          aria-current={!active ? 'page' : undefined}
          className={
            !active
              ? 'text-foreground font-medium underline underline-offset-4'
              : 'text-muted-foreground'
          }
        >
          All
        </NextLink>
        {options.map((option) => (
          <NextLink
            key={option.value}
            href={hrefFor(option.value)}
            aria-current={active === option.value ? 'page' : undefined}
            className={
              active === option.value
                ? 'text-foreground font-medium underline underline-offset-4'
                : 'text-muted-foreground'
            }
          >
            {option.label}
          </NextLink>
        ))}
      </Stack>
    </nav>
  );
}

export default async function PracticeLibraryPage({ searchParams }: PracticeLibraryPageProps) {
  const user = await requireAuthOrRedirect();
  const { category: categoryParam, contentType: contentTypeParam } = await searchParams;
  const allPractices = await getPublishedPractices();

  // Filter option lists are derived from the real, currently-published
  // practices — same principle as the Articles category filter — rather
  // than a fixed/invented list, since `category` is free text with no
  // canonical set (see packages/cms/src/schema/documents/practice.ts).
  const categories = Array.from(
    new Set(allPractices.map((p) => p.category).filter((c): c is string => Boolean(c))),
  ).sort();
  const contentTypes = Array.from(new Set(allPractices.map((p) => p.contentType))).sort();

  // An unrecognised filter value (stale link, typo) is treated as no
  // filter — same "never a fabricated filter, never a thrown error"
  // approach already used for article category filtering.
  const activeCategory =
    categoryParam && categories.includes(categoryParam) ? categoryParam : undefined;
  const activeContentType =
    contentTypeParam && contentTypes.includes(contentTypeParam) ? contentTypeParam : undefined;

  const practiceList = allPractices.filter((practice) => {
    if (activeCategory && practice.category !== activeCategory) return false;
    if (activeContentType && practice.contentType !== activeContentType) return false;
    return true;
  });

  // Reuses the existing per-practice `getPracticeCompletion` lookup (same
  // query the practice detail page already runs) rather than introducing a
  // new batched query — run in parallel so N practices cost one round of
  // concurrent indexed lookups, not N sequential ones. Already carries
  // `progressPct`, so "In progress" needs no extra query beyond what
  // "Completed" already required.
  const completions = await Promise.all(
    practiceList.map((practice) => getPracticeCompletion(user.id, practice.id)),
  );

  return (
    <>
      <main id="main-content">
        <Section spacing="xl">
          <Container size="xl">
            <div className="mx-auto max-w-5xl">
              <Stack gap="2xl">
                <header className="border-border flex flex-col gap-(--space-md) border-b pb-(--space-2xl)">
                  <Eyebrow>Practice Library</Eyebrow>
                  <Heading as="h1" size="xl">
                    Practice Library
                  </Heading>
                  <Text tone="muted" className="text-base leading-[1.85] lg:text-lg">
                    A curated collection of practices from The Nervous System Institute.
                  </Text>
                </header>

                {(categories.length > 1 || contentTypes.length > 1) && allPractices.length > 0 ? (
                  <Stack gap="sm">
                    <FilterRow
                      label="Category"
                      active={activeCategory}
                      options={categories.map((value) => ({ value, label: value }))}
                      hrefFor={(value) =>
                        filterHref({ category: value, contentType: activeContentType })
                      }
                    />
                    <FilterRow
                      label="Type"
                      active={activeContentType}
                      options={contentTypes.map((value) => ({
                        value,
                        label: formatContentTypeLabel(value),
                      }))}
                      hrefFor={(value) =>
                        filterHref({ category: activeCategory, contentType: value })
                      }
                    />
                  </Stack>
                ) : null}

                {allPractices.length === 0 ? (
                  <EmptyState
                    title="Practices are being prepared."
                    description="The practice library will appear here as content becomes available."
                  />
                ) : practiceList.length === 0 ? (
                  <EmptyState
                    title="No practices match these filters."
                    description="Try a different category or type, or clear the filters to see the full library."
                    action={
                      <NextLink
                        href="/dashboard/practices"
                        className={buttonVariants({ variant: 'outline', size: 'sm' })}
                      >
                        Clear filters
                      </NextLink>
                    }
                  />
                ) : (
                  <Grid cols="2" gap="lg">
                    {practiceList.map((practice, index) => {
                      const completion = completions[index];
                      const statusLabel = completion?.completed
                        ? 'Completed'
                        : completion && completion.progressPct > 0
                          ? 'In progress'
                          : null;

                      return (
                        <NextLink
                          key={practice.id}
                          href={`/dashboard/practices/${practice.id}`}
                          className="interaction-focus interaction-colors rounded-lg"
                        >
                          <Card className="hover:border-foreground/40 duration-base ease-standard h-full transition-colors">
                            <CardHeader>
                              <Stack
                                direction="row"
                                gap="sm"
                                className="items-center justify-between"
                              >
                                <Text tone="muted" size="xs" className="tracking-[0.1em] uppercase">
                                  {practiceMeta(practice)}
                                </Text>
                                {statusLabel ? (
                                  <Text role="status" tone="muted" size="xs" className="shrink-0">
                                    {statusLabel}
                                  </Text>
                                ) : null}
                              </Stack>
                              <Heading
                                as="h2"
                                size="xs"
                                className="font-heading text-foreground text-lg font-semibold"
                              >
                                {practice.title}
                              </Heading>
                            </CardHeader>
                            {practice.description ? (
                              <CardContent>
                                <Text tone="muted" className="text-sm leading-[1.7]">
                                  {practice.description}
                                </Text>
                              </CardContent>
                            ) : null}
                          </Card>
                        </NextLink>
                      );
                    })}
                  </Grid>
                )}
              </Stack>
            </div>
          </Container>
        </Section>
      </main>
    </>
  );
}
