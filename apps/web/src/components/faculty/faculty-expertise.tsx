import { ResponsiveImage } from '@/components/utility/responsive-image';
import NextLink from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Text } from '@tnsi/ui';
import type { FacultyExpertiseItem } from '@/content/faculty';

export interface FacultyExpertiseProps {
  item: FacultyExpertiseItem;
}

export function FacultyExpertise({ item }: FacultyExpertiseProps) {
  const imageFirst = item.layout === 'image-left';

  return (
    <article className="border-border grid min-w-0 grid-cols-1 items-stretch overflow-hidden border-t lg:grid-cols-2">
      <div
        className={`relative min-h-[40vh] overflow-hidden ${imageFirst ? 'lg:order-1' : 'lg:order-2'}`}
      >
        <ResponsiveImage
          src={item.imageSrc}
          alt={item.imageAlt}
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
            {item.title}
          </h3>
          <Text tone="muted" className="leading-relaxed">
            {item.summary}
          </Text>
          <NextLink
            href={item.href}
            className="interaction-opacity interaction-focus text-foreground group inline-flex items-center gap-(--space-sm) text-sm font-medium tracking-wide hover:opacity-80"
          >
            Learn More
            <ArrowRight aria-hidden className="interaction-arrow size-4" />
          </NextLink>
        </div>
      </div>
    </article>
  );
}
