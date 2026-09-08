import { StyleSheet, View } from 'react-native';
import { Card } from '@/components/Card';
import { ThemedText } from '@/components/ThemedText';
import { colors, spacing } from '@/theme';
import type { CheckInSummary } from '@/api/types';

/** "2026-06-12" -> "12 June 2026". Local to this screen - no other screen needs a day-level date yet. */
function formatCheckInDate(dateOnly: string): string {
  const date = new Date(`${dateOnly}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return dateOnly;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

interface CheckInEntryProps {
  checkIn: CheckInSummary;
}

/**
 * One recorded check-in: date, and the mood/capacity scores exactly as the
 * user recorded them - never labeled "good"/"low"/"improved", just the raw
 * 1-5 values. The note, if present, renders verbatim outside the
 * accessibility group below so it stays independently readable by a screen
 * reader rather than being folded into (and potentially skipped as part of)
 * the summary label.
 */
export function CheckInEntry({ checkIn }: CheckInEntryProps) {
  const dateLabel = formatCheckInDate(checkIn.completedDate);

  return (
    <Card style={styles.card}>
      <View
        accessible
        accessibilityLabel={`Check-in for ${dateLabel}. Mood ${checkIn.moodScore} out of 5. Capacity ${checkIn.capacityScore} out of 5.`}
      >
        <ThemedText variant="heading" style={styles.date}>
          {dateLabel}
        </ThemedText>
        <View style={styles.scoreRow}>
          <ThemedText variant="body" color={colors.charcoal}>
            Mood
          </ThemedText>
          <ThemedText variant="body">{checkIn.moodScore} / 5</ThemedText>
        </View>
        <View style={styles.scoreRow}>
          <ThemedText variant="body" color={colors.charcoal}>
            Capacity
          </ThemedText>
          <ThemedText variant="body">{checkIn.capacityScore} / 5</ThemedText>
        </View>
      </View>

      {checkIn.notes ? (
        <ThemedText variant="body" color={colors.charcoal} style={styles.notes}>
          {checkIn.notes}
        </ThemedText>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  date: {
    marginBottom: spacing.sm,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  notes: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
