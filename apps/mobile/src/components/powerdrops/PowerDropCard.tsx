import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { PowerDropArtwork } from './PowerDropArtwork';
import { colors, spacing } from '@/theme';
import type { PowerDropSummary } from '@/api/types';

interface PowerDropCardProps {
  powerDrop: PowerDropSummary;
}

/**
 * One library entry: the standalone visual, whole, then category and title.
 * No card chrome — the artwork sits directly on the page with a hairline
 * rule beneath, like the Core Series list. No duration/streak/popularity —
 * only real fields. (Kept under its original name so its callers are
 * unchanged.)
 */
export function PowerDropCard({ powerDrop }: PowerDropCardProps) {
  const router = useRouter();
  const title = powerDrop.title.trim();
  // Decided by the server (see PowerDropSummary.locked). Still tappable - the detail screen explains.
  const locked = powerDrop.locked === true;
  const eyebrow = powerDrop.category ?? powerDrop.focus;
  // The Purpose is worth showing when it adds something beyond the category.
  const purpose = powerDrop.focus !== eyebrow ? powerDrop.focus : null;
  const meta = [purpose, locked ? 'Members' : null].filter(Boolean).join(' · ');

  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: '/practices/powerdrops/[slug]', params: { slug: powerDrop.slug } })
      }
      accessibilityRole="button"
      accessibilityLabel={
        locked
          ? `${title}, ${powerDrop.focus}, members only. Opens membership details`
          : `${title}, ${powerDrop.focus}`
      }
      style={({ pressed }) => [styles.item, pressed && styles.pressed]}
    >
      <PowerDropArtwork
        title={title}
        cardImage={powerDrop.cardImage}
        variant="library"
        style={styles.artwork}
      />
      <View>
        <ThemedText variant="label" color={colors.bronze} style={styles.eyebrow}>
          {eyebrow}
        </ThemedText>
        <ThemedText variant="heading" style={styles.title}>
          {title}
        </ThemedText>
        {meta ? (
          <ThemedText variant="caption" color={colors.charcoal} style={styles.meta}>
            {meta}
          </ThemedText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: {
    paddingBottom: spacing.lg,
    marginBottom: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  pressed: {
    opacity: 0.85,
  },
  artwork: {
    marginBottom: spacing.md,
  },
  eyebrow: {
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  title: {
    marginBottom: spacing.xs,
  },
  meta: {
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});
