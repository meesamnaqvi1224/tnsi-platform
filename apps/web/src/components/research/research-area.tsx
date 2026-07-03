import NextLink from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Text } from '@tnsi/ui';
import { ResponsiveImage } from '@/components/utility/responsive-image';
import type { ResearchAreaItem } from '@/content/research';

export interface ResearchAreaProps {
  area: ResearchAreaItem;
}

export function ResearchArea({ area }: ResearchAreaProps) {
  const imageFirst = area.layout === 'image-left';

  return (
    <article className="border-border grid min-w-0 grid-cols-1 items-center overflow-hidden border-t lg:grid-cols-2">
      <div
        className={`bg-secondary relative min-h-[45vh] overflow-hidden ${imageFirst ? 'lg:order-1' : 'lg:order-2'}`}
      >
        <ResponsiveImage
          src={area.imageSrc}
          alt={area.imageAlt}
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 50vw"
        />
      </div>

      <div
        className={`flex flex-col justify-center px-(--space-xl) py-(--space-3xl) sm:px-(--space-2xl) ${imageFirst ? 'lg:order-2 lg:pl-(--space-4xl)' : 'lg:order-1 lg:pr-(--space-4xl)'}`}
      >
        <div className="flex max-w-lg flex-col gap-(--space-lg)">
          <h3 className="font-heading text-foreground text-2xl font-semibold tracking-tight sm:text-3xl lg:text-4xl">
            {area.title}
          </h3>
          <Text tone="muted" className="leading-relaxed">
            {area.summary}
          </Text>
          <NextLink
            href={area.href}
            className="interaction-text-link text-foreground group inline-flex items-center gap-(--space-sm) text-sm font-medium tracking-wide"
          >
            Learn More
            <ArrowRight aria-hidden className="interaction-arrow size-4" />
          </NextLink>
        </div>
      </div>
    </article>
  );
}
