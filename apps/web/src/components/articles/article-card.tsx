import NextLink from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cn } from '@tnsi/ui';
import { ResponsiveImage } from '@/components/utility/responsive-image';
import type { ArticleItem } from '@/content/articles';

/**
 * The three article presentations used on the Insights listing.
 *
 *   LeadStory       - one article, a large image beside a large headline
 *   PairedStories   - two articles, equal image ratio, the second dropped lower
 *   EditorialIndex  - restrained, text-led rows, each with a small photograph
 *
 * Shared rules: category in the small mono label, then date and reading time;
 * serif headline; muted summary; one "Read Article" link per article whose hit
 * area covers the whole card (a single tab stop and a large click target). The
 * photograph zooms very slightly on hover, and not at all when the visitor
 * prefers reduced motion.
 */

type StoryArticle = Pick<
  ArticleItem,
  | 'title'
  | 'summary'
  | 'category'
  | 'publishedAt'
  | 'readingTime'
  | 'imageSrc'
  | 'imageAlt'
  | 'href'
>;

export function ArticleMeta({
  category,
  publishedAt,
  readingTime,
  className,
}: Pick<StoryArticle, 'category' | 'publishedAt' | 'readingTime'> & { className?: string }) {
  const detail = [publishedAt, readingTime].filter(Boolean).join(' · ');
  return (
    <p className={cn('flex flex-col gap-(--space-xs)', className)}>
      <span className="text-muted-foreground font-mono text-[0.625rem] tracking-[0.15em] uppercase">
        {category}
      </span>
      {detail ? <span className="text-muted-foreground text-xs">{detail}</span> : null}
    </p>
  );
}

/**
 * The card's one link. Its ::after covers the card, so the photograph and the
 * headline are clickable too. "Read Article" stays the visible text; the title
 * follows it for screen readers so a list of them is not a list of identical
 * links.
 */
function ReadLink({ href, title }: { href: string; title: string }) {
  return (
    <NextLink
      href={href}
      className="interaction-text-link text-foreground inline-flex w-fit items-center gap-(--space-sm) text-sm font-medium tracking-wide after:absolute after:inset-0 after:content-[''] focus-visible:ring-0 focus-visible:ring-offset-0"
    >
      Read Article
      <span className="sr-only">: {title}</span>
      <ArrowRight aria-hidden className="interaction-arrow size-4" />
    </NextLink>
  );
}

function StoryImage({
  src,
  alt,
  className,
  sizes,
}: {
  src: string;
  alt: string;
  className?: string;
  sizes: string;
}) {
  return (
    <div className={cn('bg-secondary relative overflow-hidden', className)}>
      <ResponsiveImage
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        className="object-cover motion-safe:transition-transform motion-safe:duration-700 motion-safe:ease-out motion-safe:group-hover/story:scale-[1.03]"
      />
    </div>
  );
}

const storyShell =
  'group/story relative min-w-0 has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-8 has-[a:focus-visible]:outline-ring';

const headlineHover =
  'decoration-1 underline-offset-[0.2em] group-hover/story:underline motion-reduce:no-underline';

/** One prominent article. `flip` puts the image on the right for variety. */
export function LeadStory({ article, flip = false }: { article: StoryArticle; flip?: boolean }) {
  return (
    <article
      className={cn(
        storyShell,
        'grid grid-cols-1 items-center gap-x-(--space-3xl) gap-y-(--space-xl) lg:grid-cols-12',
      )}
    >
      <StoryImage
        src={article.imageSrc}
        alt={article.imageAlt}
        className={cn('aspect-[3/2] lg:col-span-7', flip && 'lg:order-2 lg:col-start-6')}
        sizes="(max-width: 1024px) 100vw, 58vw"
      />
      <div
        className={cn(
          'flex flex-col gap-(--space-lg) lg:col-span-5',
          flip ? 'lg:order-1 lg:row-start-1 lg:pr-(--space-xl)' : 'lg:pl-(--space-xl)',
        )}
      >
        <ArticleMeta
          category={article.category}
          publishedAt={article.publishedAt}
          readingTime={article.readingTime}
        />
        <h3
          className={cn(
            'font-heading text-foreground text-3xl leading-[1.06] font-semibold tracking-tight text-balance sm:text-4xl lg:text-5xl',
            headlineHover,
          )}
        >
          {article.title}
        </h3>
        <p className="text-muted-foreground max-w-[46ch] text-base leading-relaxed text-pretty sm:text-lg">
          {article.summary}
        </p>
        <ReadLink href={article.href} title={article.title} />
      </div>
    </article>
  );
}

