import NextLink from 'next/link';
import {
  Badge,
  buttonVariants,
  cn,
  Container,
  EmptyState,
  Eyebrow,
  Heading,
  Input,
  Label,
  Section,
  Stack,
  Text,
} from '@tnsi/ui';
import { RETURN_PATH_KEY } from '@tnsi/core';
import {
  CardArt,
  TINT_CLASSES,
  tintForContentType,
  tintStyle,
} from '@/components/dashboard/membership/membership-visuals';
import { SaveToggleButton } from '@/components/dashboard/save-toggle-button';
import { ResponsiveImage } from '@/components/utility/responsive-image';
import { requireMemberAccessOrRedirect } from '@/lib/auth-api';
import { contentAccessFor } from '@/lib/membership';
import {
  CONDITION_TINT,
  CONDITIONS,
  conditionsOf,
  displayableThumbnail,
  parseCondition,
  primaryCondition,
  type Condition,
} from '@/lib/practice-conditions';
import {
  formatContentTypeLabel,
  formatPracticeDuration,
  getPracticeCompletion,
  getPublishedPractices,
  isPracticeSaved,
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

type StatusFilter = 'in-progress' | 'completed';
type SortOption = 'shortest' | 'longest';

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'in-progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'shortest', label: 'Shortest' },
  { value: 'longest', label: 'Longest' },
];

interface PracticeLibraryPageProps {
  searchParams: Promise<{
    category?: string;
    condition?: string;
    contentType?: string;
    status?: string;
    sort?: string;
    q?: string;
  }>;
}

interface ActiveFilters {
  category?: string;
  condition?: string;
  contentType?: string;
  status?: string;
  sort?: string;
  q?: string;
}

/** Builds a `/dashboard/practices` link carrying whichever filters/search/sort are still active. */
function filterHref(params: ActiveFilters): string {
  const search = new URLSearchParams();
  if (params.category) search.set('category', params.category);
  if (params.condition) search.set('condition', params.condition);
  if (params.contentType) search.set('contentType', params.contentType);
  if (params.status) search.set('status', params.status);
  if (params.sort) search.set('sort', params.sort);
  if (params.q) search.set('q', params.q);
  const query = search.toString();
  return query ? `/dashboard/practices?${query}` : '/dashboard/practices';
}

const chipBase =
  'interaction-focus rounded-full border px-3 py-1 text-sm font-medium transition-colors';
const chipOn = 'border-foreground bg-foreground text-background';
const chipOff = 'border-foreground/30 bg-background/70 text-foreground/80 hover:border-foreground';

