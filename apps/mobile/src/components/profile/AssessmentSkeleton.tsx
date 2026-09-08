import { StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '@/theme';

/** Static placeholder blocks while GET /api/v1/assessments/[slug] loads - no animation, matches the other screen skeletons. */
export function AssessmentSkeleton() {
  return (
    <View accessibilityLabel="Loading assessment">
      <View style={styles.titleLine} />
      <View style={styles.block} />
      <View style={styles.block} />
      <View style={styles.block} />
    </View>
  );
}

const styles = StyleSheet.create({
  titleLine: {
    height: 30,
    width: '70%',
    borderRadius: radius.sm,
    backgroundColor: colors.creamMuted,
    marginBottom: spacing.xl,
  },
  block: {
    height: 120,
    borderRadius: radius.md,
    backgroundColor: colors.creamMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
});
