import NextLink from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Text } from '@tnsi/ui';
import { ResponsiveImage } from '@/components/utility/responsive-image';

export interface FeaturedResourceProps {
  title: string;
  description: string;
  imageSrc: string;
  imageAlt: string;
  href: string;
  cta?: string;
}

export function FeaturedResource({
  title,
  description,
  imageSrc,
  imageAlt,
  href,
  cta = 'Read Guide',
}: FeaturedResourceProps) {
  return (
    <article className="border-border grid min-w-0 grid-cols-1 overflow-hidden border-t lg:grid-cols-[3fr_2fr]">
      <div className="relative min-h-[50vh] overflow-hidden lg:min-h-[70vh]">
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
          <h3 className="font-heading text-foreground text-3xl leading-[1.08] font-semibold tracking-tight sm:text-4xl lg:text-5xl">
            {title}
          </h3>
          <Text tone="muted" className="leading-relaxed">
            {description}
          </Text>
          <NextLink
            href={href}
            className="interaction-text-link text-foreground group inline-flex items-center gap-(--space-sm) text-sm font-medium tracking-wide"
          >
            {cta}
            <ArrowRight aria-hidden className="interaction-arrow size-4" />
          </NextLink>
        </div>
      </div>
    </article>
  );
}
