import NextLink from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Text } from '@tnsi/ui';

export interface FeaturedArticleProps {
  category: string;
  publishedAt: string;
  readingTime: string;
  title: string;
  summary: string;
  imageAlt: string;
  href: string;
}

export function FeaturedArticle({
  category,
  publishedAt,
  readingTime,
  title,
  summary,
  imageAlt,
  href,
}: FeaturedArticleProps) {
  return (
    <article className="border-border grid grid-cols-1 border-t lg:grid-cols-[3fr_2fr]">
      <div className="bg-secondary relative min-h-[55vh] lg:min-h-[75vh]">
        <div className="absolute inset-0 flex items-center justify-center">
          <Text size="sm" tone="muted" className="max-w-[14rem] text-center">
            Featured article photography placeholder
          </Text>
        </div>
        <span className="sr-only">{imageAlt}</span>
      </div>

      <div className="flex flex-col justify-center px-(--space-xl) py-(--space-4xl) sm:px-(--space-2xl) lg:px-(--space-3xl)">
        <div className="flex max-w-md flex-col gap-(--space-xl)">
          <div className="flex flex-col gap-(--space-xs)">
            <span className="text-muted-foreground font-mono text-[0.625rem] tracking-[0.15em] uppercase">
              {category}
            </span>
            <span className="text-muted-foreground text-xs">
              {publishedAt} · {readingTime}
            </span>
          </div>

          <h3 className="font-heading text-foreground text-4xl leading-[1.08] font-semibold tracking-tight lg:text-5xl">
            {title}
          </h3>

          <Text tone="muted" className="leading-relaxed">
            {summary}
          </Text>

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
        </div>
      </div>
    </article>
  );
}
