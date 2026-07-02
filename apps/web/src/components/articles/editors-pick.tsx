import NextLink from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Text } from '@tnsi/ui';
import type { EditorsPickItem } from '@/content/articles';

export interface EditorsPickProps {
  pick: EditorsPickItem;
}

export function EditorsPick({ pick }: EditorsPickProps) {
  const imageFirst = pick.layout === 'image-left';

  return (
    <article className="border-border grid grid-cols-1 items-center border-t lg:grid-cols-2">
      <div
        className={`bg-secondary relative min-h-[45vh] ${imageFirst ? 'lg:order-1' : 'lg:order-2'}`}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <Text size="sm" tone="muted" className="max-w-[12rem] text-center">
            Editor&apos;s pick photography placeholder
          </Text>
        </div>
        <span className="sr-only">{pick.imageAlt}</span>
      </div>

      <div
        className={`flex flex-col justify-center px-(--space-xl) py-(--space-3xl) sm:px-(--space-2xl) ${imageFirst ? 'lg:order-2 lg:pl-(--space-4xl)' : 'lg:order-1 lg:pr-(--space-4xl)'}`}
      >
        <div className="flex max-w-lg flex-col gap-(--space-lg)">
          <h3 className="font-heading text-foreground text-2xl font-semibold tracking-tight sm:text-3xl lg:text-4xl">
            {pick.title}
          </h3>
          <Text tone="muted" className="leading-relaxed">
            {pick.summary}
          </Text>
          <NextLink
            href={pick.href}
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
