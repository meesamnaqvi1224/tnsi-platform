import { StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '@/theme';

/** Static placeholder blocks while GET /api/v1/practices loads - no animation. */
export function PracticesSkeleton() {
  return (
    <View accessibilityLabel="Loading practices">
      <View style={styles.block} />
      <View style={styles.block} />
      <View style={styles.block} />
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    height: 220,
    borderRadius: radius.md,
    backgroundColor: colors.creamMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
});
