import NextLink from 'next/link';
import { Badge, Card, CardContent, CardHeader, Grid, Heading, Text } from '@tnsi/ui';
import type { ApiSomaticSeriesListItem } from '@/lib/somatic-card-api';

/**
 * Pure presentational rendering of the Somatic Series list — takes
 * already-fetched, already-ordered API data as props, does no fetching or
 * auth of its own (that's `/dashboard/somatic-cards/page.tsx`'s job). Kept
 * separate from the page specifically so it can be unit-tested by
 * rendering it directly (see `series-list-view.test.tsx`) without needing
 * to exercise Next.js routing/auth machinery.
 *
 * Renders API data exactly as returned — series number, title,
 * description, core question - and never invents copy the API didn't
 * provide (per the milestone's content rule: no fabricated descriptions,
 * benefits, or clinical framing).
 */
export function SeriesListView({ series }: { series: ApiSomaticSeriesListItem[] }) {
  return (
    <Grid cols="2" gap="lg">
      {series.map((s) => (
        <NextLink
          key={s.id}
          href={`/dashboard/somatic-cards/${s.slug}`}
          className="interaction-focus block rounded-lg"
        >
          <Card className="hover:border-foreground/40 duration-base ease-standard h-full transition-colors">
            <CardHeader>
              <Badge variant="outline">Series {s.seriesNumber}</Badge>
              <Heading
                as="h2"
                size="xs"
                className="font-heading text-foreground mt-(--space-xs) text-lg font-semibold"
              >
                {s.title}
              </Heading>
            </CardHeader>
            {s.description || s.coreQuestion ? (
              <CardContent>
                <div className="flex flex-col gap-(--space-sm)">
                  {s.description ? (
                    <Text tone="muted" className="text-sm leading-[1.7]">
                      {s.description}
                    </Text>
                  ) : null}
                  {s.coreQuestion ? (
                    <Text className="text-foreground/80 text-sm leading-[1.7] italic">
                      {s.coreQuestion}
                    </Text>
                  ) : null}
                </div>
              </CardContent>
            ) : null}
          </Card>
        </NextLink>
      ))}
    </Grid>
  );
}
