'use client';

import * as React from 'react';
import NextLink from 'next/link';
import { Search } from 'lucide-react';
import { Input, Stack, Text } from '@tnsi/ui';
import { searchContent, type SearchGroup, type SearchResultItem } from '@/content/search';

const { hero, suggestions, recentSearchesPlaceholder, groups, emptyState, index } = searchContent;

function filterResults(query: string): SearchResultItem[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  return index.filter((item) => {
    const haystack = [item.title, item.excerpt, ...item.keywords].join(' ').toLowerCase();
    return haystack.includes(normalized);
  });
}

function groupResults(results: SearchResultItem[]) {
  const grouped: Record<SearchGroup, SearchResultItem[]> = {
    articles: [],
    programs: [],
    resources: [],
  };

  for (const result of results) {
    grouped[result.group].push(result);
  }

  return grouped;
}

export function SearchInterface() {
  const [query, setQuery] = React.useState('');
  const results = React.useMemo(() => filterResults(query), [query]);
  const grouped = React.useMemo(() => groupResults(results), [results]);
  const hasQuery = query.trim().length > 0;
  const hasResults = results.length > 0;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-(--space-3xl)">
      <div className="relative">
        <Search
          aria-hidden
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2"
          strokeWidth={1.5}
        />
        <Input
          type="search"
          name="q"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={hero.placeholder}
          aria-label="Search the Institute"
          className="border-border/80 bg-background h-14 rounded-sm pr-4 pl-12 text-base"
          autoComplete="off"
        />
      </div>

      {!hasQuery ? (
        <Stack gap="2xl">
          <div>
            <p className="text-muted-foreground mb-(--space-md) font-mono text-xs tracking-[0.15em] uppercase">
              Suggestions
            </p>
            <div className="flex flex-wrap gap-(--space-sm)">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setQuery(suggestion)}
                  className="interaction-colors interaction-focus border-border/70 text-muted-foreground hover:text-foreground hover:border-border rounded-full border px-(--space-md) py-(--space-xs) text-sm"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-muted-foreground mb-(--space-md) font-mono text-xs tracking-[0.15em] uppercase">
              Recent searches
            </p>
            <ul className="flex flex-col gap-(--space-sm)">
              {recentSearchesPlaceholder.map((term) => (
                <li key={term}>
                  <button
                    type="button"
                    onClick={() => setQuery(term)}
                    className="interaction-text-link text-sm"
                  >
                    {term}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </Stack>
      ) : null}

      {hasQuery && !hasResults ? (
        <Stack gap="md" className="border-border border-t pt-(--space-2xl)">
          <h2 className="font-heading text-foreground text-2xl font-semibold tracking-tight lg:text-3xl">
            {emptyState.heading}
          </h2>
          <Text tone="muted" className="leading-relaxed">
            {emptyState.supportingCopy}
          </Text>
        </Stack>
      ) : null}

      {hasQuery && hasResults ? (
        <Stack gap="2xl" className="border-border border-t pt-(--space-2xl)">
          {(Object.keys(grouped) as SearchGroup[]).map((group) => {
            const items = grouped[group];
            if (items.length === 0) return null;

            return (
              <section key={group} aria-label={groups[group]}>
                <h2 className="text-muted-foreground mb-(--space-lg) font-mono text-xs tracking-[0.15em] uppercase">
                  {groups[group]}
                </h2>
                <ul className="flex flex-col gap-(--space-md)">
                  {items.map((item) => (
                    <li key={item.id}>
                      <NextLink
                        href={item.href}
                        className="interaction-colors interaction-focus group border-border/70 hover:border-border block border-b pb-(--space-lg)"
                      >
                        <p className="interaction-colors font-heading text-foreground group-hover:text-muted-foreground text-lg font-medium tracking-tight">
                          {item.title}
                        </p>
                        <Text tone="muted" className="mt-(--space-xs) text-sm leading-relaxed">
                          {item.excerpt}
                        </Text>
                      </NextLink>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </Stack>
      ) : null}
    </div>
  );
}
