import NextLink from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Text } from '@tnsi/ui';
import type { ResourceCollectionItem } from '@/content/resources';

export interface ResourceCollectionProps {
  collection: ResourceCollectionItem;
  index: number;
}

export function ResourceCollection({ collection, index }: ResourceCollectionProps) {
  return (
    <article className="border-border grid grid-cols-1 items-end gap-(--space-xl) border-t py-(--space-3xl) lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:gap-(--space-4xl)">
      <span className="text-muted-foreground font-mono text-sm tabular-nums">
        {String(index + 1).padStart(2, '0')}
      </span>

      <div className="flex min-w-0 flex-col gap-(--space-md)">
        <h3 className="font-heading text-foreground text-2xl font-semibold tracking-tight sm:text-3xl lg:text-4xl">
          {collection.title}
        </h3>
        <Text tone="muted" className="max-w-2xl leading-relaxed">
          {collection.description}
        </Text>
        <span className="text-muted-foreground font-mono text-xs tracking-[0.2em] uppercase">
          {collection.count}
        </span>
      </div>

      <NextLink
        href={collection.href}
        className="interaction-text-link text-foreground group inline-flex shrink-0 items-center gap-(--space-sm) self-start text-sm font-medium tracking-wide lg:self-end"
      >
        Explore Collection
        <ArrowRight aria-hidden className="interaction-arrow size-4" />
      </NextLink>
    </article>
  );
}
