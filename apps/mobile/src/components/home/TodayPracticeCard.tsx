import { Image, StyleSheet, View } from 'react-native';
import { Card } from '@/components/Card';
import { ThemedText } from '@/components/ThemedText';
import { capitalize, formatDuration } from '@/lib/format';
import { colors, radius, spacing } from '@/theme';
import type { TodayPractice } from '@/api/types';

interface TodayPracticeCardProps {
  practice: TodayPractice | null;
}

/**
 * Renders exactly what GET /api/v1/today returned - no fabricated
 * metadata, no CTA into a practice player/detail route (neither exists
 * yet; that's Phase 3).
 */
export function TodayPracticeCard({ practice }: TodayPracticeCardProps) {
  return (
    <Card style={styles.card}>
      <ThemedText variant="label" color={colors.bronze} style={styles.label}>
        Today&apos;s Practice
      </ThemedText>

      {practice ? (
        <View>
          {practice.thumbnailUrl ? (
            <Image
              source={{ uri: practice.thumbnailUrl }}
              style={styles.thumbnail}
              accessibilityIgnoresInvertColors
            />
          ) : null}
          <ThemedText variant="heading">{practice.title.trim()}</ThemedText>
          <ThemedText variant="caption" color={colors.charcoal} style={styles.meta}>
            {capitalize(practice.contentType)}
            {practice.durationSeconds ? ` · ${formatDuration(practice.durationSeconds)}` : ''}
          </ThemedText>
          {practice.description ? (
            <ThemedText variant="body" style={styles.description}>
              {practice.description}
            </ThemedText>
          ) : null}
        </View>
      ) : (
        <ThemedText variant="body" color={colors.charcoal}>
          No practice is available today.
        </ThemedText>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.lg,
  },
  label: {
    textTransform: 'uppercase',
    marginBottom: spacing.md,
  },
  thumbnail: {
    width: '100%',
    height: 160,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    backgroundColor: colors.creamMuted,
  },
  meta: {
    marginTop: spacing.xs,
  },
  description: {
    marginTop: spacing.sm,
  },
});
