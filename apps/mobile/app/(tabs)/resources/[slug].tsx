import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenContainer, ErrorNotice, PrimaryButton, ThemedText } from '@/components';
import { ArticleBody } from '@/components/resources/ArticleBody';
import { ArticleCard } from '@/components/resources/ArticleCard';
import { ArticleDetailSkeleton } from '@/components/resources/ArticleDetailSkeleton';
import { ArticleThumbnail } from '@/components/resources/ArticleThumbnail';
import { useArticleDetail } from '@/hooks/useArticleDetail';
import { formatArticleDate } from '@/lib/format';
import { colors, spacing } from '@/theme';

/**
 * The native article reader - Sanity `article` content rendered as a
 * premium editorial page (see the Phase 4.0 audit: "Resources" is the
 * mobile presentation of the Article catalogue, not a separate content
 * type). Fetches GET /api/v1/articles/[slug] once per visit, same pattern
 * as the Practices detail screen (usePracticeDetail).
 */
export default function ArticleDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ slug: string }>();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const { state, reload } = useArticleDetail(slug);

  if (state.status === 'loading') {
    return (
      <ScreenContainer scroll>
        <ArticleDetailSkeleton />
      </ScreenContainer>
    );
  }

  if (state.status === 'not-found') {
    return (
      <ScreenContainer>
        <ThemedText variant="heading">This article isn&apos;t available.</ThemedText>
        <ThemedText variant="body" color={colors.charcoal} style={styles.notFoundBody}>
          It may have been removed or is no longer published.
        </ThemedText>
        <PrimaryButton
          label="Back to Resources"
          variant="secondary"
          onPress={() => router.replace('/resources')}
          style={styles.notFoundButton}
        />
      </ScreenContainer>
    );
  }

  if (state.status === 'error') {
    return (
      <ScreenContainer>
        <ErrorNotice message={state.message} onRetry={reload} />
      </ScreenContainer>
    );
  }

  const { article } = state;
  const meta = [
    article.author?.name,
    article.publishedAt ? formatArticleDate(article.publishedAt) : null,
    article.readingTime,
  ].filter((part): part is string => Boolean(part));

  return (
    <ScreenContainer scroll>
      {article.category ? (
        <ThemedText variant="label" color={colors.bronze} style={styles.category}>
          {article.category.title.toUpperCase()}
        </ThemedText>
      ) : null}

      <ThemedText variant="display" style={styles.title}>
        {article.title.trim()}
      </ThemedText>

      {article.excerpt ? (
        <ThemedText variant="body" color={colors.charcoal} style={styles.excerpt}>
          {article.excerpt}
        </ThemedText>
      ) : null}

      {meta.length > 0 || article.author?.photo ? (
        <View style={styles.metaRow}>
          {article.author?.photo ? <AuthorAvatar url={article.author.photo.url} /> : null}
          {meta.length > 0 ? (
            <ThemedText variant="caption" color={colors.charcoal} style={styles.metaText}>
              {meta.join(' · ')}
            </ThemedText>
          ) : null}
        </View>
      ) : null}

      <ArticleThumbnail
        coverImage={article.coverImage}
        fallbackLabel={article.category?.title ?? 'Resource'}
        height={220}
        style={styles.hero}
      />

      <ArticleBody blocks={article.body} />

      {article.related.length > 0 ? (
        <View style={styles.relatedSection}>
          <ThemedText variant="label" color={colors.bronze} style={styles.relatedHeading}>
            RELATED ARTICLES
          </ThemedText>
          {article.related.map((related) => (
            <ArticleCard
              key={related.id}
              article={related}
              onPress={(a) =>
                router.push({ pathname: '/resources/[slug]', params: { slug: a.slug } })
              }
            />
          ))}
        </View>
      ) : null}
    </ScreenContainer>
  );
}

/** Small circular author photo - shown only when the API actually supplies one; hides itself on load failure rather than showing a broken image. */
function AuthorAvatar({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <Image
      source={{ uri: url }}
      style={styles.avatar}
      onError={() => setFailed(true)}
      accessible={false}
    />
  );
}

const styles = StyleSheet.create({
  category: {
    marginBottom: spacing.sm,
    letterSpacing: 1,
  },
  title: {
    marginBottom: spacing.md,
  },
  excerpt: {
    marginBottom: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  metaText: {
    flex: 1,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: spacing.sm,
    backgroundColor: colors.creamMuted,
  },
  hero: {
    marginBottom: spacing.xl,
  },
  relatedSection: {
    marginTop: spacing.xl,
    paddingTop: spacing.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  relatedHeading: {
    marginBottom: spacing.lg,
    letterSpacing: 1,
  },
  notFoundBody: {
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  notFoundButton: {
    alignSelf: 'flex-start',
  },
});
