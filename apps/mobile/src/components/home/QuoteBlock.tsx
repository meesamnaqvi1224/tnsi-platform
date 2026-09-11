import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ThemedText } from '@/components/ThemedText';
import { colors, spacing } from '@/theme';

/** A quiet editorial quote, drawn directly from Caroline's own reference
 * mockup - not invented copy. */
export function QuoteBlock() {
  return (
    <Animated.View entering={FadeInDown.duration(450).delay(440)} style={styles.container}>
      <View style={styles.rule} />
      <ThemedText variant="heading" style={styles.quote}>
        Knowledge becomes transformation when it is put into practice.
      </ThemedText>
      <ThemedText variant="label" color={colors.bronze} style={styles.attribution}>
        — THE NERVOUS SYSTEM INSTITUTE
      </ThemedText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xl,
    alignItems: 'flex-start',
  },
  rule: {
    width: 32,
    height: 2,
    backgroundColor: colors.bronze,
    marginBottom: spacing.md,
  },
  quote: {
    fontStyle: 'italic',
    marginBottom: spacing.sm,
  },
  attribution: {
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
