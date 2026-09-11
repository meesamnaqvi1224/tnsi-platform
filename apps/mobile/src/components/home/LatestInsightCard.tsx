import { Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Card } from '@/components/Card';
import { ThemedText } from '@/components/ThemedText';
import { ArticleThumbnail } from '@/components/resources/ArticleThumbnail';
import { useArticles } from '@/hooks/useArticles';
import { formatArticleDate } from '@/lib/format';
import { colors, spacing } from '@/theme';

/**
 * A single real article surfaced on Home - reuses `useArticles()` (the
 * same GET /api/v1/articles the Resources screen already calls) rather
 * than a new fetch. Prefers the featured article (same concept Resources
 * already uses), falling back to the newest. Renders nothing while
 * loading, on error, or when there are no articles yet - this is a quiet
 * supplementary section, not one worth its own error/empty state on Home.
 */
export function LatestInsightCard() {
  const router = useRouter();
  const { state } = useArticles();

  if (state.status !== 'success' || state.articles.length === 0) return null;

  const article = state.articles.find((a) => a.featured) ?? state.articles[0];

  return (
    <Animated.View entering={FadeInDown.duration(450).delay(240)} style={styles.section}>
      <ThemedText variant="heading" style={styles.sectionTitle}>
        Latest from the Institute
      </ThemedText>

      <Pressable
        onPress={() =>
          router.push({ pathname: '/resources/[slug]', params: { slug: article.slug } })
        }
        accessibilityRole="button"
        accessibilityLabel={`Read ${article.title}`}
        style={({ pressed }) => pressed && styles.pressed}
      >
        <Card style={styles.card}>
          <ArticleThumbnail
            coverImage={article.coverImage}
            fallbackLabel={article.category?.title ?? 'Resource'}
            height={170}
            style={styles.thumbnail}
          />
          {article.category ? (
            <ThemedText variant="label" color={colors.bronze} style={styles.category}>
              {article.category.title.toUpperCase()}
            </ThemedText>
          ) : null}
          <ThemedText variant="heading" style={styles.title}>
            {article.title.trim()}
          </ThemedText>
          {article.excerpt ? (
            <ThemedText
              variant="body"
              color={colors.charcoal}
              numberOfLines={2}
              style={styles.excerpt}
            >
              {article.excerpt}
            </ThemedText>
          ) : null}
          {article.publishedAt ? (
            <ThemedText variant="caption" color={colors.charcoal} style={styles.date}>
              {formatArticleDate(article.publishedAt)}
            </ThemedText>
          ) : null}
        </Card>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    marginBottom: spacing.md,
  },
  pressed: {
    opacity: 0.85,
  },
  card: {
    padding: 0,
    overflow: 'hidden',
  },
  thumbnail: {
    marginBottom: spacing.md,
    borderRadius: 0,
  },
  category: {
    letterSpacing: 1,
    marginBottom: spacing.xs,
    marginHorizontal: spacing.lg,
  },
  title: {
    marginBottom: spacing.xs,
    marginHorizontal: spacing.lg,
  },
  excerpt: {
    marginBottom: spacing.sm,
    marginHorizontal: spacing.lg,
  },
  date: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
});
