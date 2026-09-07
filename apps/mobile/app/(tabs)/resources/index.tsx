import { useCallback, useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer, ErrorNotice, ThemedText } from '@/components';
import { ArticleCard, type ArticleCardSummary } from '@/components/resources/ArticleCard';
import {
  ArticleFilterBar,
  type ArticleCategoryOption,
} from '@/components/resources/ArticleFilterBar';
import { FeaturedArticle } from '@/components/resources/FeaturedArticle';
import { ResourcesSkeleton } from '@/components/resources/ResourcesSkeleton';
import { useArticles } from '@/hooks/useArticles';
import { colors, spacing } from '@/theme';

/**
 * The Resources library - the mobile presentation of the TNSI Article
 * catalogue (there is no separate "Resource" content type; see the Phase
 * 4.0 audit). Fetches GET /api/v1/articles once; category filtering
 * happens client-side against that already-fetched list, same rationale
 * as the Practices library (see useArticles.ts).
 *
 * Copy mirrors apps/web/src/content/resources.ts's existing, already-
 * approved positioning verbatim rather than inventing new brand language.
 */
export default function ResourcesScreen() {
  const router = useRouter();
  const { state, reload } = useArticles();
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const openArticle = useCallback(
    (article: ArticleCardSummary) => {
      router.push({ pathname: '/resources/[slug]', params: { slug: article.slug } });
    },
    [router],
  );

  const articles = useMemo(() => (state.status === 'success' ? state.articles : []), [state]);

  const featured = useMemo(() => articles.find((article) => article.featured) ?? null, [articles]);

  // The featured article gets its own prominent slot above the list, so
  // it's excluded from "Latest" to avoid showing the same article twice.
  const listSource = useMemo(
    () => (featured ? articles.filter((article) => article.id !== featured.id) : articles),
    [articles, featured],
  );

  const categories = useMemo(() => {
    const seen = new Map<string, ArticleCategoryOption>();
    for (const article of listSource) {
      if (article.category?.slug && !seen.has(article.category.slug)) {
        seen.set(article.category.slug, {
          slug: article.category.slug,
          title: article.category.title,
        });
      }
    }
    return Array.from(seen.values());
  }, [listSource]);

  const filtered = categoryFilter
    ? listSource.filter((article) => article.category?.slug === categoryFilter)
    : listSource;

  return (
    <ScreenContainer scroll>
      <ThemedText variant="display" style={styles.heading}>
        Resources
      </ThemedText>
      <ThemedText variant="body" color={colors.charcoal} style={styles.subtitle}>
        Evidence-informed articles, guides, research and educational resources to deepen your
        understanding of the nervous system.
      </ThemedText>

      {state.status === 'loading' && <ResourcesSkeleton />}

      {state.status === 'error' && <ErrorNotice message={state.message} onRetry={reload} />}

      {state.status === 'success' && (
        <>
          {featured ? <FeaturedArticle article={featured} onPress={openArticle} /> : null}

          <ArticleFilterBar
            categories={categories}
            selected={categoryFilter}
            onSelect={setCategoryFilter}
          />

          {filtered.length === 0 ? (
            <ThemedText variant="body" color={colors.charcoal}>
              {articles.length === 0
                ? 'No resources are available yet.'
                : 'No resources found in this category.'}
            </ThemedText>
          ) : (
            filtered.map((article) => (
              <ArticleCard key={article.id} article={article} onPress={openArticle} />
            ))
          )}
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  heading: {
    marginBottom: spacing.sm,
  },
  subtitle: {
    marginBottom: spacing.xl,
  },
});
