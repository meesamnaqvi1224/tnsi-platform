import NextLink from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Text } from '@tnsi/ui';
import type { ArticleItem } from '@/content/articles';

export interface ArticleCardProps {
  article: ArticleItem;
}

function ArticleMeta({
  category,
  publishedAt,
  readingTime,
}: Pick<ArticleItem, 'category' | 'publishedAt' | 'readingTime'>) {
  return (
    <div className="flex flex-col gap-(--space-xs)">
      <span className="text-muted-foreground font-mono text-[0.625rem] tracking-[0.15em] uppercase">
        {category}
      </span>
      <span className="text-muted-foreground text-xs">
        {publishedAt} · {readingTime}
      </span>
    </div>
  );
}

function ArticleLink({ href }: { href: string }) {
  return (
    <NextLink
      href={href}
      className="text-foreground group inline-flex items-center gap-(--space-sm) text-sm font-medium tracking-wide"
    >
      Read Article
      <ArrowRight
        aria-hidden
        className="size-4 transition-transform duration-200 group-hover:translate-x-1"
      />
    </NextLink>
  );
}

function ImagePlaceholder({ alt, className }: { alt: string; className?: string }) {
  return (
    <div className={`bg-secondary relative ${className ?? ''}`}>
      <div className="absolute inset-0 flex items-center justify-center">
        <Text size="sm" tone="muted" className="max-w-[10rem] text-center">
          Editorial photography placeholder
        </Text>
      </div>
      <span className="sr-only">{alt}</span>
    </div>
  );
}

export function ArticleCard({ article }: ArticleCardProps) {
  if (article.variant === 'large') {
    return (
      <article className="border-border grid grid-cols-1 border-t lg:grid-cols-[1.2fr_1fr]">
        <ImagePlaceholder alt={article.imageAlt} className="min-h-[50vh] lg:min-h-[60vh]" />
        <div className="flex flex-col justify-center px-(--space-xl) py-(--space-4xl) sm:px-(--space-2xl) lg:px-(--space-3xl)">
          <div className="flex max-w-lg flex-col gap-(--space-xl)">
            <ArticleMeta
              category={article.category}
              publishedAt={article.publishedAt}
              readingTime={article.readingTime}
            />
            <h3 className="font-heading text-foreground text-4xl leading-[1.08] font-semibold tracking-tight lg:text-5xl">
              {article.title}
            </h3>
            <Text tone="muted" className="leading-relaxed">
              {article.summary}
            </Text>
            <ArticleLink href={article.href} />
          </div>
        </div>
      </article>
    );
  }

  if (article.variant === 'medium') {
    return (
      <article className="border-border flex flex-col border-t">
        <ImagePlaceholder alt={article.imageAlt} className="aspect-[16/10] w-full" />
        <div className="flex flex-col gap-(--space-lg) px-(--space-md) py-(--space-xl)">
          <ArticleMeta
            category={article.category}
            publishedAt={article.publishedAt}
            readingTime={article.readingTime}
          />
          <h3 className="font-heading text-foreground text-2xl font-semibold tracking-tight lg:text-3xl">
            {article.title}
          </h3>
          <Text tone="muted" size="sm" className="leading-relaxed">
            {article.summary}
          </Text>
          <ArticleLink href={article.href} />
        </div>
      </article>
    );
  }

  return (
    <article className="border-border flex flex-col gap-(--space-lg) border-t py-(--space-xl)">
      <ArticleMeta
        category={article.category}
        publishedAt={article.publishedAt}
        readingTime={article.readingTime}
      />
      <h3 className="font-heading text-foreground text-xl font-semibold tracking-tight">
        {article.title}
      </h3>
      <Text tone="muted" size="sm" className="line-clamp-2 leading-relaxed">
        {article.summary}
      </Text>
      <ArticleLink href={article.href} />
    </article>
  );
}
