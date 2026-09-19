import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Card } from '@/components/Card';
import { ThemedText } from '@/components/ThemedText';
import { capitalize, formatDuration } from '@/lib/format';
import { colors, spacing } from '@/theme';
import type { PostPracticeResponse, PracticeHistoryEntry } from '@/api/types';

const RESPONSE_LABELS: Record<PostPracticeResponse, string> = {
  DIFFERENT: 'I feel different',
  SAME: 'I feel the same',
  NOT_SURE: "I'm not sure yet",
};

/** "2026-09-16T..." -> "Today" / "Yesterday" / "16 September". Local to this screen, same two-special-cases approach as the web history page. */
function formatSessionDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
  const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (startOfDay.getTime() === startOfToday.getTime()) return 'Today';
  if (startOfDay.getTime() === startOfYesterday.getTime()) return 'Yesterday';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
}

interface PracticeHistoryRowProps {
  entry: PracticeHistoryEntry;
}

/** One completed session - date, practice title/type, and the reflection (if any), verbatim. Taps through to the practice's own detail screen, same as every other practice reference in this app. */
export function PracticeHistoryRow({ entry }: PracticeHistoryRowProps) {
  const router = useRouter();
  const meta = [capitalize(entry.contentType)];
  if (entry.durationSeconds) meta.push(formatDuration(entry.durationSeconds));
  if (entry.category) meta.push(entry.category);

  const reflectionText =
    entry.reflection?.reflection ??
    (entry.reflection?.response ? RESPONSE_LABELS[entry.reflection.response] : null);

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/practices/[id]', params: { id: entry.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${entry.title}, completed ${formatSessionDate(entry.completedAt)}`}
    >
      <Card style={styles.card}>
        <ThemedText variant="label" color={colors.bronze} style={styles.date}>
          {formatSessionDate(entry.completedAt).toUpperCase()}
        </ThemedText>
        <ThemedText variant="heading" style={styles.title}>
          {entry.title}
        </ThemedText>
        <ThemedText variant="caption" color={colors.charcoal}>
          Completed · {meta.join(' · ')}
        </ThemedText>
        {reflectionText ? (
          <View style={styles.reflectionRow}>
            <ThemedText variant="body" color={colors.charcoal} style={styles.reflectionText}>
              &ldquo;{reflectionText}&rdquo;
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
  date: {
    marginBottom: spacing.xs,
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
