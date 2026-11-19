import NextLink from 'next/link';
import { HET_KIND_LABEL, hetWhyLine } from '@tnsi/core';
import { Stack, Text } from '@tnsi/ui';
import type { HetSuggestionItem, HetSuggestions } from '@/lib/het-suggestions';

/**
 * Where a suggestion opens on the website. Guided practices and Somatic Cards have a member page here.
 * PowerDrops are served in the app only, so they are not offered on the website: a suggestion the
 * member cannot open from where they are would be a dead end.
 */
function hrefFor(item: HetSuggestionItem): string | null {
  if (item.kind === 'practice') return `/dashboard/practices/${item.id}`;
  if (item.kind === 'somaticCard' && item.slug) return `/dashboard/somatic-cards/card/${item.slug}`;
  return null;
}

/**
 * "More for today": what the Human Expansion Theory routing suggests beyond the guided practice already
 * shown as today's practice. Shown only after a check-in today (the suggestions are tied to it). Renders
 * nothing when there is nothing else that can be opened, so Home keeps its existing layout.
 */
export function HetSuggestionsBlock({
  suggestions,
  todayPracticeId,
}: {
  suggestions: HetSuggestions | null;
  todayPracticeId: string | null;
}) {
  if (!suggestions) return null;
  const rows = suggestions.items
    .filter((item) => !(item.kind === 'practice' && item.id === todayPracticeId))
    .map((item) => ({ item, href: hrefFor(item) }))
    .filter((row): row is { item: HetSuggestionItem; href: string } => row.href !== null);
  if (rows.length === 0) return null;

  return (
    <section aria-labelledby="more-for-today-heading">
      <Stack gap="sm">
        <h2
          id="more-for-today-heading"
          className="font-heading text-foreground text-xl font-semibold tracking-tight"
        >
          More for today
        </h2>
        <Text tone="muted" size="sm">
          {hetWhyLine(suggestions.condition)}
        </Text>
        <ul className="flex flex-col gap-(--space-sm)">
          {rows.map(({ item, href }) => (
            <li key={`${item.kind}-${item.id}`}>
              <NextLink
                href={href}
                className="border-border hover:bg-surface-muted flex flex-col gap-(--space-3xs) rounded-xl border p-4 transition-colors"
              >
                <span className="text-muted-foreground font-mono text-xs tracking-[0.15em] uppercase">
                  {HET_KIND_LABEL[item.kind]}
                </span>
                <span className="font-heading text-foreground text-lg font-semibold">
                  {item.title}
                </span>
                {item.description ? (
                  <span className="text-muted-foreground line-clamp-2 text-sm leading-relaxed">
                    {item.description}
                  </span>
                ) : null}
              </NextLink>
            </li>
          ))}
        </ul>
      </Stack>
    </section>
  );
}
