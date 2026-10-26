import NextLink from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ArticleMeta } from '@/components/articles/article-card';
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

/**
 * The featured article: the largest headline on the page, with the photograph
 * taking seven of twelve columns and the text set to a comfortable measure
 * beside it. The "Read Article" link covers the card, so the photograph and
 * headline are clickable with a single tab stop.
 */
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
    <article className="group/story has-[a:focus-visible]:outline-ring relative grid grid-cols-1 items-center gap-x-(--space-3xl) gap-y-(--space-xl) has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-8 lg:grid-cols-12">
      <div className="bg-secondary relative aspect-[3/2] overflow-hidden lg:col-span-7">
        <ResponsiveImage
          src={imageSrc}
          alt={imageAlt}
          fill
          sizes="(max-width: 1024px) 100vw, 58vw"
          className="object-cover motion-safe:transition-transform motion-safe:duration-700 motion-safe:ease-out motion-safe:group-hover/story:scale-[1.03]"
        />
      </div>

      <div className="flex flex-col gap-(--space-lg) lg:col-span-5 lg:pl-(--space-xl)">
        <ArticleMeta category={category} publishedAt={publishedAt} readingTime={readingTime} />

        <h3 className="font-heading text-foreground text-4xl leading-[1.04] font-semibold tracking-tight text-balance decoration-1 underline-offset-[0.2em] group-hover/story:underline motion-reduce:no-underline sm:text-5xl lg:text-[3.5rem]">
          {title}
        </h3>

        <p className="text-muted-foreground max-w-[44ch] text-base leading-relaxed text-pretty sm:text-lg">
          {summary}
        </p>

        <NextLink
          href={href}
          className="interaction-text-link text-foreground inline-flex w-fit items-center gap-(--space-sm) text-sm font-medium tracking-wide after:absolute after:inset-0 after:content-[''] focus-visible:ring-0 focus-visible:ring-offset-0"
        >
          Read Article
          <span className="sr-only">: {title}</span>
          <ArrowRight aria-hidden className="interaction-arrow size-4" />
        </NextLink>
      </div>
    </article>
  );
}
