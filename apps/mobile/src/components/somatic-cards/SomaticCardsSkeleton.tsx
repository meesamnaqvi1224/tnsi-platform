import { StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '@/theme';

/** Static placeholder blocks while a Somatic Card screen loads - no animation, matches PowerDropsSkeleton/PracticesSkeleton. */
export function SomaticCardsSkeleton() {
  return (
    <View accessibilityLabel="Loading Somatic Cards">
      <View style={styles.block} />
      <View style={styles.block} />
      <View style={styles.block} />
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    height: 180,
    borderRadius: radius.md,
    backgroundColor: colors.creamMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
});
