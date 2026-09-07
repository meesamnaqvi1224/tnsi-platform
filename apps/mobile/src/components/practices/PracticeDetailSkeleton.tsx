import { StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '@/theme';

/** Static placeholder blocks while GET /api/v1/practices/[id] loads - no animation. */
export function PracticeDetailSkeleton() {
  return (
    <View accessibilityLabel="Loading practice">
      <View style={styles.hero} />
      <View style={styles.line} />
      <View style={[styles.line, styles.lineShort]} />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    height: 220,
    borderRadius: radius.md,
    backgroundColor: colors.creamMuted,
    marginBottom: spacing.lg,
  },
  line: {
    height: 16,
    borderRadius: radius.sm,
    backgroundColor: colors.creamMuted,
    marginBottom: spacing.sm,
  },
  lineShort: {
    width: '60%',
  },
});
