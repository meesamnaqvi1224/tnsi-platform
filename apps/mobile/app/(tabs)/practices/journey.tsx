import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer, ErrorNotice, PageHeader, PrimaryButton, ThemedText } from '@/components';
import { JourneyEntryRow } from '@/components/journey/JourneyEntryRow';
import { useJourney } from '@/hooks/useJourney';
import { groupJourneyEntriesByDate } from '@/lib/journeyGrouping';
import { colors, spacing } from '@/theme';

/**
 * My Journey: this member's own recorded activity - completed practices
 * and daily check-ins, grouped by date, newest first. Fetches GET
 * /api/v1/journey via useJourney, the same fetch-on-mount/load-more shape
 * usePracticeHistory/useCheckInHistory already established. Purely
 * descriptive: no score, no streak, no interpretation of what any of this
 * means - just what the member actually did and recorded.
 */
export default function JourneyScreen() {
  const router = useRouter();
  const { state, reload, loadMore } = useJourney();
  const groups = state.status === 'success' ? groupJourneyEntriesByDate(state.entries) : [];

  return (
    <ScreenContainer scroll>
      <PageHeader
        eyebrow="My Journey"
        title="A record of the practices and moments you've chosen to spend time with."
      />

      {state.status === 'loading' && (
        <ThemedText variant="body" color={colors.charcoal}>
          Loading…
        </ThemedText>
      )}

      {state.status === 'error' && <ErrorNotice message={state.message} onRetry={reload} />}

      {state.status === 'success' && state.entries.length === 0 && (
        <View style={styles.emptyState}>
          <ThemedText variant="body" style={styles.emptyTitle}>
            Your journey starts here
          </ThemedText>
          <ThemedText variant="body" color={colors.charcoal} style={styles.emptyDescription}>
            Your completed practices and reflections will appear here as you spend time with the
            practices.
          </ThemedText>
          <PrimaryButton
            label="Explore Practices"
            variant="secondary"
            onPress={() => router.push('/practices')}
            style={styles.emptyButton}
          />
        </View>
      )}

      {state.status === 'success' && state.entries.length > 0 && (
        <>
          {groups.map((group) => (
            <View key={`${group.label}-${group.entries[0]?.id}`} style={styles.group}>
              <ThemedText variant="label" color={colors.bronze} style={styles.groupLabel}>
                {group.label.toUpperCase()}
              </ThemedText>
              {group.entries.map((entry) => (
                <JourneyEntryRow key={`${entry.kind}-${entry.id}`} entry={entry} />
              ))}
            </View>
          ))}

          {state.hasMore ? (
            <PrimaryButton
              label={state.loadingMore ? 'Loading…' : 'Load More'}
              variant="secondary"
              onPress={loadMore}
              loading={state.loadingMore}
            />
          ) : null}
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  emptyState: {
    marginTop: spacing.lg,
  },
  emptyTitle: {
    marginBottom: spacing.xs,
  },
  emptyDescription: {
    marginBottom: spacing.lg,
  },
  emptyButton: {
    alignSelf: 'flex-start',
  },
  group: {
    marginBottom: spacing.lg,
  },
  groupLabel: {
    marginBottom: spacing.sm,
  },
});
