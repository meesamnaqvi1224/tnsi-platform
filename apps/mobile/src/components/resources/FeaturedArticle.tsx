import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ArticleThumbnail } from './ArticleThumbnail';
import { formatArticleDate } from '@/lib/format';
import { colors, radius, spacing } from '@/theme';
import type { ArticleListItem } from '@/api/types';

interface FeaturedArticleProps {
  article: ArticleListItem;
  onPress?: (article: ArticleListItem) => void;
}

/**
 * A visually stronger presentation for the catalogue's featured article -
 * larger cover image, display-weight title, no card border (reads as an
 * editorial masthead piece rather than one card among many). Only ever
 * rendered for a single article; the screen picks the first `featured`
 * article in API order, so this component has no opinion on which one -
 * see resources/index.tsx.
 */
export function FeaturedArticle({ article, onPress }: FeaturedArticleProps) {
  const meta = [
    article.readingTime,
    article.publishedAt ? formatArticleDate(article.publishedAt) : null,
  ].filter((part): part is string => Boolean(part));

  const label = [article.title, article.category?.title, ...meta].filter(Boolean).join(', ');

  const content = (
    <View style={styles.wrapper}>
      <ArticleThumbnail
        coverImage={article.coverImage}
        fallbackLabel={article.category?.title ?? 'Resource'}
        height={220}
        style={styles.thumbnail}
      />
      {article.category ? (
        <ThemedText variant="label" color={colors.bronze} style={styles.category}>
          {article.category.title.toUpperCase()}
        </ThemedText>
      ) : null}
      <ThemedText variant="display" style={styles.title}>
        {article.title.trim()}
      </ThemedText>
      {article.excerpt ? (
        <ThemedText variant="body" color={colors.charcoal} numberOfLines={3} style={styles.excerpt}>
          {article.excerpt}
        </ThemedText>
      ) : null}
      {meta.length > 0 ? (
        <ThemedText variant="caption" color={colors.charcoal}>
          {meta.join(' · ')}
        </ThemedText>
      ) : null}
    </View>
  );

  if (!onPress) {
    return (
      <View accessible accessibilityLabel={`Featured: ${label}`}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      onPress={() => onPress(article)}
      accessibilityRole="button"
      accessibilityLabel={`Featured: ${label}`}
      style={({ pressed }) => pressed && styles.pressed}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.85,
  },
  wrapper: {
    marginBottom: spacing.xl,
    paddingBottom: spacing.xl,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  thumbnail: {
    marginBottom: spacing.md,
    borderRadius: radius.lg,
  },
  category: {
    marginBottom: spacing.xs,
    letterSpacing: 1,
  },
  title: {
    marginBottom: spacing.sm,
  },
  excerpt: {
    marginBottom: spacing.sm,
  },
});
