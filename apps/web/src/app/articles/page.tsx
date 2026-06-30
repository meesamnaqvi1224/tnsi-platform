import type { Metadata } from 'next';
import { Container, PageQuote, Section } from '@tnsi/ui';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { ArticlesCategories } from '@/components/articles/articles-categories';
import { ArticlesClosing } from '@/components/articles/articles-closing';
import { ArticlesEditorsPicks } from '@/components/articles/articles-editors-picks';
import { ArticlesFeatured } from '@/components/articles/articles-featured';
import { ArticlesHero } from '@/components/articles/articles-hero';
import { ArticlesLatest } from '@/components/articles/articles-latest';
import { ArticlesNewsletter } from '@/components/articles/articles-newsletter';
import { ArticlesTopics } from '@/components/articles/articles-topics';
import { articlesContent } from '@/content/articles';

const { seo, footerQuote } = articlesContent;

export const metadata: Metadata = {
  title: seo.title,
  description: seo.description,
  openGraph: {
    title: seo.title,
    description: seo.description,
  },
};

export default function ArticlesPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <ArticlesHero />
        <ArticlesFeatured />
        <ArticlesCategories />
        <ArticlesLatest />
        <ArticlesTopics />
        <ArticlesEditorsPicks />
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
