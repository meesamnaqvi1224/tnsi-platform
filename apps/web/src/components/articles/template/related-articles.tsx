import NextLink from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Container, Text } from '@tnsi/ui';
import type { RelatedArticle } from '@/content/article-posts/types';

export interface RelatedArticlesProps {
  articles: RelatedArticle[];
}

export function RelatedArticles({ articles }: RelatedArticlesProps) {
  return (
    <section aria-label="Related articles" className="border-border border-t">
      <Container size="xl" className="px-(--space-xl) py-(--space-4xl) sm:px-(--space-2xl)">
        <h2 className="font-heading text-foreground mb-(--space-3xl) text-2xl font-semibold tracking-tight sm:text-3xl lg:text-4xl">
          Related Articles
        </h2>

        <div className="grid grid-cols-1 gap-(--space-3xl) lg:grid-cols-3">
          {articles.map((article) => (
            <article key={article.slug} className="flex flex-col gap-(--space-lg)">
              <div className="bg-secondary relative aspect-[4/3] w-full">
                <div className="absolute inset-0 flex items-center justify-center">
                  <Text size="sm" tone="muted">
                    Related article image
                  </Text>
                </div>
                <span className="sr-only">{article.imageAlt}</span>
              </div>

              <div className="flex flex-col gap-(--space-md)">
                <span className="text-muted-foreground font-mono text-[0.625rem] tracking-[0.15em] uppercase">
                  {article.category}
                </span>
                <h3 className="font-heading text-foreground text-xl font-semibold tracking-tight">
                  {article.title}
                </h3>
                <Text tone="muted" size="sm" className="leading-relaxed">
                  {article.summary}
                </Text>
                <NextLink
                  href={`/articles/${article.slug}`}
                  className="interaction-text-link text-foreground group inline-flex items-center gap-(--space-sm) text-sm font-medium tracking-wide"
                >
                  Read Article
                  <ArrowRight aria-hidden className="interaction-arrow size-4" />
                </NextLink>
              </div>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
