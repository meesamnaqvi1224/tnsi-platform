import { Image, Linking, Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { colors, radius, spacing } from '@/theme';
import { env } from '@/lib/env';

/** Cropped from the same photo already sourced and licensed for the web
 * app's About page (apps/web/public/images/about/mission-editorial.webp) -
 * a warm consultation room with two facing armchairs, which is exactly
 * the mood this row needs and already existed rather than requiring new
 * sourcing. Source: unsplash.com (see the web app's own image manifest,
 * docs/image-manifest.md, for full photographer/license detail on the
 * original asset), Unsplash License. */
const thumbnail = require('../../../assets/images/institute-consultation.jpg');

/** A quiet hand-off to Caroline's own booking flow on the website - no
 * scheduling logic lives natively, same "link out, don't rebuild it"
 * pattern as Membership and Life Beyond Trauma. A compact list row, to
 * match LifeBeyondTraumaCard - see that file's comment for why. The photo
 * thumbnail (added per the reference mockup) replaces what was previously
 * a text-only row. */
export function BookConsultationCard() {
  return (
    <Pressable
      onPress={() => Linking.openURL(`${env.apiBaseUrl}/book-a-call`)}
      accessibilityRole="button"
      accessibilityLabel="Book a discovery call with Caroline - opens the Institute's website"
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Image source={thumbnail} style={styles.thumbnail} />
      <View style={styles.textColumn}>
        <ThemedText variant="body" color={colors.charcoal}>
          Book a one-on-one Discovery Call with Caroline.
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
