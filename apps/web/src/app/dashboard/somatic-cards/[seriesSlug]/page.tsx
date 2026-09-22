import { notFound } from 'next/navigation';
import NextLink from 'next/link';
import { Container, EmptyState, Section, Stack } from '@tnsi/ui';
import {
  SeriesDetailHeader,
  SeriesDetailView,
} from '@/components/dashboard/somatic-cards/series-detail-view';
import { requireMemberAccessOrRedirect } from '@/lib/auth-api';
import { fetchSomaticSeriesDetail } from '@/lib/somatic-cards-client';
import { createPageMetadata } from '@/lib/seo';

interface SeriesDetailPageProps {
  params: Promise<{ seriesSlug: string }>;
}

export async function generateMetadata({ params }: SeriesDetailPageProps) {
  const { seriesSlug } = await params;
  const result = await fetchSomaticSeriesDetail(seriesSlug);
  const series = result.status === 'ok' ? result.data : null;

  return createPageMetadata({
    title: series?.title ?? 'Somatic Card Series',
    description: series?.description ?? 'The Nervous System Institute Somatic Card library.',
    path: `/dashboard/somatic-cards/${seriesSlug}`,
    noIndex: true,
  });
}

/**
 * Somatic Series detail — Series metadata plus its ordered published
 * Cards (as summaries; full Card content lives on
 * `/dashboard/somatic-cards/card/[cardSlug]`). Same "call the Read API's
 * own Route Handler, never Postgres/Sanity directly" pattern as the
 * Series list page.
 */
export default async function SomaticSeriesDetailPage({ params }: SeriesDetailPageProps) {
  await requireMemberAccessOrRedirect();
  const { seriesSlug } = await params;

  const result = await fetchSomaticSeriesDetail(seriesSlug);
  if (result.status === 'not-found') notFound();

  return (
    <main id="main-content">
      <Section spacing="xl">
        <Container size="xl">
          <div className="mx-auto max-w-5xl">
            <Stack gap="2xl">
              <NextLink
                href="/dashboard/somatic-cards"
                className="interaction-text-link-underline w-fit"
              >
                ← Somatic Card Library
              </NextLink>

              {result.status === 'error' ? (
                <EmptyState
                  title="Something went wrong."
                  description="We couldn't load this series right now. Please try again shortly."
                />
              ) : (
                <>
                  <SeriesDetailHeader series={result.data} />
                  <SeriesDetailView series={result.data} />
                </>
              )}
            </Stack>
          </div>
        </Container>
      </Section>
    </main>
  );
}
