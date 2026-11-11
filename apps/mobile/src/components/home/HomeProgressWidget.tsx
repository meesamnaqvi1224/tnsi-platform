import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { relativeDay } from '@/lib/relative-day';
import { suggestedNextStep } from '@/lib/suggested-next-step';
import { spacing } from '@/theme';
import { home, homeCardStyle } from './homeTheme';
import type { TodayResponse } from '@/api/types';

/**
 * A compact record of what the member has actually done: today's check-in, the latest completed
 * practice, how many practices they have completed, and a suggested next step when there is one. Counts and
 * dates only - no score, streak or claim about what any of it means. The detail lives in My Progress.
 */
export function HomeProgressWidget({
  data,
  recommended,
  alternative = null,
}: {
  data: TodayResponse;
  recommended: TodayResponse['todayPractice'];
  alternative?: TodayResponse['alternativePractice'];
}) {
  const router = useRouter();
  const summary = data.progressSummary;
  const rows: { label: string; value: string }[] = [
    { label: "Today's check-in", value: data.checkIn ? 'Done' : 'Not yet' },
  ];
  if (summary) {
    rows.push({
      label: 'Last completed practice',
      value: summary.lastCompleted
        ? `${summary.lastCompleted.title.trim()} · ${relativeDay(summary.lastCompleted.completedAt)}`
        : 'None yet',
    });
    rows.push({ label: 'Practices completed', value: String(summary.completedSessions) });
  }
  // Only while there is a next step to suggest (see suggestedNextStep): once today's recommendation is
  // done and there is nothing else to offer, the row is left out rather than repeating it.
  const next = suggestedNextStep({
    recommended,
    alternative,
    lastCompleted: summary?.lastCompleted,
  });
  if (next) rows.push({ label: 'Suggested next step', value: next.title.trim() });

  return (
    <View style={styles.card} accessibilityLabel="Your progress">
      <ThemedText variant="heading" color={home.navy} style={styles.title}>
        Your progress
      </ThemedText>
      {rows.map((row) => (
        <View key={row.label} style={styles.row}>
          <ThemedText variant="caption" color={home.ink} style={styles.label}>
            {row.label}
          </ThemedText>
          <ThemedText variant="body" color={home.navy} style={styles.value} numberOfLines={2}>
            {row.value}
          </ThemedText>
        </View>
      ))}
      <PrimaryButton
        label="View My Progress"
        variant="secondary"
        onPress={() => router.push('/my-learning')}
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...homeCardStyle,
    backgroundColor: home.page,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  title: { marginBottom: spacing.md },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: home.border,
  },
  label: { flexShrink: 0, maxWidth: '45%' },
  value: { flex: 1, textAlign: 'right' },
  button: { marginTop: spacing.md },
});
