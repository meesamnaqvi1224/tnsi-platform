import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer, ErrorNotice, PageHeader, PrimaryButton, ThemedText } from '@/components';
import { PracticeHistoryRow } from '@/components/practices/PracticeHistoryRow';
import { usePracticeHistory } from '@/hooks/usePracticeHistory';
import { colors, spacing } from '@/theme';

/**
 * Practice History: every completed session, newest first - a real
 * record of repeated practice over time (see
 * packages/db/src/schema/practice-completions.ts's own comment on why a
 * practice can appear here more than once). Fetches GET
 * /api/v1/practices/history via usePracticeHistory, the same
 * fetch-on-mount/load-more shape useCheckInHistory already established
 * for Progress's check-in list.
 */
export default function PracticeHistoryScreen() {
  const router = useRouter();
  const { state, reload, loadMore } = usePracticeHistory();

  return (
    <ScreenContainer scroll>
      <PageHeader
        eyebrow="Practice History"
        title="Every practice you've completed, most recent first."
      />

      {state.status === 'loading' && (
        <ThemedText variant="body" color={colors.charcoal}>
          Loading…
        </ThemedText>
      )}

      {state.status === 'error' && <ErrorNotice message={state.message} onRetry={reload} />}

      {state.status === 'success' && state.history.length === 0 && (
        <View style={styles.emptyState}>
          <ThemedText variant="body" style={styles.emptyTitle}>
            Your practice history will appear here
          </ThemedText>
          <ThemedText variant="body" color={colors.charcoal} style={styles.emptyDescription}>
            As you complete practices, each session will show up here.
          </ThemedText>
          <PrimaryButton
            label="Browse Practices"
            variant="secondary"
            onPress={() => router.push('/practices')}
            style={styles.emptyButton}
          />
        </View>
      )}

      {state.status === 'success' && state.history.length > 0 && (
        <>
          {state.history.map((entry) => (
            <PracticeHistoryRow key={entry.completionId} entry={entry} />
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
});
