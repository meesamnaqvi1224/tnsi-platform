import { Image, Linking, Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ThemedText } from '@/components/ThemedText';
import { colors, imageHeight, imageOverlayGradient, radius, spacing } from '@/theme';
import { env } from '@/lib/env';

const closingImage = require('../../../assets/images/closing-hills.jpg');

/**
 * The closing statement, rebuilt as an image-led full-width photo (per
 * the approved mockup) rather than a flat navy card - the copy, tap
 * target and destination are unchanged, only the surface is now a
 * photograph with the shared `imageOverlayGradient` scrim instead of a
 * solid fill. Photo: calm, open hills at golden hour - chosen deliberately
 * distinct from the forest imagery used elsewhere on Home, so Home's
 * single closing editorial beat doesn't repeat a mood already used twice
 * above it. Source: Yurei (Yann A) on Unsplash
 * (unsplash.com/photos/golden-sunlight-illuminates-rolling-green-hills-at-dawn-dupbO-bGujY),
 * Unsplash License (free, no attribution required) - downloaded via
 * Unsplash's CDN, not hotlinked.
 */
export function ClosingStatementCard() {
  return (
    <Animated.View entering={FadeInDown.duration(450).delay(480)} style={styles.section}>
      <Pressable
        onPress={() => Linking.openURL(env.apiBaseUrl)}
        accessibilityRole="link"
        accessibilityLabel="Visit The Nervous System Institute"
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      >
        <Image source={closingImage} style={styles.image} />
        <LinearGradient colors={imageOverlayGradient} style={StyleSheet.absoluteFill} />
        <View style={styles.content}>
          <ThemedText variant="heading" color={colors.cream} style={styles.statement}>
            You&apos;re not just managing.{'\n'}You&apos;re learning a new way to be.
          </ThemedText>
          <View style={styles.footerRow}>
            <ThemedText variant="caption" color={colors.bronzeMuted} style={styles.brand}>
              THE NERVOUS SYSTEM INSTITUTE
            </ThemedText>
            <ThemedText variant="label" color={colors.cream}>
              →
            </ThemedText>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.xl,
  },
  pressed: {
    opacity: 0.92,
  },
  card: {
    height: imageHeight.statement,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: spacing.xl,
  },
  statement: {
    marginBottom: spacing.lg,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brand: {
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
