import { Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Card } from '@/components/Card';
import { ThemedText } from '@/components/ThemedText';
import { capitalize, formatDuration } from '@/lib/format';
import { colors, spacing } from '@/theme';
import type { Practice } from '@/api/types';

interface ContinuePractiseCardProps {
  practice: Practice;
}

/**
 * A single, real "pick up where you left off" entry - the practice the
 * member most recently played that isn't finished yet. No progress bar,
 * no percentage, no streak: just naming what it is and letting them
 * return to it. Home decides *whether* to show this (see (tabs)/index.tsx);
 * this component only renders a real practice it's given.
 */
export function ContinuePractiseCard({ practice }: ContinuePractiseCardProps) {
  const router = useRouter();
  const title = practice.title.trim();
  const meta = [capitalize(practice.contentType)];
  if (practice.durationSeconds) meta.push(formatDuration(practice.durationSeconds));

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/practices/[id]', params: { id: practice.id } })}
      accessibilityRole="button"
      accessibilityLabel={`Continue ${title}, ${meta.join(', ')}`}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <Card style={styles.card}>
        <ThemedText variant="label" color={colors.bronze} style={styles.label}>
          Continue
        </ThemedText>
        <ThemedText variant="heading">{title}</ThemedText>
        <ThemedText variant="caption" color={colors.charcoal} style={styles.meta}>
          {meta.join(' · ')}
        </ThemedText>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.85,
  },
  card: {
    marginBottom: spacing.lg,
  },
  label: {
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  meta: {
    marginTop: spacing.xs,
  },
});
