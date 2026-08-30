import { Container, PageQuote, Section } from '@tnsi/ui';
import { JsonLd } from '@/components/seo/json-ld';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { ArticlesCategories } from '@/components/articles/articles-categories';
import { ArticlesClosing } from '@/components/articles/articles-closing';
import { ArticlesFeatured } from '@/components/articles/articles-featured';
import { ArticlesHero } from '@/components/articles/articles-hero';
import { ArticlesLatest } from '@/components/articles/articles-latest';
import { ArticlesNewsletter } from '@/components/articles/articles-newsletter';
import { articlesContent } from '@/content/articles';
import { getLatestArticles } from '@/content/cms/loaders';
import { getArticleCategoryCounts } from '@/lib/articles';

const { seo, footerQuote } = articlesContent;

import { createBreadcrumbJsonLd, createPageMetadata, createWebPageJsonLd } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: 'Articles',
  description: seo.description,
  path: '/articles',
});

interface ArticlesPageProps {
  searchParams: Promise<{ category?: string }>;
}

export default async function ArticlesPage({ searchParams }: ArticlesPageProps) {
  const { category } = await searchParams;

  const allArticles = await getLatestArticles();
  const categoryCounts = getArticleCategoryCounts(allArticles);

  const jsonLd = [
    createWebPageJsonLd({ title: 'Articles', description: seo.description, path: '/articles' }),
    createBreadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: 'Articles', path: '/articles' },
    ]),
  ];

  return (
    <>
      <JsonLd data={jsonLd} />
      <SiteHeader />
      <main id="main-content">
        <ArticlesHero />
        <ArticlesFeatured />
        <ArticlesCategories categories={categoryCounts} activeCategory={category} />
        <ArticlesLatest category={category} />
        <ArticlesNewsletter />
        <ArticlesClosing />

        <Section spacing="md" className="border-border border-t">
          <Container size="xl">
            <PageQuote quote={footerQuote.quote} author={footerQuote.author} />
          </Container>
        </Section>
      </main>
      <SiteFooter />
    </>
  );
}
