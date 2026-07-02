import NextLink from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Text } from '@tnsi/ui';
import { ResponsiveImage } from '@/components/utility/responsive-image';
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
      className="interaction-text-link text-foreground group inline-flex items-center gap-(--space-sm) text-sm font-medium tracking-wide"
    >
      Read Article
      <ArrowRight aria-hidden className="interaction-arrow size-4" />
    </NextLink>
  );
}

function ArticleImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    <div className={`relative overflow-hidden ${className ?? ''}`}>
      <ResponsiveImage
        src={src}
        alt={alt}
        fill
        className="object-cover"
        sizes="(max-width: 1024px) 100vw, 50vw"
      />
    </div>
  );
}

export function ArticleCard({ article }: ArticleCardProps) {
  if (article.variant === 'large') {
    return (
      <article className="border-border grid min-w-0 grid-cols-1 overflow-hidden border-t lg:grid-cols-[1.2fr_1fr]">
        <ArticleImage
          src={article.imageSrc ?? '/images/articles/post-hero.webp'}
          alt={article.imageAlt}
          className="min-h-[50vh] lg:min-h-[60vh]"
        />
        <div className="flex flex-col justify-center px-(--space-xl) py-(--space-4xl) sm:px-(--space-2xl) lg:px-(--space-3xl)">
          <div className="flex max-w-lg flex-col gap-(--space-xl)">
            <ArticleMeta
              category={article.category}
              publishedAt={article.publishedAt}
              readingTime={article.readingTime}
            />
            <h3 className="font-heading text-foreground text-3xl leading-[1.08] font-semibold tracking-tight sm:text-4xl lg:text-5xl">
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
        <ArticleImage
          src={article.imageSrc ?? '/images/articles/post-hero.webp'}
          alt={article.imageAlt}
          className="aspect-[16/10] w-full"
        />
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
