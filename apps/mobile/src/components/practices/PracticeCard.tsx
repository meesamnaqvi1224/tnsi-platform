import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Card } from '@/components/Card';
import { ThemedText } from '@/components/ThemedText';
import { PracticeThumbnail } from './PracticeThumbnail';
import { capitalize, formatDuration } from '@/lib/format';
import { colors, spacing } from '@/theme';
import type { Practice } from '@/api/types';

interface PracticeCardProps {
  practice: Practice;
}

/**
 * One library entry: title, short description, content type · duration,
 * category. No popularity/ratings/streaks/"trending" - only real fields.
 */
export function PracticeCard({ practice }: PracticeCardProps) {
  const router = useRouter();
  const title = practice.title.trim();
  const meta = [capitalize(practice.contentType)];
  if (practice.durationSeconds) meta.push(formatDuration(practice.durationSeconds));

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/practices/[id]', params: { id: practice.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${meta.join(', ')}`}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <Card style={styles.card}>
        <PracticeThumbnail
          thumbnailUrl={practice.thumbnailUrl}
          contentType={practice.contentType}
          height={140}
          style={styles.thumbnail}
        />
        <ThemedText variant="heading" style={styles.title}>
          {title}
        </ThemedText>
        {practice.description ? (
          <ThemedText
            variant="body"
            color={colors.charcoal}
            numberOfLines={2}
            style={styles.description}
          >
            {practice.description}
          </ThemedText>
        ) : null}
        <View style={styles.metaRow}>
          <ThemedText variant="caption" color={colors.charcoal}>
            {meta.join(' · ')}
          </ThemedText>
          {practice.category ? (
            <ThemedText variant="caption" color={colors.bronze}>
              {practice.category}
            </ThemedText>
          ) : null}
        </View>
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
  thumbnail: {
    marginBottom: spacing.md,
  },
  title: {
    marginBottom: spacing.xs,
  },
  description: {
    marginBottom: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
