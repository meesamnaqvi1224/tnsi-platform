import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { fontFamily, spacing } from '@/theme';
import { home } from './homeTheme';

const heroImage = require('../../../assets/images/home-hero.jpg');

interface WelcomeHeaderProps {
  firstName?: string | null;
}

/**
 * Home's masthead: the TNSI name centred above a short bronze rule, the profile button at the right,
 * then a welcome line and the Institute's own statement beside a photograph. The photograph is an
 * existing approved asset (it is swapped for real brand photography later); the greeting still uses
 * the member's first name.
 */
export function WelcomeHeader({ firstName }: WelcomeHeaderProps) {
  const router = useRouter();
  const name = firstName?.trim();

  return (
    <View style={styles.wrap}>
      <View style={styles.brandRow}>
        <View style={styles.side} />
        <View style={styles.brand} accessibilityRole="header">
          <ThemedText variant="display" color={home.navy} style={styles.wordmark}>
            TNSI
          </ThemedText>
          <ThemedText variant="caption" color={home.navy} style={styles.tagline}>
            THE NERVOUS SYSTEM INSTITUTE
          </ThemedText>
          <View style={styles.rule} />
        </View>
        <View style={styles.side}>
          <Pressable
            onPress={() => router.push('/profile')}
            accessibilityRole="button"
            accessibilityLabel="Profile"
            hitSlop={6}
            style={styles.profile}
          >
            <Ionicons name="person-outline" size={22} color={home.navy} />
          </Pressable>
        </View>
      </View>

      <View style={styles.hero}>
        <View style={styles.heroText}>
          <ThemedText variant="heading" color={home.bronze} style={styles.welcome}>
            {name ? `Welcome back, ${name}` : 'Welcome back'}
          </ThemedText>
          <ThemedText variant="display" color={home.navy} style={styles.statement}>
            A space to regulate, restore and reconnect.
          </ThemedText>
          <View style={styles.statementRule} />
        </View>
        <Image source={heroImage} style={styles.photo} accessibilityIgnoresInvertColors />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.lg,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  side: {
    width: 48,
    alignItems: 'flex-end',
  },
  brand: {
    flex: 1,
    alignItems: 'center',
  },
  wordmark: {
    fontSize: 38,
    lineHeight: 42,
    letterSpacing: 1,
    fontFamily: fontFamily.serif,
  },
  tagline: {
    letterSpacing: 2.2,
    fontSize: 9,
    marginTop: 2,
  },
  rule: {
    width: 36,
    height: 2,
    backgroundColor: home.bronze,
    marginTop: spacing.sm,
  },
  profile: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: home.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  heroText: {
    flex: 1,
    justifyContent: 'center',
  },
  welcome: {
    fontStyle: 'italic',
    fontSize: 17,
    marginBottom: spacing.sm,
  },
  statement: {
    fontSize: 27,
    lineHeight: 32,
  },
  statementRule: {
    width: 40,
    height: 2,
    backgroundColor: home.bronze,
    marginTop: spacing.md,
  },
  photo: {
    width: '42%',
    height: 200,
    borderRadius: 14,
    resizeMode: 'cover',
  },
});
