import NextLink from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Text } from '@tnsi/ui';
import { ResponsiveImage } from '@/components/utility/responsive-image';

export interface FeaturedArticleProps {
  category: string;
  publishedAt: string;
  readingTime: string;
  title: string;
  summary: string;
  imageSrc: string;
  imageAlt: string;
  href: string;
}

export function FeaturedArticle({
  category,
  publishedAt,
  readingTime,
  title,
  summary,
  imageSrc,
  imageAlt,
  href,
}: FeaturedArticleProps) {
  return (
    <article className="border-border grid grid-cols-1 border-t lg:grid-cols-[3fr_2fr]">
      <div className="bg-secondary relative min-h-[55vh] overflow-hidden lg:min-h-[75vh]">
        <ResponsiveImage
          src={imageSrc}
          alt={imageAlt}
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 60vw"
        />
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

          <h3 className="font-heading text-foreground text-3xl leading-[1.08] font-semibold tracking-tight sm:text-4xl lg:text-5xl">
            {title}
          </h3>

          <Text tone="muted" className="leading-relaxed">
            {summary}
          </Text>

          <NextLink
            href={href}
            className="interaction-text-link text-foreground group inline-flex items-center gap-(--space-sm) text-sm font-medium tracking-wide"
          >
            Read Article
            <ArrowRight aria-hidden className="interaction-arrow size-4" />
          </NextLink>
        </div>
      </div>
    </article>
  );
}