/** One row of filter pills: "All" plus the options that exist. A single option is not a choice, so it is not shown. */
function FilterRow({
  label,
  options,
  active,
  hrefFor,
  includeAll = true,
}: {
  label: string;
  options: { value: string; label: string }[];
  active?: string;
  hrefFor: (value: string | undefined) => string;
  includeAll?: boolean;
}) {
  if (options.length < 2) return null;

  return (
    <nav aria-label={label}>
      <Stack direction="row" gap="xs" wrap="wrap" className="items-center">
        <Text tone="muted" size="xs" className="mr-1 tracking-[0.1em] uppercase">
          {label}
        </Text>
        {includeAll ? (
          <NextLink
            href={hrefFor(undefined)}
            aria-current={!active ? 'page' : undefined}
            className={cn(chipBase, !active ? chipOn : chipOff)}
          >
            All
          </NextLink>
        ) : null}
        {options.map((option) => (
          <NextLink
            key={option.value}
            href={hrefFor(active === option.value ? undefined : option.value)}
            aria-current={active === option.value ? 'page' : undefined}
            className={cn(chipBase, active === option.value ? chipOn : chipOff)}
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

/** The library's own order by default; shortest/longest put practices without a duration last. */
function sortPractices<T extends { practice: PracticeSummary }>(
  list: T[],
  sort: SortOption | undefined,
): T[] {
  if (!sort) return list;
  const duration = (item: T) => item.practice.durationSeconds ?? Number.POSITIVE_INFINITY;
  const direction = sort === 'shortest' ? 1 : -1;
  return [...list].sort((a, b) => {
    const da = duration(a);
    const db = duration(b);
    if (da === db) return 0;
    if (da === Number.POSITIVE_INFINITY) return 1;
    if (db === Number.POSITIVE_INFINITY) return -1;
    return (da - db) * direction;
  });
}

export default async function PracticeLibraryPage({ searchParams }: PracticeLibraryPageProps) {
  const user = await requireMemberAccessOrRedirect();
  const {
    category: categoryParam,
    condition: conditionParam,
    contentType: contentTypeParam,
    status: statusParam,
    sort: sortParam,
    q: qParam,
  } = await searchParams;
  const allPractices = await getPublishedPractices();
  const access = contentAccessFor(user.entitlements);
  const q = (qParam ?? '').trim().toLowerCase();

  // Filter option lists are derived from the real, currently-published
  // practices — same principle as the Articles category filter — rather
  // than a fixed/invented list, since `category` is free text with no
  // canonical set (see packages/cms/src/schema/documents/practice.ts).
  const categories = Array.from(
    new Set(allPractices.map((p) => p.category).filter((c): c is string => Boolean(c))),
  ).sort();
  const contentTypes = Array.from(new Set(allPractices.map((p) => p.contentType))).sort();
  // The Five Developmental Conditions, only those some practice actually carries.
  const conditionsInUse: Condition[] = CONDITIONS.filter((condition) =>
    allPractices.some((practice) => conditionsOf(practice.tags).includes(condition)),
  );

  // An unrecognised filter value (stale link, typo) is treated as no
  // filter — same "never a fabricated filter, never a thrown error"
  // approach already used for article category filtering.
  const activeCategory =
    categoryParam && categories.includes(categoryParam) ? categoryParam : undefined;
  const parsedCondition = parseCondition(conditionParam);
  const activeCondition =
    parsedCondition && conditionsInUse.includes(parsedCondition) ? parsedCondition : undefined;
  const activeContentType =
    contentTypeParam && contentTypes.includes(contentTypeParam) ? contentTypeParam : undefined;
  const activeStatus =
    statusParam && STATUS_OPTIONS.some((o) => o.value === statusParam)
      ? (statusParam as StatusFilter)
      : undefined;
  const activeSort = SORT_OPTIONS.find((o) => o.value === sortParam)?.value;

  // Completions are fetched for every published practice up front — status
  // is an orthogonal filter (like category/type), not a narrowing of an
  // already-filtered list, so every practice needs its completion state
  // regardless of which other filters are active. Reuses the existing
  // per-practice `getPracticeCompletion` lookup (same query the practice
  // detail page already runs), run in parallel.
  const completions = await Promise.all(
    allPractices.map((practice) => getPracticeCompletion(user.id, practice.id)),
  );
  const savedStates = await Promise.all(
    allPractices.map((practice) => isPracticeSaved(user.id, practice.id)),
  );

  const everything = allPractices.map((practice, index) => ({
    practice,
    completion: completions[index] ?? null,
    saved: savedStates[index] ?? false,
  }));

  const practiceList = sortPractices(
    everything.filter(({ practice, completion }) => {
      if (activeCategory && practice.category !== activeCategory) return false;
      if (activeCondition && !conditionsOf(practice.tags).includes(activeCondition)) return false;
      if (activeContentType && practice.contentType !== activeContentType) return false;
      if (!matchesStatus(activeStatus, completion)) return false;
      if (!matchesQuery(q, practice)) return false;
      return true;
    }),
    activeSort,
  );

  const current: ActiveFilters = {
    category: activeCategory,
    condition: activeCondition,
    contentType: activeContentType,
    status: activeStatus,
    sort: activeSort,
    q: qParam,
  };
  const filtersActive = Boolean(
    activeCategory || activeCondition || activeContentType || activeStatus || q,
  );

  // "Start here" is for a member who has not begun anything: The Return Path
  // when it is published, else the first practice they can open. Hidden once
  // they have started anything, and while any filter or search is active.
  const hasBegun = completions.some((completion) => completion !== null);
  const startHere = hasBegun
    ? null
    : (everything.find(
        ({ practice }) => practice.interactiveKey === RETURN_PATH_KEY && access.canOpen(practice),
      )?.practice ??
      everything.find(({ practice }) => access.canOpen(practice))?.practice ??
      null);

  return (
    <>
      <main id="main-content">
        <Section spacing="xl">
          <Container size="xl">
            {/* Secondary text is darkened here so it holds its contrast on the tinted cards. */}
            <div
              className="[&_.text-muted-foreground]:text-foreground/70 mx-auto max-w-5xl"
              style={tintStyle}
            >
              <Stack gap="2xl">
                <header className="flex flex-col gap-(--space-md)">
                  <Stack
                    direction="row"
                    gap="sm"
                    wrap="wrap"
                    className="items-center justify-between"
                  >
                    <Eyebrow>Practice Library</Eyebrow>
                    <Stack direction="row" gap="md" wrap="wrap" className="items-center">
                      <NextLink
                        href="/dashboard/practices/saved"
                        className="interaction-text-link-underline text-sm"
                      >
                        Saved Practices →
                      </NextLink>
                      <NextLink
                        href="/dashboard/practices/history"
                        className="interaction-text-link-underline text-sm"
                      >
                        Practice History →
                      </NextLink>
                    </Stack>
                  </Stack>
                  <Heading as="h1" size="xl">
                    Practice Library
                  </Heading>
                  <Text tone="muted" className="text-base leading-[1.85] lg:text-lg">
                    A curated collection of practices from The Nervous System Institute.
                    {allPractices.length > 0
                      ? ` ${allPractices.length} ${allPractices.length === 1 ? 'practice' : 'practices'}.`
                      : ''}
                  </Text>
                </header>

                {startHere && !filtersActive ? (
                  <section
                    aria-labelledby="start-here-heading"
                    className={cn(
                      'flex flex-col gap-(--space-md) rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between',
                      TINT_CLASSES.sage.card,
                    )}
                  >
                    <Stack gap="2xs">
                      <Eyebrow>Start here</Eyebrow>
                      <h2
                        id="start-here-heading"
                        className="font-heading text-foreground text-xl font-semibold"
                      >
                        {startHere.title}
                      </h2>
                      {startHere.description ? (
                        <Text tone="muted" className="line-clamp-2 max-w-xl text-base">
                          {startHere.description}
                        </Text>
                      ) : null}
                    </Stack>
                    <NextLink
                      href={`/dashboard/practices/${startHere.id}`}
                      className={cn(buttonVariants({ variant: 'primary', size: 'md' }), 'w-fit')}
                    >
                      Begin
                    </NextLink>
                  </section>
                ) : null}

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
                      {activeCondition ? (
                        <input type="hidden" name="condition" value={activeCondition} />
                      ) : null}
                      {activeContentType ? (
                        <input type="hidden" name="contentType" value={activeContentType} />
                      ) : null}
                      {activeStatus ? (
                        <input type="hidden" name="status" value={activeStatus} />
                      ) : null}
                      {activeSort ? <input type="hidden" name="sort" value={activeSort} /> : null}
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
                        label="Condition"
                        active={activeCondition}
                        options={conditionsInUse.map((value) => ({ value, label: value }))}
                        hrefFor={(value) => filterHref({ ...current, condition: value })}
                      />
                      <FilterRow
                        label="Category"
                        active={activeCategory}
                        options={categories.map((value) => ({ value, label: value }))}
                        hrefFor={(value) => filterHref({ ...current, category: value })}
                      />
                      <FilterRow
                        label="Type"
                        active={activeContentType}
                        options={contentTypes.map((value) => ({
                          value,
                          label: formatContentTypeLabel(value),
                        }))}
                        hrefFor={(value) => filterHref({ ...current, contentType: value })}
                      />
                      {completions.some((c) => c) ? (
                        <FilterRow
                          label="Status"
                          active={activeStatus}
                          options={STATUS_OPTIONS}
                          hrefFor={(value) => filterHref({ ...current, status: value })}
                        />
                      ) : null}
                      <FilterRow
                        label="Sort"
                        active={activeSort}
                        includeAll={false}
                        options={SORT_OPTIONS}
                        hrefFor={(value) => filterHref({ ...current, sort: value })}
                      />
                    </Stack>

                    {filtersActive ? (
                      <Text tone="muted" size="sm" role="status">
                        Showing {practiceList.length} of {allPractices.length}
                      </Text>
                    ) : null}
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
                  <ul className="m-0 grid list-none grid-cols-1 gap-(--space-lg) p-0 sm:grid-cols-2">
                    {practiceList.map(({ practice, completion, saved }) => {
                      const locked = !access.canOpen(practice);
                      const statusLabel = completion?.completed
                        ? 'Completed'
                        : completion && completion.progressPct > 0
                          ? 'In progress'
                          : null;
                      const conditions = conditionsOf(practice.tags);
                      const primary = primaryCondition(practice.tags);
                      // Any tag that is not one of the five conditions is still shown, as a plain chip.
                      const otherTags = practice.tags.filter(
                        (tag) => !conditions.some((condition) => condition === tag),
                      );
                      const tint =
                        primary !== null
                          ? CONDITION_TINT[primary]
                          : practice.contentType === 'interactive'
                            ? 'sage'
                            : tintForContentType(practice.contentType);
                      const thumbnail = displayableThumbnail(practice.thumbnailUrl);
                      const duration = formatPracticeDuration(practice.durationSeconds);

                      return (
                        // A plain (non-link) card, not wrapped in NextLink like
                        // the library previously was - the title below is its
                        // own link, and the save button is a real sibling
                        // button, not nested inside an anchor (invalid HTML,
                        // and unreliable for screen readers/keyboard focus).
                        <li key={practice.id} className="contents">
                          <article
                            className={cn(
                              'flex h-full flex-col overflow-hidden rounded-2xl border',
                              TINT_CLASSES[tint].card,
                            )}
                          >
                            <div className="relative">
                              {thumbnail ? (
                                <div className="relative h-20 w-full overflow-hidden">
                                  <ResponsiveImage
                                    src={thumbnail}
                                    alt=""
                                    fill
                                    sizes="(min-width: 640px) 440px, 100vw"
                                    className="object-cover"
                                  />
                                </div>
                              ) : (
                                <CardArt
                                  contentType={practice.contentType}
                                  tint={primary !== null ? CONDITION_TINT[primary] : null}
                                />
                              )}
                              {duration ? (
                                <span className="bg-background/90 text-foreground absolute bottom-2 left-3 rounded-md px-2 py-0.5 text-xs font-medium">
                                  {duration}
                                </span>
                              ) : null}
                              {locked ? null : (
                                <SaveToggleButton
                                  practiceId={practice.id}
                                  initialSaved={saved}
                                  display="icon"
                                  className="absolute top-2 right-3"
                                />
                              )}
                            </div>
                            <div className="flex flex-1 flex-col gap-(--space-xs) px-4 pt-3 pb-4">
                              <Stack direction="row" gap="xs" wrap="wrap" className="items-center">
                                <span
                                  className={cn(
                                    'rounded-md px-2 py-0.5 text-xs font-medium',
                                    TINT_CLASSES[tint].tag,
                                  )}
                                >
                                  {formatContentTypeLabel(practice.contentType)}
                                </span>
                                {locked ? <Badge variant="secondary">Members</Badge> : null}
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
                              <NextLink
                                href={`/dashboard/practices/${practice.id}`}
                                className="interaction-focus interaction-colors block w-fit rounded-sm"
                              >
                                <Heading
                                  as="h2"
                                  size="xs"
                                  className="font-heading text-foreground text-lg font-semibold"
                                >
                                  {practice.title}
                                </Heading>
                              </NextLink>
                              {practice.description ? (
                                <Text tone="muted" className="line-clamp-2 text-sm leading-[1.7]">
                                  {practice.description}
                                </Text>
                              ) : null}
                              {conditions.length > 0 || otherTags.length > 0 ? (
                                <Stack
                                  direction="row"
                                  gap="2xs"
                                  wrap="wrap"
                                  className="mt-auto pt-(--space-xs)"
                                >
                                  {conditions.map((condition) => (
                                    <NextLink
                                      key={condition}
                                      href={filterHref({ ...current, condition })}
                                      className={cn(
                                        'interaction-focus rounded-md px-2 py-0.5 text-xs font-medium',
                                        TINT_CLASSES[CONDITION_TINT[condition]].tag,
                                      )}
                                    >
                                      {condition}
                                    </NextLink>
                                  ))}
                                  {otherTags.map((tag) => (
                                    <Badge key={tag} variant="secondary">
                                      {tag}
                                    </Badge>
                                  ))}
                                </Stack>
                              ) : null}
                            </div>
                          </article>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Stack>
            </div>
          </Container>
        </Section>
      </main>
    </>
  );
}
