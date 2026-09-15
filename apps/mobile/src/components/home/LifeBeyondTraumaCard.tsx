import { Image, Linking, Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { colors, radius, spacing } from '@/theme';
import { env } from '@/lib/env';

/** Cropped from the same photo already sourced and licensed for the web
 * app's own Life Beyond Trauma page (apps/web/public/images/programs/life-beyond-trauma/hero.webp) -
 * reusing that existing, already-documented asset rather than sourcing a
 * new one for the same concept. Source: Michael Held on Unsplash
 * (unsplash.com/photos/green-trees-and-brown-dried-leaves-during-daytime-6fRHGqbp1_4),
 * Unsplash License. */
const thumbnail = require('../../../assets/images/institute-life-beyond-trauma.jpg');

/** A quiet entry point into Caroline's flagship pathway - content lives on
 * the website, not duplicated natively, so this always hands off there
 * rather than attempting to represent the programme in-app. A compact
 * list row (not a full navy-filled feature card) - Home is a member's
 * personal space, not a landing page, so this and BookConsultationCard
 * stay visually quiet compared to check-in/practice/progress above them.
 * The small photo thumbnail (added per the reference mockup) replaces
 * what was previously just the wordmark logo - the logo alone didn't
 * carry any of the pathway's own visual identity. */
export function LifeBeyondTraumaCard() {
  return (
    <Pressable
      onPress={() => Linking.openURL(`${env.apiBaseUrl}/programs/life-beyond-trauma`)}
      accessibilityRole="button"
      accessibilityLabel="Life Beyond Trauma - opens the Institute's website"
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Image source={thumbnail} style={styles.thumbnail} />
      <View style={styles.textColumn}>
        <ThemedText variant="body" color={colors.charcoal}>
          Life Beyond Trauma™ — the Institute's flagship pathway.
        </ThemedText>
      </View>
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
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
  },
  textColumn: {
    flex: 1,
  },
});
