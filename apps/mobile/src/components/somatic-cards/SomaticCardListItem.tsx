import { Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Card } from '@/components/Card';
import { ThemedText } from '@/components/ThemedText';
import { SomaticImageBlock } from './SomaticImageBlock';
import { colors, spacing } from '@/theme';
import type { SomaticCardSummary } from '@/api/types';

interface SomaticCardListItemProps {
  card: SomaticCardSummary;
}

/**
 * One Card entry inside a Series detail's card list - number, title,
 * artwork thumbnail. Deliberately no completion/progress/lock indicator
 * and no "next card" framing: every Card is an equal entry point, the
 * Core Series is editorially ordered but progression is never mandatory
 * (per this milestone's explicit instruction).
 */
export function SomaticCardListItem({ card }: SomaticCardListItemProps) {
  const router = useRouter();
  const title = card.title.trim();

  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: '/practices/somatic-cards/card/[cardSlug]',
          params: { cardSlug: card.slug },
        })
      }
      accessibilityRole="button"
      accessibilityLabel={`Card ${card.cardNumber}, ${title}`}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <Card style={styles.card}>
        <SomaticImageBlock
          image={card.cardArtwork}
          fallbackLabel={title}
          aspectRatio={9 / 16}
          style={styles.artwork}
        />
        <ThemedText variant="label" color={colors.bronze} style={styles.eyebrow}>
          CARD {card.cardNumber}
        </ThemedText>
        <ThemedText variant="heading" style={styles.title}>
          {title}
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
  artwork: {
    marginBottom: spacing.md,
  },
  eyebrow: {
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  title: {
    marginBottom: 0,
  },
});
