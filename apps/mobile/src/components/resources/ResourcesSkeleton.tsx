import { StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '@/theme';

/** Static placeholder blocks while GET /api/v1/articles loads - no animation, matches PracticesSkeleton. */
export function ResourcesSkeleton() {
  return (
    <View accessibilityLabel="Loading resources">
      <View style={styles.featuredBlock} />
      <View style={styles.block} />
      <View style={styles.block} />
      <View style={styles.block} />
    </View>
  );
}

const styles = StyleSheet.create({
  featuredBlock: {
    height: 280,
    borderRadius: radius.md,
    backgroundColor: colors.creamMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    marginBottom: spacing.xl,
  },
  block: {
    height: 220,
    borderRadius: radius.md,
    backgroundColor: colors.creamMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
});
