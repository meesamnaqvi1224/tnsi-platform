import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Container, PageQuote, Section } from '@tnsi/ui';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { ArticleBody } from '@/components/articles/template/article-body';
import { ArticleContinueLearning } from '@/components/articles/template/article-continue-learning';
import { ArticleHero } from '@/components/articles/template/article-hero';
import { ArticleTakeaways } from '@/components/articles/template/article-takeaways';
import { AuthorCard } from '@/components/articles/template/author-card';
import { ReadingProgress } from '@/components/articles/template/reading-progress';
import { RelatedArticles } from '@/components/articles/template/related-articles';
import { TableOfContents } from '@/components/articles/template/table-of-contents';
import { getAllArticleSlugs, getArticleBySlug } from '@/lib/articles';

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllArticleSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);

  if (!article) {
    return { title: 'Article Not Found' };
  }

  return {
    title: article.seo.title,
    description: article.seo.description,
    openGraph: {
      title: article.seo.title,
      description: article.seo.description,
    },
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  return (
    <>
      <ReadingProgress />
      <SiteHeader />
      <main>
        <ArticleHero hero={article.hero} />

        <Section spacing="xl" className="border-border border-b">
          <Container size="xl" className="px-(--space-xl) sm:px-(--space-2xl)">
            <div className="mx-auto grid max-w-6xl grid-cols-1 gap-(--space-4xl) xl:grid-cols-[200px_minmax(0,760px)]">
              <TableOfContents blocks={article.body} />

              <article id="article-content" className="min-w-0">
                <ArticleBody blocks={article.body} />
                <ArticleTakeaways items={article.takeaways} />
              </article>
            </div>
          </Container>
        </Section>

        <AuthorCard author={article.author} />
        <RelatedArticles articles={article.related} />
        <ArticleContinueLearning />

        <Section spacing="md" className="border-border border-t">
          <Container size="xl">
            <PageQuote quote={article.footerQuote.quote} author={article.footerQuote.author} />
          </Container>
        </Section>
      </main>
      <SiteFooter />
    </>
  );
}
