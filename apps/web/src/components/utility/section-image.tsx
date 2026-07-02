import { cn } from '@tnsi/ui';
import { ResponsiveImage } from '@/components/utility/responsive-image';

interface SectionImageProps {
  src: string;
  alt: string;
  priority?: boolean;
  className?: string;
  imageClassName?: string;
  sizes?: string;
}

export function SectionImage({
  src,
  alt,
  priority = false,
  className,
  imageClassName = 'object-cover',
  sizes = '100vw',
}: SectionImageProps) {
  return (
    <div className={cn('absolute inset-0', className)} aria-hidden={alt ? undefined : true}>
      <ResponsiveImage
        src={src}
        alt={alt}
        fill
        priority={priority}
        className={imageClassName}
        sizes={sizes}
      />
    </div>
  );
}
