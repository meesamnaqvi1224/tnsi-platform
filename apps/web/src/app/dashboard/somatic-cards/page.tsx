import { Container, EmptyState, Eyebrow, Heading, Section, Stack, Text } from '@tnsi/ui';
import { SeriesListView } from '@/components/dashboard/somatic-cards/series-list-view';
import { requireMemberAccessOrRedirect } from '@/lib/auth-api';
import { fetchSomaticSeriesList } from '@/lib/somatic-cards-client';
import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: 'Somatic Cards',
  description: 'The Nervous System Institute Somatic Card library.',
  path: '/dashboard/somatic-cards',
  noIndex: true,
});

/**
 * Somatic Series list — the entry point into the Somatic Card reading
 * experience. Same member-access gate and page shape as
 * `/dashboard/practices`. Fetches via `fetchSomaticSeriesList()`
 * (`@/lib/somatic-cards-client`), which calls the approved Read API's own
 * Route Handler directly — this page never touches Postgres or Sanity.
 */
export default async function SomaticCardsPage() {
  await requireMemberAccessOrRedirect();

  const result = await fetchSomaticSeriesList();

  return (
    <main id="main-content">
      <Section spacing="xl">
        <Container size="xl">
          <div className="mx-auto max-w-5xl">
            <Stack gap="2xl">
              <header className="border-border flex flex-col gap-(--space-md) border-b pb-(--space-2xl)">
                <Eyebrow>Somatic Cards</Eyebrow>
                <Heading as="h1" size="xl">
                  Somatic Card Library
                </Heading>
                <Text tone="muted" className="text-base leading-[1.85] lg:text-lg">
                  A collection of Somatic Card series from The Nervous System Institute.
                </Text>
              </header>

              {result.status === 'error' ? (
                <EmptyState
                  title="Something went wrong."
                  description="We couldn't load the Somatic Card library right now. Please try again shortly."
                />
              ) : result.data.length === 0 ? (
                <EmptyState
                  title="No series available yet."
                  description="There are currently no published Somatic Card series available."
                />
              ) : (
                <SeriesListView series={result.data} />
              )}
            </Stack>
          </div>
        </Container>
      </Section>
    </main>
  );
}
