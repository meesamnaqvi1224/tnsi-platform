import { StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '@/theme';

/**
 * Static placeholder blocks shown while GET /api/v1/today loads - no
 * animation, so it reads as restrained rather than a busy shimmer effect.
 */
export function HomeSkeleton() {
  return (
    <View accessibilityLabel="Loading today's information">
      <View style={[styles.block, styles.cardBlock]} />
      <View style={[styles.block, styles.cardBlock]} />
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: colors.creamMuted,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  cardBlock: {
    height: 160,
    marginBottom: spacing.lg,
  },
});
