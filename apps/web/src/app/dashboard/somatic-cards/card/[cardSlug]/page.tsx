import { notFound } from 'next/navigation';
import { Container, EmptyState, Section } from '@tnsi/ui';
import { CardReadingView } from '@/components/dashboard/somatic-cards/card-reading-view';
import { requireMemberAccessOrRedirect } from '@/lib/auth-api';
import { fetchSomaticCardDetail } from '@/lib/somatic-cards-client';
import { createPageMetadata } from '@/lib/seo';

interface CardDetailPageProps {
  params: Promise<{ cardSlug: string }>;
}

export async function generateMetadata({ params }: CardDetailPageProps) {
  const { cardSlug } = await params;
  const result = await fetchSomaticCardDetail(cardSlug);
  const card = result.status === 'ok' ? result.data : null;

  return createPageMetadata({
    title: card?.title ?? 'Somatic Card',
    description:
      card?.invitation ?? card?.purpose ?? 'The Nervous System Institute Somatic Card library.',
    path: `/dashboard/somatic-cards/card/${cardSlug}`,
    noIndex: true,
  });
}

/**
 * Individual Somatic Card reading view — full structured content plus
 * its four distinct visual asset types. Same "call the Read API's own
 * Route Handler, never Postgres/Sanity directly" pattern as the other
 * two Somatic Card pages.
 */
export default async function SomaticCardDetailPage({ params }: CardDetailPageProps) {
  await requireMemberAccessOrRedirect();
  const { cardSlug } = await params;

  const result = await fetchSomaticCardDetail(cardSlug);
  if (result.status === 'not-found') notFound();

  return (
    <main id="main-content">
      <Section spacing="xl">
        <Container size="xl">
          <div className="mx-auto max-w-3xl">
            {result.status === 'error' ? (
              <EmptyState
                title="Something went wrong."
                description="We couldn't load this card right now. Please try again shortly."
              />
            ) : (
              <CardReadingView card={result.data} />
            )}
          </div>
        </Container>
      </Section>
    </main>
  );
}
