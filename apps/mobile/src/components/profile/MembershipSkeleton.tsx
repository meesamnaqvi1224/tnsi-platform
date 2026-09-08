import { StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '@/theme';

/** Static placeholder blocks while GET /api/v1/me/entitlements loads - no animation, matches the other screen skeletons. */
export function MembershipSkeleton() {
  return (
    <View accessibilityLabel="Loading membership details">
      <View style={styles.titleLine} />
      <View style={styles.block} />
      <View style={styles.lineShort} />
    </View>
  );
}

const styles = StyleSheet.create({
  titleLine: {
    height: 24,
    width: '60%',
    borderRadius: radius.sm,
    backgroundColor: colors.creamMuted,
    marginBottom: spacing.lg,
  },
  block: {
    height: 140,
    borderRadius: radius.md,
    backgroundColor: colors.creamMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  lineShort: {
    height: 16,
    width: '40%',
    borderRadius: radius.sm,
    backgroundColor: colors.creamMuted,
  },
});
