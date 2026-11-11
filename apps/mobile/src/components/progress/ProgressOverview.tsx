import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { practiceForToday } from '@/lib/check-in-day';
import { suggestedNextStep } from '@/lib/suggested-next-step';
import { linkHitSlop, linkTouchTarget, spacing } from '@/theme';
import { home, homeCardStyle } from '@/components/home/homeTheme';
import type { TodayResponse } from '@/api/types';

/**
 * The top of My Progress: how many practices the member has completed and, when there is one, a
 * suggested next step. Both come from the same GET /api/v1/today data Home's widget uses (completed
 * sessions, and the existing recommendation and alternative), so the two never disagree. Counts only -
 * no score, streak or claim about what any of it means. The suggestion appears only after a check-in
 * today and only while there is a next step to offer; it is a link, never a prompt to keep going.
 */
export function ProgressOverview({ data }: { data: TodayResponse }) {
  const router = useRouter();
  const summary = data.progressSummary;
  if (!summary) return null; // an older server: nothing truthful to show yet

  const next = suggestedNextStep({
    recommended: practiceForToday(data.checkIn, data.todayPractice),
    alternative: practiceForToday(data.checkIn, data.alternativePractice),
    lastCompleted: summary.lastCompleted,
  });

  return (
    <View style={styles.card} accessibilityLabel="Practice summary">
      <View style={styles.row}>
        <ThemedText variant="caption" color={home.ink}>
          Practices completed
        </ThemedText>
        <ThemedText variant="body" color={home.navy}>
          {summary.completedSessions}
        </ThemedText>
      </View>
      {next ? (
        <View style={[styles.row, styles.ruled]}>
          <ThemedText variant="caption" color={home.ink} style={styles.label}>
            Suggested next step
          </ThemedText>
          <Pressable
            onPress={() => router.push({ pathname: '/practices/[id]', params: { id: next.id } })}
            accessibilityRole="link"
            accessibilityLabel={`Suggested next step: ${next.title.trim()}`}
            hitSlop={linkHitSlop}
            style={[linkTouchTarget, styles.link]}
          >
            <ThemedText variant="body" color={home.bronze} numberOfLines={2} style={styles.value}>
              {next.title.trim()} →
            </ThemedText>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...homeCardStyle,
    backgroundColor: home.page,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  ruled: { borderTopWidth: 1, borderTopColor: home.border },
  label: { flexShrink: 0, maxWidth: '45%' },
  link: { flex: 1, alignItems: 'flex-end' },
  value: { textAlign: 'right' },
});
