import { ResponsiveImage } from '@/components/utility/responsive-image';

export interface FigureProps {
  imageSrc?: string;
  imageAlt: string;
  caption: string;
  variant: 'inline' | 'full';
}

export function Figure({ imageSrc, imageAlt, caption, variant }: FigureProps) {
  const src = imageSrc ?? '/images/articles/figure-inline.webp';

  if (variant === 'full') {
    return (
      <figure className="border-border relative -mx-(--space-xl) my-(--space-3xl) border-y sm:-mx-(--space-2xl) lg:-mx-[calc((100vw-min(100vw,80rem))/2+var(--space-2xl))]">
        <div className="bg-secondary relative aspect-[21/9] w-full overflow-hidden">
          <ResponsiveImage src={src} alt={imageAlt} fill className="object-cover" sizes="100vw" />
        </div>
        <figcaption className="text-muted-foreground px-(--space-xl) py-(--space-md) text-xs leading-relaxed sm:px-(--space-2xl)">
          {caption}
        </figcaption>
      </figure>
    );
  }

  return (
    <figure className="my-(--space-2xl)">
      <div className="bg-secondary relative aspect-[4/3] w-full overflow-hidden">
        <ResponsiveImage
          src={src}
          alt={imageAlt}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 760px"
        />
      </div>
      <figcaption className="text-muted-foreground mt-(--space-sm) text-xs leading-relaxed">
        {caption}
      </figcaption>
    </figure>
  );
}
