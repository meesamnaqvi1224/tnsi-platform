import { Text } from '@tnsi/ui';

export interface FigureProps {
  imageAlt: string;
  caption: string;
  variant: 'inline' | 'full';
}

export function Figure({ imageAlt, caption, variant }: FigureProps) {
  if (variant === 'full') {
    return (
      <figure className="border-border relative -mx-(--space-xl) my-(--space-3xl) border-y sm:-mx-(--space-2xl) lg:-mx-[calc((100vw-min(100vw,80rem))/2+var(--space-2xl))]">
        <div className="bg-secondary aspect-[21/9] w-full">
          <div className="flex h-full items-center justify-center">
            <Text size="sm" tone="muted">
              Full-width editorial image placeholder
            </Text>
          </div>
        </div>
        <figcaption className="text-muted-foreground px-(--space-xl) py-(--space-md) text-xs leading-relaxed sm:px-(--space-2xl)">
          {caption}
        </figcaption>
        <span className="sr-only">{imageAlt}</span>
      </figure>
    );
  }

  return (
    <figure className="my-(--space-2xl)">
      <div className="bg-secondary aspect-[4/3] w-full">
        <div className="flex h-full items-center justify-center">
          <Text size="sm" tone="muted">
            Inline editorial image placeholder
          </Text>
        </div>
      </div>
      <figcaption className="text-muted-foreground mt-(--space-sm) text-xs leading-relaxed">
        {caption}
      </figcaption>
      <span className="sr-only">{imageAlt}</span>
    </figure>
  );
}
