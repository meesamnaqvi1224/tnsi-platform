import { Pressable, StyleSheet, View } from 'react-native';
import { Card } from '@/components/Card';
import { ThemedText } from '@/components/ThemedText';
import { ArticleThumbnail } from './ArticleThumbnail';
import { formatArticleDate } from '@/lib/format';
import { colors, spacing } from '@/theme';
import type { ArticleCategory, ArticleImage } from '@/api/types';

/**
 * The fields this card actually renders - deliberately narrower than
 * `ArticleListItem`, so `ArticleRelated` (which has no `author`/`featured`,
 * see api/types.ts) structurally satisfies this too. Lets the detail
 * screen's "Related Articles" section reuse this exact card rather than
 * needing a near-duplicate compact variant.
 */
export interface ArticleCardSummary {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: ArticleImage | null;
  category: ArticleCategory | null;
  publishedAt: string | null;
  readingTime: string | null;
}

interface ArticleCardProps {
  article: ArticleCardSummary;
  /**
   * Left undefined until there's nowhere to navigate - a card with no
   * handler renders as a plain, non-interactive View rather than a
   * Pressable with nowhere to go, which would be a broken accessibility
   * affordance (a "button" that does nothing).
   */
  onPress?: (article: ArticleCardSummary) => void;
}

/**
 * One library entry: cover image, category, title, excerpt, reading time
 * · date. Deliberately restrained - no ratings/likes/comments/views/
 * popularity/bookmarks/fake progress, none of which exist on the real
 * Article content model.
 */
export function ArticleCard({ article, onPress }: ArticleCardProps) {
  const meta = [
    article.readingTime,
    article.publishedAt ? formatArticleDate(article.publishedAt) : null,
  ].filter((part): part is string => Boolean(part));

  const label = [article.title, article.category?.title, ...meta].filter(Boolean).join(', ');

  const content = (
    <Card style={styles.card}>
      <ArticleThumbnail
        coverImage={article.coverImage}
        fallbackLabel={article.category?.title ?? 'Resource'}
        height={140}
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
        <ThemedText variant="body" color={colors.charcoal} numberOfLines={2} style={styles.excerpt}>
          {article.excerpt}
        </ThemedText>
      ) : null}
      {meta.length > 0 ? (
        <View style={styles.metaRow}>
          <ThemedText variant="caption" color={colors.charcoal}>
            {meta.join(' · ')}
          </ThemedText>
        </View>
      ) : null}
    </Card>
  );

  if (!onPress) {
    return (
      <View accessible accessibilityLabel={label}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      onPress={() => onPress(article)}
      accessibilityRole="button"
      accessibilityLabel={label}
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
  card: {
    marginBottom: spacing.lg,
  },
  thumbnail: {
    marginBottom: spacing.md,
  },
  category: {
    marginBottom: spacing.xs,
    letterSpacing: 1,
  },
  title: {
    marginBottom: spacing.xs,
  },
  excerpt: {
    marginBottom: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
  },
});
