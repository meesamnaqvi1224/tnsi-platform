import { StyleSheet, View } from 'react-native';
import { home } from '@/components/home/homeTheme';
import { radius, spacing } from '@/theme';

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
    backgroundColor: home.cool,
    borderWidth: 1,
    borderColor: home.border,
    marginBottom: spacing.lg,
  },
});
