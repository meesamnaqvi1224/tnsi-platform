import { Image, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Card } from '@/components/Card';
import { ThemedText } from '@/components/ThemedText';
import { capitalize, formatDuration } from '@/lib/format';
import { colors, radius, spacing } from '@/theme';
import type { Practice } from '@/api/types';

interface TodayPracticeCardProps {
  practice: Practice | null;
}

/**
 * Renders exactly what GET /api/v1/today returned - no fabricated
 * metadata. Tappable through to the Phase 3 practice detail route when a
 * real practice is present; Home's own data contract is unchanged (still
 * just `state.data.practices[0]`), this only adds navigation.
 */
export function TodayPracticeCard({ practice }: TodayPracticeCardProps) {
  const router = useRouter();

  return (
    <Card style={styles.card}>
      <ThemedText variant="label" color={colors.bronze} style={styles.label}>
        Today&apos;s Practice
      </ThemedText>

      {practice ? (
        <Pressable
          onPress={() => router.push({ pathname: '/practices/[id]', params: { id: practice.id } })}
          accessibilityRole="button"
          accessibilityLabel={`Open ${practice.title.trim()}, ${capitalize(practice.contentType)}${practice.durationSeconds ? `, ${formatDuration(practice.durationSeconds)}` : ''}`}
        >
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
        </Pressable>
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
