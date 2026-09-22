import NextLink from 'next/link';
import { Badge, Card, CardHeader, Grid, Heading, Text } from '@tnsi/ui';
import { ResponsiveImage } from '@/components/utility/responsive-image';
import type { ApiSomaticSeriesDetail } from '@/lib/somatic-card-api';

/**
 * Pure presentational rendering of a Series detail (metadata + its
 * ordered Cards) — same "no fetching/auth of its own" separation as
 * `SeriesListView`. Cards render in the exact order the API returned
 * (already `sortOrder`-ordered server-side) - never re-sorted here.
 *
 * No completion/progress indicator and no implied required order: the
 * Cards are simply listed, each an equal entry point (per the milestone's
 * "progression is NOT mandatory" instruction) - a numbered badge shows
 * the card's own editorial number as content metadata, not a "step N of
 * N you must complete" affordance.
 */
export function SeriesDetailView({ series }: { series: ApiSomaticSeriesDetail }) {
  return (
    <div className="flex flex-col gap-(--space-2xl)">
      {series.cards.length === 0 ? (
        <div className="border-border/80 bg-background rounded-sm border p-(--space-lg)">
          <Text tone="muted">This series doesn&apos;t have any cards available yet.</Text>
        </div>
      ) : (
        <Grid cols="3" gap="lg">
          {series.cards.map((card) => (
            <NextLink
              key={card.id}
              href={`/dashboard/somatic-cards/card/${card.slug}`}
              className="interaction-focus block rounded-lg"
            >
              <Card className="hover:border-foreground/40 duration-base ease-standard h-full overflow-hidden transition-colors">
                {card.cardArtwork ? (
                  <div className="bg-secondary/40 relative aspect-[9/16] w-full">
                    <ResponsiveImage
                      src={card.cardArtwork.url}
                      alt={card.cardArtwork.alt}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover"
                    />
                  </div>
                ) : null}
                <CardHeader>
                  <Badge variant="outline">Card {card.cardNumber}</Badge>
                  <Heading
                    as="h3"
                    size="xs"
                    className="font-heading text-foreground mt-(--space-xs) text-base font-semibold"
                  >
                    {card.title}
                  </Heading>
                </CardHeader>
              </Card>
            </NextLink>
          ))}
        </Grid>
      )}
    </div>
  );
}

export function SeriesDetailHeader({ series }: { series: ApiSomaticSeriesDetail }) {
  return (
    <header className="border-border flex flex-col gap-(--space-md) border-b pb-(--space-2xl)">
      <Badge variant="outline" className="w-fit">
        Series {series.seriesNumber}
      </Badge>
      <Heading as="h1" size="xl">
        {series.title}
      </Heading>
      {series.description ? (
        <Text tone="muted" className="text-base leading-[1.85] lg:text-lg">
          {series.description}
        </Text>
      ) : null}
      {series.coreQuestion ? (
        <Text className="text-foreground/80 text-base leading-[1.85] italic lg:text-lg">
          {series.coreQuestion}
        </Text>
      ) : null}
    </header>
  );
}
