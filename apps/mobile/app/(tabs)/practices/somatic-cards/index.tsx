import { ScreenContainer, ErrorNotice, PageHeader, ThemedText } from '@/components';
import { SomaticSeriesCard } from '@/components/somatic-cards/SomaticSeriesCard';
import { SomaticCardsSkeleton } from '@/components/somatic-cards/SomaticCardsSkeleton';
import { useSomaticSeriesList } from '@/hooks/useSomaticSeriesList';
import { colors } from '@/theme';

/**
 * Somatic Card Series library - the native mobile counterpart to
 * `/dashboard/somatic-cards` on web. Fetches
 * GET /api/v1/somatic-cards/series once; renders exactly what the API
 * returns, in the API's own `sortOrder` - no client-side re-sorting.
 */
export default function SomaticCardsScreen() {
  const { state, reload } = useSomaticSeriesList();

  return (
    <ScreenContainer scroll>
      <PageHeader
        eyebrow="Somatic Cards"
        title="A library of somatic practice cards from The Nervous System Institute."
      />

      {state.status === 'loading' && <SomaticCardsSkeleton />}

      {state.status === 'error' && <ErrorNotice message={state.message} onRetry={reload} />}

      {state.status === 'success' &&
        (state.series.length === 0 ? (
          <ThemedText variant="body" color={colors.charcoal}>
            There are currently no published Somatic Card series available.
          </ThemedText>
        ) : (
          state.series.map((series) => <SomaticSeriesCard key={series.id} series={series} />)
        ))}
    </ScreenContainer>
  );
}
