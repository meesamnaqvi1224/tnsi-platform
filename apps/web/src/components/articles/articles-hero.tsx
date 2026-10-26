import NextLink from 'next/link';
import { ArrowDown } from 'lucide-react';
import { Container } from '@tnsi/ui';
import { ResponsiveImage } from '@/components/utility/responsive-image';
import { articlesContent } from '@/content/articles';

const { hero } = articlesContent;

/**
 * The masthead. The title and introduction sit on the page ground and the
 * photograph beside them is cropped to a fixed frame, so the image is part of
 * the composition instead of a backdrop the text has to be read over. The
 * whole block stays well under a screen tall, so the first article is already
 * hinted at on arrival.
 */
export function ArticlesHero() {
  return (
    <section aria-labelledby="articles-hero-heading" className="border-border border-b">
      <Container
        size="xl"
        className="grid grid-cols-1 gap-x-(--space-2xl) gap-y-(--space-2xl) py-(--space-3xl) md:grid-cols-12 md:items-end lg:gap-x-(--space-3xl) lg:py-(--space-4xl)"
      >
        <div className="flex flex-col gap-(--space-xl) md:col-span-6 lg:col-span-5 lg:pb-(--space-sm)">
          <p className="text-muted-foreground font-mono text-[0.6875rem] tracking-[0.18em] uppercase">
            {hero.eyebrow}
          </p>

          <h1
            id="articles-hero-heading"
            className="font-heading text-foreground text-6xl leading-[0.92] font-semibold tracking-tight sm:text-7xl lg:text-[6.5rem]"
          >
            {hero.headline}
          </h1>

          <div className="flex flex-col gap-(--space-md)">
            <p className="font-heading text-foreground max-w-[30ch] text-2xl leading-snug font-medium text-balance sm:text-3xl">
              {hero.supportingHeadline}
            </p>
            <p className="text-muted-foreground max-w-[44ch] leading-relaxed">
              {hero.supportingCopy}
            </p>
          </div>

          <NextLink
            href={hero.primaryCta.href}
            className="interaction-text-link text-foreground group inline-flex w-fit items-center gap-(--space-sm) text-sm font-medium tracking-wide"
          >
            {hero.primaryCta.label}
            <ArrowDown
              aria-hidden
              className="duration-base ease-standard size-4 transition-transform group-hover:translate-y-1 motion-reduce:transition-none"
            />
          </NextLink>
        </div>

        <div className="bg-secondary relative aspect-[4/3] overflow-hidden md:col-span-6 md:aspect-[4/5] lg:col-span-7 lg:aspect-[5/4]">
          <ResponsiveImage
            src={hero.imageSrc}
            alt={hero.imageAlt}
            fill
            priority
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 58vw"
            className="object-cover object-[60%_50%]"
          />
        </div>
      </Container>
    </section>
  );
}
