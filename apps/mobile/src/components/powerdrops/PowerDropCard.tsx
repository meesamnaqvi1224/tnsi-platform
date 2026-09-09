import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Card } from '@/components/Card';
import { ThemedText } from '@/components/ThemedText';
import { PowerDropThumbnail } from './PowerDropThumbnail';
import { colors, spacing } from '@/theme';
import type { PowerDropSummary } from '@/api/types';

interface PowerDropCardProps {
  powerDrop: PowerDropSummary;
}

/** One library entry: artwork, title, focus, short description. No duration/streak/popularity - only real fields. */
export function PowerDropCard({ powerDrop }: PowerDropCardProps) {
  const router = useRouter();
  const title = powerDrop.title.trim();

  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: '/practices/powerdrops/[slug]', params: { slug: powerDrop.slug } })
      }
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${powerDrop.focus}`}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <Card style={styles.card}>
        <PowerDropThumbnail
          title={title}
          cardImage={powerDrop.cardImage}
          height={140}
          style={styles.thumbnail}
        />
        <ThemedText variant="heading" style={styles.title}>
          {title}
        </ThemedText>
        <ThemedText
          variant="body"
          color={colors.charcoal}
          numberOfLines={2}
          style={styles.description}
        >
          {powerDrop.description}
        </ThemedText>
        <View style={styles.metaRow}>
          <ThemedText variant="caption" color={colors.bronze}>
            {powerDrop.focus}
          </ThemedText>
          {powerDrop.category ? (
            <ThemedText variant="caption" color={colors.charcoal}>
              {powerDrop.category}
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