/** Two articles side by side; the second is dropped lower so the pair is not a flat row. */
export function PairedStories({ articles }: { articles: readonly [StoryArticle, StoryArticle] }) {
  return (
    <div className="grid grid-cols-1 gap-x-(--space-3xl) gap-y-(--space-3xl) md:grid-cols-2">
      {articles.map((article, position) => (
        <article
          key={article.href}
          className={cn(
            storyShell,
            'flex flex-col gap-(--space-lg)',
            position === 1 && 'md:mt-(--space-3xl)',
          )}
        >
          <StoryImage
            src={article.imageSrc}
            alt={article.imageAlt}
            className="aspect-[3/2]"
            sizes="(max-width: 768px) 100vw, 46vw"
          />
          <div className="flex flex-col gap-(--space-md)">
            <ArticleMeta
              category={article.category}
              publishedAt={article.publishedAt}
              readingTime={article.readingTime}
            />
            <h3
              className={cn(
                'font-heading text-foreground text-2xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-3xl',
                headlineHover,
              )}
            >
              {article.title}
            </h3>
            <p className="text-muted-foreground line-clamp-3 max-w-[52ch] text-sm leading-relaxed text-pretty sm:text-base">
              {article.summary}
            </p>
            <ReadLink href={article.href} title={article.title} />
          </div>
        </article>
      ))}
    </div>
  );
}

/** A run of text-led rows. Each row keeps its photograph as a small thumbnail. */
export function EditorialIndex({ articles }: { articles: readonly StoryArticle[] }) {
  return (
    <ul className="border-border divide-border flex flex-col divide-y border-y">
      {articles.map((article) => (
        <li key={article.href}>
          <article
            className={cn(
              storyShell,
              'grid grid-cols-[minmax(0,1fr)_6.5rem] items-start gap-x-(--space-lg) gap-y-(--space-md) py-(--space-xl) md:grid-cols-[minmax(0,12rem)_minmax(0,1fr)_9rem] md:gap-x-(--space-2xl) md:py-(--space-2xl)',
            )}
          >
            <ArticleMeta
              category={article.category}
              publishedAt={article.publishedAt}
              readingTime={article.readingTime}
              className="col-span-2 md:col-span-1 md:col-start-1 md:row-start-1"
            />
            <div className="flex min-w-0 flex-col gap-(--space-sm) md:col-start-2 md:row-start-1">
              <h3
                className={cn(
                  'font-heading text-foreground text-xl leading-snug font-semibold tracking-tight text-balance sm:text-2xl',
                  headlineHover,
                )}
              >
                {article.title}
              </h3>
              <p className="text-muted-foreground line-clamp-2 max-w-[60ch] text-sm leading-relaxed text-pretty">
                {article.summary}
              </p>
              <div className="pt-(--space-xs)">
                <ReadLink href={article.href} title={article.title} />
              </div>
            </div>
            <StoryImage
              src={article.imageSrc}
              alt={article.imageAlt}
              className="aspect-[3/2] md:col-start-3 md:row-start-1"
              sizes="(max-width: 768px) 104px, 144px"
            />
          </article>
        </li>
      ))}
    </ul>
  );
}
