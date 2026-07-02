import { cn } from '@tnsi/ui';
import { ResponsiveImage } from '@/components/utility/responsive-image';

interface EditorialPlaceholderProps {
  src: string;
  alt: string;
  label?: string;
  aspect?: 'landscape' | 'portrait' | 'square';
  className?: string;
  priority?: boolean;
}

const aspectClasses = {
  landscape: 'aspect-[16/10] min-h-[12rem]',
  portrait: 'aspect-[4/5] min-h-[16rem]',
  square: 'aspect-square min-h-[12rem]',
} as const;

export function EditorialPlaceholder({
  src,
  alt,
  label,
  aspect = 'landscape',
  className,
  priority = false,
}: EditorialPlaceholderProps) {
  return (
    <figure
      className={cn('relative w-full overflow-hidden rounded-sm', aspectClasses[aspect], className)}
    >
      <ResponsiveImage
        src={src}
        alt={alt}
        fill
        priority={priority}
        className="object-cover"
        sizes="(max-width: 768px) 100vw, 50vw"
      />
      {label ? (
        <figcaption className="text-muted-foreground absolute inset-x-0 bottom-4 text-center text-xs tracking-[0.12em] uppercase">
          {label}
        </figcaption>
      ) : null}
    </figure>
  );
}
