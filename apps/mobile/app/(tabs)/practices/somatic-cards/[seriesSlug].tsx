import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ScreenContainer, ErrorNotice, PageHeader, ThemedText } from '@/components';
import { SomaticCardListItem } from '@/components/somatic-cards/SomaticCardListItem';
import { SomaticCardsSkeleton } from '@/components/somatic-cards/SomaticCardsSkeleton';
import { useSomaticSeriesDetail } from '@/hooks/useSomaticSeriesDetail';
import { colors, spacing } from '@/theme';

/**
 * A single Somatic Series: metadata plus its ordered published Cards (as
 * summaries - full content lives on the Card reading screen). No
 * completion/progress/lock state, and no implied required order - the
 * Core Series is editorially ordered but progression is never mandatory
 * (per this milestone's explicit instruction).
 */
export default function SomaticSeriesDetailScreen() {
  const params = useLocalSearchParams<{ seriesSlug: string }>();
  const seriesSlug = Array.isArray(params.seriesSlug) ? params.seriesSlug[0] : params.seriesSlug;
  const { state, reload } = useSomaticSeriesDetail(seriesSlug ?? '');

  if (state.status === 'loading') {
    return (
      <ScreenContainer scroll>
        <SomaticCardsSkeleton />
      </ScreenContainer>
    );
  }

  if (state.status === 'not-found') {
    return (
      <ScreenContainer>
        <ThemedText variant="heading">This series isn&apos;t available.</ThemedText>
        <ThemedText variant="body" color={colors.charcoal} style={styles.notFoundBody}>
          It may have been removed or is no longer published.
        </ThemedText>
      </ScreenContainer>
    );
  }

  if (state.status === 'error') {
    return (
      <ScreenContainer>
        <ErrorNotice message={state.message} onRetry={reload} />
      </ScreenContainer>
    );
  }

  const { series } = state;

  return (
    <ScreenContainer scroll>
      <PageHeader
        eyebrow={`Series ${series.seriesNumber}`}
        title={series.title}
        description={series.description ?? undefined}
      />

      {series.coreQuestion ? (
        <ThemedText variant="body" color={colors.navy} style={styles.coreQuestion}>
          {series.coreQuestion}
        </ThemedText>
      ) : null}

      {series.cards.length === 0 ? (
        <View style={styles.emptyNotice}>
          <ThemedText variant="body" color={colors.charcoal}>
            This series doesn&apos;t have any cards available yet.
          </ThemedText>
        </View>
      ) : (
        series.cards.map((card) => <SomaticCardListItem key={card.id} card={card} />)
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  notFoundBody: {
    marginTop: spacing.sm,
  },
  coreQuestion: {
    fontStyle: 'italic',
    marginBottom: spacing.lg,
  },
  emptyNotice: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.lg,
  },
});
