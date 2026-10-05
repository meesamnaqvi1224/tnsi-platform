import type * as React from 'react';
import { cn } from '@tnsi/ui';
import { ImageReveal } from '@/components/utility/image-reveal';
import { ResponsiveImage } from '@/components/utility/responsive-image';

interface MethodImageSectionProps {
  src: string;
  /** Flat dark overlay (no gradient). Sized per photograph so body copy stays ≥ 4.5:1 over its brightest areas. */
  scrim: string;
  'aria-label': string;
  children: React.ReactNode;
  className?: string;
}

/**
 * A chapter set over an existing photograph: the image settles in as it
 * enters (the page's single image-motion pattern), a flat dark scrim sits
 * over it, and the content is rendered in the `dark` token scope so every
 * colour still comes from the theme tokens rather than hardcoded white.
 * The photograph is decorative (`alt=""`); the chapter's own heading carries
 * the meaning.
 */
export function MethodImageSection({
  src,
  scrim,
  children,
  className,
  'aria-label': ariaLabel,
}: MethodImageSectionProps) {
  return (
    <section
      data-chapter
      data-tone="dark"
      aria-label={ariaLabel}
      className="border-border relative overflow-hidden border-t"
    >
      <ImageReveal>
        <ResponsiveImage src={src} alt="" fill className="object-cover" sizes="100vw" />
      </ImageReveal>
      <div className={cn('absolute inset-0', scrim)} aria-hidden />
      <div
        className={cn(
          'dark text-foreground relative py-(--space-4xl) sm:py-(--space-5xl)',
          className,
        )}
      >
        {children}
      </div>
    </section>
  );
}
