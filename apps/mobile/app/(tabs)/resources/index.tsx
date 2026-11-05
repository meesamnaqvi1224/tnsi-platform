import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer, ErrorNotice, ThemedText, PageHeader, PrimaryButton } from '@/components';
import { PracticeSearchField } from '@/components/practices/PracticeSearchField';
import { ArticleCard, type ArticleCardSummary } from '@/components/resources/ArticleCard';
import { ArticleFilterBar } from '@/components/resources/ArticleFilterBar';
import { FeaturedArticle } from '@/components/resources/FeaturedArticle';
import { ResourcesSkeleton } from '@/components/resources/ResourcesSkeleton';
import { useArticles } from '@/hooks/useArticles';
import {
  NO_ARTICLE_FILTERS,
  articleCategories,
  filterArticles,
  hasArticleFilters,
  type ArticleFilters,
} from '@/lib/article-library';
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
  const [filters, setFilters] = useState<ArticleFilters>(NO_ARTICLE_FILTERS);

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

  // With the default view the featured article has its own slot and is left out of the list. Once
  // the member searches or filters, the whole loaded catalogue is searched (so the featured
  // article can be found too) and the featured slot gives way to the results.
  const narrowed = hasArticleFilters(filters);
  const categories = useMemo(
    () => articleCategories(narrowed ? articles : listSource),
    [articles, listSource, narrowed],
  );
  const filtered = useMemo(
    () => filterArticles(narrowed ? articles : listSource, filters),
    [articles, listSource, filters, narrowed],
  );

  return (
    <ScreenContainer scroll underHeader inTabs keyboardPersistTaps>
      <PageHeader
        variant="plain"
        eyebrow="Resources"
        title="Evidence-informed articles, guides, research and educational resources to deepen your understanding of the nervous system."
      />

      {state.status === 'loading' && <ResourcesSkeleton />}

      {state.status === 'error' && <ErrorNotice message={state.message} onRetry={reload} />}

      {state.status === 'success' && (
        <>
          {articles.length > 0 ? (
            <PracticeSearchField
              label="Search resources"
              value={filters.query}
              onChangeText={(query) => setFilters((current) => ({ ...current, query }))}
            />
          ) : null}

          {featured && !narrowed ? (
            <FeaturedArticle article={featured} onPress={openArticle} />
          ) : null}

          <ArticleFilterBar
            categories={categories}
            selected={filters.category}
            onSelect={(category) => setFilters((current) => ({ ...current, category }))}
          />

          {narrowed && articles.length > 0 ? (
            <ThemedText
              variant="caption"
              color={colors.charcoal}
              accessibilityLiveRegion="polite"
              style={styles.summary}
            >
              {`${filtered.length} of ${articles.length} resources`}
            </ThemedText>
          ) : null}

          {filtered.length === 0 ? (
            <View>
              <ThemedText variant="body" color={colors.charcoal}>
                {articles.length === 0
                  ? 'No resources are available yet.'
                  : filters.query.trim()
                    ? `No resources match “${filters.query.trim()}”${filters.category ? ' in this category' : ''}.`
                    : 'No resources found in this category.'}
              </ThemedText>
              {articles.length > 0 ? (
                <PrimaryButton
                  label="Clear search and filters"
                  variant="secondary"
                  onPress={() => setFilters(NO_ARTICLE_FILTERS)}
                  style={styles.clear}
                />
              ) : null}
            </View>
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
  summary: { marginBottom: spacing.md },
  clear: { marginTop: spacing.md },
});
