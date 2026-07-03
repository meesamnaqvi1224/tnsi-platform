import NextLink from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Text } from '@tnsi/ui';
import { ResponsiveImage } from '@/components/utility/responsive-image';
import type { ResourceItem } from '@/content/resources';

export interface ResourceCardProps {
  resource: ResourceItem;
}

export function ResourceCard({ resource }: ResourceCardProps) {
  const imageFirst = resource.layout === 'image-left';

  return (
    <article className="border-border grid min-w-0 grid-cols-1 items-center overflow-hidden border-t lg:grid-cols-2">
      <div
        className={`bg-secondary relative min-h-[40vh] overflow-hidden ${imageFirst ? 'lg:order-1' : 'lg:order-2'}`}
      >
        <ResponsiveImage
          src={resource.imageSrc}
          alt={resource.imageAlt}
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 50vw"
        />
      </div>

      <div
        className={`flex flex-col justify-center px-(--space-xl) py-(--space-3xl) sm:px-(--space-2xl) ${imageFirst ? 'lg:order-2 lg:pl-(--space-4xl)' : 'lg:order-1 lg:pr-(--space-4xl)'}`}
      >
        <div className="flex max-w-lg flex-col gap-(--space-lg)">
          <div className="flex flex-col gap-(--space-xs)">
            <span className="text-muted-foreground font-mono text-[0.625rem] tracking-[0.15em] uppercase">
              {resource.category}
            </span>
            <span className="text-muted-foreground text-xs">
              {resource.publishedAt} · {resource.readingTime}
            </span>
          </div>

          <h3 className="font-heading text-foreground text-2xl font-semibold tracking-tight sm:text-3xl lg:text-4xl">
            {resource.title}
          </h3>

          <Text tone="muted" size="sm" className="leading-relaxed">
            {resource.summary}
          </Text>

          <NextLink
            href={resource.href}
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
