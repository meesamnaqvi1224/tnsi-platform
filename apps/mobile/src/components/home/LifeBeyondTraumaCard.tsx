import { Image, Linking, Pressable, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { colors, spacing } from '@/theme';
import { env } from '@/lib/env';

const logo = require('../../../assets/images/life-beyond-trauma-logo.png');

/** A quiet entry point into Caroline's flagship pathway - content lives on
 * the website, not duplicated natively, so this always hands off there
 * rather than attempting to represent the programme in-app. Deliberately
 * a compact list row (not a full navy-filled feature card) - Home is a
 * member's personal space, not a landing page, so this and
 * BookConsultationCard stay visually quiet compared to check-in/practice/
 * progress above them. */
export function LifeBeyondTraumaCard() {
  return (
    <Pressable
      onPress={() => Linking.openURL(`${env.apiBaseUrl}/programs/life-beyond-trauma`)}
      accessibilityRole="button"
      accessibilityLabel="Life Beyond Trauma - opens the Institute's website"
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Image source={logo} style={styles.logo} resizeMode="contain" />
      <ThemedText variant="body" color={colors.charcoal} style={styles.textColumn}>
        Life Beyond Trauma™ — the Institute's flagship pathway.
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  logo: {
    width: 36,
    height: 24,
  },
  textColumn: {
    flex: 1,
  },
});
