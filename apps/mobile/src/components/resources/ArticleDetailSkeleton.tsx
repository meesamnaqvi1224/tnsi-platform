import { StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '@/theme';

/**
 * Lightweight editorial skeleton while GET /api/v1/articles/[slug] loads -
 * shapes echo the hero (category/title/meta) then the cover image, then a
 * few body-paragraph-width lines, rather than a generic spinner.
 */
export function ArticleDetailSkeleton() {
  return (
    <View accessibilityLabel="Loading article">
      <View style={styles.category} />
      <View style={styles.titleLine} />
      <View style={[styles.titleLine, styles.titleLineShort]} />
      <View style={styles.metaLine} />
      <View style={styles.hero} />
      <View style={styles.bodyLine} />
      <View style={styles.bodyLine} />
      <View style={[styles.bodyLine, styles.bodyLineShort]} />
    </View>
  );
}

const styles = StyleSheet.create({
  category: {
    width: 90,
    height: 14,
    borderRadius: radius.sm,
    backgroundColor: colors.creamMuted,
    marginBottom: spacing.md,
  },
  titleLine: {
    height: 30,
    borderRadius: radius.sm,
    backgroundColor: colors.creamMuted,
    marginBottom: spacing.sm,
  },
  titleLineShort: {
    width: '70%',
  },
  metaLine: {
    width: '50%',
    height: 14,
    borderRadius: radius.sm,
    backgroundColor: colors.creamMuted,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  hero: {
    height: 220,
    borderRadius: radius.md,
    backgroundColor: colors.creamMuted,
    marginBottom: spacing.xl,
  },
  bodyLine: {
    height: 16,
    borderRadius: radius.sm,
    backgroundColor: colors.creamMuted,
    marginBottom: spacing.sm,
  },
  bodyLineShort: {
    width: '60%',
  },
});
