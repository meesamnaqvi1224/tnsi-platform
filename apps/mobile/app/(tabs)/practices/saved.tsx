import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer, ErrorNotice, PageHeader, PrimaryButton, ThemedText } from '@/components';
import { PracticeCard } from '@/components/practices/PracticeCard';
import { PracticesSkeleton } from '@/components/practices/PracticesSkeleton';
import { useSavedPractices } from '@/hooks/useSavedPractices';
import { colors, spacing } from '@/theme';
import type { Practice } from '@/api/types';

/**
 * Saved Practices: practices the member has personally bookmarked to
 * return to, in the same card visual language as the Practice Library -
 * not a new list style. Fetches GET /api/v1/practices/saved via
 * useSavedPractices. A `SavedPractice` (no progress/reflection - see its
 * own comment in api/types.ts) is adapted into a `Practice`-shaped object
 * for PracticeCard, which only ever reads the fields both share.
 */
export default function SavedPracticesScreen() {
  const router = useRouter();
  const { state, reload } = useSavedPractices();

  return (
    <ScreenContainer scroll>
      <PageHeader eyebrow="Saved Practices" title="Practices you've chosen to keep close." />

      {state.status === 'loading' && <PracticesSkeleton />}

      {state.status === 'error' && <ErrorNotice message={state.message} onRetry={reload} />}

      {state.status === 'success' && state.practices.length === 0 && (
        <View style={styles.emptyState}>
          <ThemedText variant="body" style={styles.emptyTitle}>
            No saved practices yet
          </ThemedText>
          <ThemedText variant="body" color={colors.charcoal} style={styles.emptyDescription}>
            Save practices you want to come back to later.
          </ThemedText>
          <PrimaryButton
            label="Explore Practices"
            variant="secondary"
            onPress={() => router.push('/practices')}
            style={styles.emptyButton}
          />
        </View>
      )}

      {state.status === 'success' &&
        state.practices.length > 0 &&
        state.practices.map((entry) => {
          const practice: Practice = {
            id: entry.id,
            title: entry.title,
            description: entry.description,
            contentType: entry.contentType,
            mediaUrl: entry.mediaUrl,
            thumbnailUrl: entry.thumbnailUrl,
            durationSeconds: entry.durationSeconds,
            category: entry.category,
            tags: entry.tags,
            difficulty: entry.difficulty,
            progress: null,
            saved: true,
          };
          return <PracticeCard key={entry.id} practice={practice} />;
        })}
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
