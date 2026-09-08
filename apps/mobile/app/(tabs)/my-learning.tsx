import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer, ErrorNotice, ThemedText, PrimaryButton } from '@/components';
import { PracticeCard } from '@/components/practices/PracticeCard';
import { PracticesSkeleton } from '@/components/practices/PracticesSkeleton';
import { usePractices } from '@/hooks/usePractices';
import { colors, spacing } from '@/theme';
import type { Practice } from '@/api/types';

/** "2026-06-12T09:00:00.000Z" -> "12 Jun 2026". Local to this screen - no other screen needs a day-level date yet. */
function formatCompletedDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * My Learning: two views onto the same GET /api/v1/practices data Practices
 * already fetches - practices in progress, and practices completed. There is
 * no programme/module/lesson model anywhere in the system (see PHASE_8.1
 * audit), so this deliberately stays a practice-progress view rather than a
 * course tracker - no course/programme/module/lesson/certification language,
 * no invented metrics.
 */
export default function MyLearningScreen() {
  const router = useRouter();
  const { state, reload } = usePractices();

  const practices = useMemo(() => (state.status === 'success' ? state.practices : []), [state]);

  // Mirrors apps/web/src/lib/practices.ts's getInProgressPractices: not
  // completed, some real progress recorded, most recently played first.
  const continuePractices = useMemo(
    () =>
      practices
        .filter((p) => {
          const pct = p.progress?.progressPct ?? 0;
          return !p.progress?.completed && pct > 0 && pct < 1;
        })
        .sort((a, b) => lastPlayedTime(b) - lastPlayedTime(a)),
    [practices],
  );

  // Mirrors apps/web/src/lib/practices.ts's getRecentCompletions: completed,
  // most recently completed first.
  const completedPractices = useMemo(
    () =>
      practices
        .filter((p) => p.progress?.completed === true)
        .sort((a, b) => completedTime(b) - completedTime(a)),
    [practices],
  );

  return (
    <ScreenContainer scroll>
      <ThemedText variant="label" color={colors.bronze} style={styles.eyebrow}>
        My Learning
      </ThemedText>
      <ThemedText variant="display" style={styles.heading}>
        Return to what you&apos;ve been practising.
      </ThemedText>
      <ThemedText variant="body" color={colors.charcoal} style={styles.subtitle}>
        Continue practices you&apos;ve started or revisit practices you&apos;ve completed.
      </ThemedText>

      {state.status === 'loading' && <PracticesSkeleton />}

      {state.status === 'error' && <ErrorNotice message={state.message} onRetry={reload} />}

      {state.status === 'success' && (
        <>
          <View style={styles.section}>
            <View accessibilityRole="header" accessible>
              <ThemedText variant="heading" style={styles.sectionTitle}>
                Continue
              </ThemedText>
            </View>

            {continuePractices.length === 0 ? (
              <View>
                <ThemedText variant="body" style={styles.emptyTitle}>
                  Nothing in progress yet.
                </ThemedText>
                <ThemedText variant="body" color={colors.charcoal}>
                  Practices you begin will appear here so you can return when you&apos;re ready.
                </ThemedText>
              </View>
            ) : (
              continuePractices.map((practice) => (
                <View key={practice.id} style={styles.item}>
                  <ThemedText variant="caption" color={colors.bronze} style={styles.itemLabel}>
                    {Math.round((practice.progress?.progressPct ?? 0) * 100)}% complete
                  </ThemedText>
                  <PracticeCard practice={practice} />
                </View>
              ))
            )}
          </View>

          <View style={styles.section}>
            <View accessibilityRole="header" accessible>
              <ThemedText variant="heading" style={styles.sectionTitle}>
                Recently Completed
              </ThemedText>
            </View>

            {completedPractices.length === 0 ? (
              <View>
                <ThemedText variant="body" style={styles.emptyTitle}>
                  Nothing completed yet.
                </ThemedText>
                <ThemedText variant="body" color={colors.charcoal}>
                  Completed practices will appear here as you build your practice library.
                </ThemedText>
              </View>
            ) : (
              completedPractices.map((practice) => {
                const completedAt = practice.progress?.completedAt;
                return (
                  <View key={practice.id} style={styles.item}>
                    {completedAt ? (
                      <ThemedText variant="caption" color={colors.bronze} style={styles.itemLabel}>
                        Completed {formatCompletedDate(completedAt)}
                      </ThemedText>
                    ) : null}
                    <PracticeCard practice={practice} />
                  </View>
                );
              })
            )}
          </View>

          <View style={styles.browseSection}>
            <ThemedText variant="body" color={colors.charcoal} style={styles.browseText}>
              Browse the full practice library.
            </ThemedText>
            <PrimaryButton
              label="Explore Practices"
              variant="secondary"
              onPress={() => router.push('/practices')}
            />
          </View>
        </>
      )}
    </ScreenContainer>
  );
}

function lastPlayedTime(practice: Practice): number {
  const iso = practice.progress?.lastPlayedAt;
  if (!iso) return 0;
  const time = new Date(iso).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function completedTime(practice: Practice): number {
  const iso = practice.progress?.completedAt;
  if (!iso) return 0;
  const time = new Date(iso).getTime();
  return Number.isNaN(time) ? 0 : time;
}

const styles = StyleSheet.create({
  eyebrow: {
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  heading: {
    marginBottom: spacing.sm,
  },
  subtitle: {
    marginBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    marginBottom: spacing.md,
  },
  emptyTitle: {
    marginBottom: spacing.xs,
  },
  item: {
    marginBottom: spacing.xs,
  },
  itemLabel: {
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  browseSection: {
    marginBottom: spacing.xl,
  },
  browseText: {
    marginBottom: spacing.md,
  },
});
