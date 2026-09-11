import { Linking, Pressable, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { colors, spacing } from '@/theme';
import { env } from '@/lib/env';

/** A quiet hand-off to Caroline's own booking flow on the website - no
 * scheduling logic lives natively, same "link out, don't rebuild it"
 * pattern as Membership and Life Beyond Trauma. A compact list row, to
 * match LifeBeyondTraumaCard - see that file's comment for why. */
export function BookConsultationCard() {
  return (
    <Pressable
      onPress={() => Linking.openURL(`${env.apiBaseUrl}/book-a-call`)}
      accessibilityRole="button"
      accessibilityLabel="Book a discovery call with Caroline - opens the Institute's website"
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <ThemedText variant="body" color={colors.charcoal} style={styles.textColumn}>
        Book a one-on-one Discovery Call with Caroline.
      </ThemedText>
      <ThemedText variant="label" color={colors.bronze}>
        →
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.7,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  textColumn: {
    flex: 1,
  },
});
