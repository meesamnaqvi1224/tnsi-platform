import { Linking, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Card } from '@/components/Card';
import { ThemedText } from '@/components/ThemedText';
import { colors, spacing } from '@/theme';
import { env } from '@/lib/env';

/** The closing statement card from Caroline's own reference mockup - real
 * copy she supplied, not invented. Taps through to the Institute's own
 * site (the same "link out" pattern as Life Beyond Trauma/Connect) rather
 * than claiming a destination that doesn't exist natively yet. */
export function ClosingStatementCard() {
  return (
    <Animated.View entering={FadeInDown.duration(450).delay(480)} style={styles.section}>
      <Pressable
        onPress={() => Linking.openURL(env.apiBaseUrl)}
        accessibilityRole="link"
        accessibilityLabel="Visit The Nervous System Institute"
      >
        <Card variant="inverted" style={styles.card}>
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
        </Card>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.xl,
  },
  card: {
    paddingVertical: spacing.xl,
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
