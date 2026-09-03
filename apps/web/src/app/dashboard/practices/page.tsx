import NextLink from 'next/link';
import {
  Badge,
  buttonVariants,
  Card,
  CardContent,
  CardHeader,
  Container,
  EmptyState,
  Eyebrow,
  Grid,
  Heading,
  Input,
  Label,
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
  type PracticeCompletionState,
  type PracticeSummary,
} from '@/lib/practices';
import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: 'Practice Library',
  description: 'The Nervous System Institute practice library.',
  path: '/dashboard/practices',
  noIndex: true,
});

/** Meta line below the title — content type has its own badge, so this excludes it. */
function practiceSecondaryMeta(practice: {
  durationSeconds: number | null;
  category: string | null;
  difficulty: number;
}): string {
  const parts: string[] = [];
  const duration = formatPracticeDuration(practice.durationSeconds);
  if (duration) parts.push(duration);
  if (practice.category) parts.push(practice.category);
  parts.push(`Level ${practice.difficulty}`);
  return parts.join(' · ');
}

type StatusFilter = 'in-progress' | 'completed';

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'in-progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
];

interface PracticeLibraryPageProps {
  searchParams: Promise<{
    category?: string;
    contentType?: string;
    status?: string;
    q?: string;
  }>;
}

/** Builds a `/dashboard/practices` link carrying whichever filters/search are still active. */
function filterHref(params: {
  category?: string;
  contentType?: string;
  status?: string;
  q?: string;
}): string {
  const search = new URLSearchParams();
  if (params.category) search.set('category', params.category);
  if (params.contentType) search.set('contentType', params.contentType);
  if (params.status) search.set('status', params.status);
  if (params.q) search.set('q', params.q);
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

function matchesStatus(
  status: StatusFilter | undefined,
  completion: PracticeCompletionState | null,
): boolean {
  if (!status) return true;
  if (status === 'completed') return completion?.completed ?? false;
  return !completion?.completed && (completion?.progressPct ?? 0) > 0;
}

function matchesQuery(q: string, practice: PracticeSummary): boolean {
  if (!q) return true;
  const haystack = `${practice.title} ${practice.description ?? ''}`.toLowerCase();
  return haystack.includes(q);
}

export default async function PracticeLibraryPage({ searchParams }: PracticeLibraryPageProps) {
  const user = await requireAuthOrRedirect();
  const {
    category: categoryParam,
    contentType: contentTypeParam,
    status: statusParam,
    q: qParam,
  } = await searchParams;
  const allPractices = await getPublishedPractices();
  const q = (qParam ?? '').trim().toLowerCase();

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
  const activeStatus =
    statusParam && STATUS_OPTIONS.some((o) => o.value === statusParam)
      ? (statusParam as StatusFilter)
      : undefined;

  // Completions are fetched for every published practice up front — status
  // is an orthogonal filter (like category/type), not a narrowing of an
  // already-filtered list, so every practice needs its completion state
  // regardless of which other filters are active. Reuses the existing
  // per-practice `getPracticeCompletion` lookup (same query the practice
  // detail page already runs), run in parallel.
  const completions = await Promise.all(
    allPractices.map((practice) => getPracticeCompletion(user.id, practice.id)),
  );

  const practiceList = allPractices
    .map((practice, index) => ({ practice, completion: completions[index] ?? null }))
    .filter(({ practice, completion }) => {
      if (activeCategory && practice.category !== activeCategory) return false;
      if (activeContentType && practice.contentType !== activeContentType) return false;
      if (!matchesStatus(activeStatus, completion)) return false;
      if (!matchesQuery(q, practice)) return false;
      return true;
    });

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

                {allPractices.length > 0 ? (
                  <Stack gap="lg">
                    <form
                      method="get"
                      action="/dashboard/practices"
                      className="flex flex-col gap-(--space-sm) sm:flex-row sm:items-end"
                    >
                      {activeCategory ? (
                        <input type="hidden" name="category" value={activeCategory} />
                      ) : null}
                      {activeContentType ? (
                        <input type="hidden" name="contentType" value={activeContentType} />
                      ) : null}
                      {activeStatus ? (
                        <input type="hidden" name="status" value={activeStatus} />
                      ) : null}
                      <Stack gap="2xs" className="w-full sm:max-w-xs">
                        <Label htmlFor="practice-search" className="sr-only">
                          Search practices
                        </Label>
                        <Input
                          id="practice-search"
                          type="search"
                          name="q"
                          defaultValue={qParam ?? ''}
                          placeholder="Search practices…"
                        />
                      </Stack>
                      <button
                        type="submit"
                        className={buttonVariants({ variant: 'outline', size: 'sm' })}
                      >
                        Search
                      </button>
                    </form>

                    <Stack gap="sm">
                      <FilterRow
                        label="Category"
                        active={activeCategory}
                        options={categories.map((value) => ({ value, label: value }))}
                        hrefFor={(value) =>
                          filterHref({
                            category: value,
                            contentType: activeContentType,
                            status: activeStatus,
                            q: qParam,
                          })
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
                          filterHref({
                            category: activeCategory,
                            contentType: value,
                            status: activeStatus,
                            q: qParam,
                          })
                        }
                      />
                      {completions.some((c) => c) ? (
                        <FilterRow
                          label="Status"
                          active={activeStatus}
                          options={STATUS_OPTIONS}
                          hrefFor={(value) =>
                            filterHref({
                              category: activeCategory,
                              contentType: activeContentType,
                              status: value,
                              q: qParam,
                            })
                          }
                        />
                      ) : null}
                    </Stack>
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
                    description="Try different filters or search terms, or clear everything to see the full library."
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
                    {practiceList.map(({ practice, completion }) => {
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
                                <Badge variant="outline">
                                  {formatContentTypeLabel(practice.contentType)}
                                </Badge>
                                {statusLabel ? (
                                  <Badge
                                    role="status"
                                    variant={completion?.completed ? 'success' : 'secondary'}
                                    className="shrink-0"
                                  >
                                    {statusLabel}
                                  </Badge>
                                ) : null}
                              </Stack>
                              <Heading
                                as="h2"
                                size="xs"
                                className="font-heading text-foreground mt-(--space-xs) text-lg font-semibold"
                              >
                                {practice.title}
                              </Heading>
                              <Text tone="muted" size="xs" className="tracking-[0.02em]">
                                {practiceSecondaryMeta(practice)}
                              </Text>
                            </CardHeader>
                            {practice.description || practice.tags.length > 0 ? (
                              <CardContent>
                                <Stack gap="sm">
                                  {practice.description ? (
                                    <Text tone="muted" className="text-sm leading-[1.7]">
                                      {practice.description}
                                    </Text>
                                  ) : null}
                                  {practice.tags.length > 0 ? (
                                    <Stack direction="row" gap="2xs" wrap="wrap">
                                      {practice.tags.map((tag) => (
                                        <Badge key={tag} variant="secondary">
                                          {tag}
                                        </Badge>
                                      ))}
                                    </Stack>
                                  ) : null}
                                </Stack>
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
