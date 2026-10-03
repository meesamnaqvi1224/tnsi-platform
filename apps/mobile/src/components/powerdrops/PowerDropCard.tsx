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
  // Decided by the server (see PowerDropSummary.locked): in the paid library
  // and not open to this member. Its card artwork is withheld, so there is
  // nothing to open - tapping explains membership instead.
  const locked = powerDrop.locked === true;

  return (
    <Pressable
      onPress={() =>
        locked
          ? router.push('/profile/membership')
          : router.push({
              pathname: '/practices/powerdrops/[slug]',
              params: { slug: powerDrop.slug },
            })
      }
      accessibilityRole="button"
      accessibilityLabel={
        locked
          ? `${title}, ${powerDrop.focus}, members only. Opens membership details`
          : `${title}, ${powerDrop.focus}`
      }
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
            {locked ? `${powerDrop.focus} · Members` : powerDrop.focus}
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
