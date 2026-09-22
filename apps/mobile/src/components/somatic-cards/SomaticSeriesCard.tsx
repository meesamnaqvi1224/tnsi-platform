import { Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Card } from '@/components/Card';
import { ThemedText } from '@/components/ThemedText';
import { colors, spacing } from '@/theme';
import type { SomaticSeriesListItem } from '@/api/types';

interface SomaticSeriesCardProps {
  series: SomaticSeriesListItem;
}

/**
 * One Series library entry: number, title, description, core question -
 * only fields the API actually returned, nothing fabricated (no card
 * count/benefit/therapeutic claim - the list endpoint doesn't return a
 * card count; see docs/TNSI_Somatic_Card_Read_API_v1.md §5). Mirrors
 * PowerDropCard's shape.
 */
export function SomaticSeriesCard({ series }: SomaticSeriesCardProps) {
  const router = useRouter();
  const title = series.title.trim();

  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: '/practices/somatic-cards/[seriesSlug]',
          params: { seriesSlug: series.slug },
        })
      }
      accessibilityRole="button"
      accessibilityLabel={`Series ${series.seriesNumber}, ${title}`}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <Card style={styles.card}>
        <ThemedText variant="label" color={colors.bronze} style={styles.eyebrow}>
          SERIES {series.seriesNumber}
        </ThemedText>
        <ThemedText variant="heading" style={styles.title}>
          {title}
        </ThemedText>
        {series.description ? (
          <ThemedText
            variant="body"
            color={colors.charcoal}
            numberOfLines={3}
            style={styles.description}
          >
            {series.description}
          </ThemedText>
        ) : null}
        {series.coreQuestion ? (
          <ThemedText
            variant="body"
            color={colors.navy}
            numberOfLines={2}
            style={styles.coreQuestion}
          >
            {series.coreQuestion}
          </ThemedText>
        ) : null}
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
  eyebrow: {
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  title: {
    marginBottom: spacing.sm,
  },
  description: {
    marginBottom: spacing.xs,
  },
  coreQuestion: {
    fontStyle: 'italic',
  },
});
