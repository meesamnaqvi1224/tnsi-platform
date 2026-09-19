import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Card } from '@/components/Card';
import { ThemedText } from '@/components/ThemedText';
import { capacityOptionLabel } from '@/components/check-in/CapacityOptionList';
import { capitalize, formatDuration } from '@/lib/format';
import { colors, spacing } from '@/theme';
import type { JourneyEntry, PostPracticeResponse } from '@/api/types';

const RESPONSE_LABELS: Record<PostPracticeResponse, string> = {
  DIFFERENT: 'I feel different',
  SAME: 'I feel the same',
  NOT_SURE: "I'm not sure yet",
};

/** A short preview of longer text - full text is still saved, this only shortens what's shown inline. */
function truncate(text: string, maxLength = 140): string {
  if (text.length <= maxLength) return text;
  const slice = text.slice(0, maxLength);
  const lastSpace = slice.lastIndexOf(' ');
  const boundary = lastSpace > maxLength * 0.6 ? lastSpace : maxLength;
  return `${slice.slice(0, boundary).trimEnd()}…`;
}

interface JourneyEntryRowProps {
  entry: JourneyEntry;
}

/**
 * One journey entry - a completed practice session or a daily check-in -
 * mirrors PracticeHistoryRow's card shape so the two read as the same
 * kind of timeline. A check-in row is purely factual (mirrors
 * CheckInCard's own `moodScore === capacityScore` check for whether a
 * plain-language label applies): never a score, never an interpretation.
 */
export function JourneyEntryRow({ entry }: JourneyEntryRowProps) {
  const router = useRouter();

  if (entry.kind === 'check_in') {
    const label =
      entry.moodScore === entry.capacityScore ? capacityOptionLabel(entry.capacityScore) : null;
    return (
      <Card style={styles.card}>
        <ThemedText variant="heading" style={styles.title}>
          Daily Check-In
        </ThemedText>
        <ThemedText variant="caption" color={colors.charcoal}>
          {label ?? `Mood ${entry.moodScore} of 5 · Capacity ${entry.capacityScore} of 5`}
        </ThemedText>
        {entry.notes ? (
          <View style={styles.reflectionRow}>
            <ThemedText variant="body" color={colors.charcoal} style={styles.reflectionText}>
              &ldquo;{truncate(entry.notes)}&rdquo;
            </ThemedText>
          </View>
        ) : null}
      </Card>
    );
  }

  const meta = [capitalize(entry.contentType)];
  if (entry.durationSeconds) meta.push(formatDuration(entry.durationSeconds));
  if (entry.category) meta.push(entry.category);

  const reflectionText =
    entry.reflection?.reflection ??
    (entry.reflection?.response ? RESPONSE_LABELS[entry.reflection.response] : null);

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/practices/[id]', params: { id: entry.practiceId } })}
      accessibilityRole="button"
      accessibilityLabel={`${entry.title}, completed`}
    >
      <Card style={styles.card}>
        <ThemedText variant="heading" style={styles.title}>
          {entry.title}
        </ThemedText>
        <ThemedText variant="caption" color={colors.charcoal}>
          Completed · {meta.join(' · ')}
        </ThemedText>
        {reflectionText ? (
          <View style={styles.reflectionRow}>
            <ThemedText variant="body" color={colors.charcoal} style={styles.reflectionText}>
              &ldquo;{truncate(reflectionText)}&rdquo;
            </ThemedText>
          </View>
        ) : null}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  title: {
    marginBottom: spacing.xs,
  },
  reflectionRow: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  reflectionText: {
    fontStyle: 'italic',
  },
});
