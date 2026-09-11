import { Image, ImageBackground, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/ThemedText';
import { colors, spacing } from '@/theme';

const logoMark = require('../../../assets/images/logo-mark.png');
const heroImage = require('../../../assets/images/home-hero.jpg');

interface WelcomeHeaderProps {
  firstName?: string | null;
}

/** "Tuesday, 9 September" - the real current date, for orientation only (never a fabricated read on how the member is doing). */
function todayLabel(): string {
  return new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

/** "Good morning"/"Good afternoon"/"Good evening" from the device's own clock. */
function timeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Restrained greeting - first name and today's date only, no streaks/stats/
 * badges. The photo behind it is a placeholder (not real TNSI photography,
 * which doesn't exist yet) explicitly approved for now to give Home visual
 * warmth instead of a flat color block - swap `assets/images/home-hero.jpg`
 * for real brand photography whenever Caroline supplies it. The tagline is
 * drawn directly from Caroline's own reference mockup, not invented copy.
 * The gradient exists purely so text stays legible over the image.
 */
export function WelcomeHeader({ firstName }: WelcomeHeaderProps) {
  return (
    <View style={styles.bleed}>
      <ImageBackground source={heroImage} style={styles.hero} imageStyle={styles.heroImage}>
        <LinearGradient
          colors={['rgba(11,21,38,0.05)', 'rgba(11,21,38,0.55)', 'rgba(11,21,38,0.92)']}
          style={styles.gradient}
        >
          <View style={styles.brandRow}>
            <Image source={logoMark} style={styles.logo} resizeMode="contain" />
            <ThemedText variant="caption" color={colors.cream} style={styles.brandName}>
              THE NERVOUS SYSTEM INSTITUTE
            </ThemedText>
          </View>

          <ThemedText variant="label" color={colors.bronzeMuted} style={styles.date}>
            {todayLabel()}
          </ThemedText>
          <ThemedText variant="display" color={colors.cream} style={styles.heading}>
            {firstName ? `${timeOfDayGreeting()}, ${firstName}.` : `${timeOfDayGreeting()}.`}
          </ThemedText>
          <View style={styles.taglineRule} />
          <ThemedText variant="body" color={colors.creamMuted} style={styles.tagline}>
            A calmer you creates a more human future.
          </ThemedText>
        </LinearGradient>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  bleed: {
    marginHorizontal: -spacing.lg,
    marginTop: -spacing.lg,
    marginBottom: spacing.xl,
  },
  hero: {
    width: '100%',
    minHeight: 320,
  },
  heroImage: {
    resizeMode: 'cover',
  },
  gradient: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xl,
  },
  logo: {
    width: 22,
    height: 19,
  },
  brandName: {
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  date: {
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  heading: {
    marginBottom: spacing.md,
  },
  taglineRule: {
    width: 32,
    height: 2,
    backgroundColor: colors.bronze,
    marginBottom: spacing.sm,
  },
  tagline: {
    maxWidth: 280,
  },
});
