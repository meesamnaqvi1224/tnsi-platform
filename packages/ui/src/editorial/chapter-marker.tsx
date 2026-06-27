import { cn } from '../lib/cn';
import { Heading } from '../primitives/heading';
import type { HeadingProps } from '../primitives/heading';

export interface ChapterMarkerProps {
  /**
   * Short chapter identifier — roman numeral, arabic, or word.
   * Appears in the mono label: "Chapter I", "Chapter 01", "Chapter One".
   */
  index: string;
  /** The chapter title, rendered as the primary heading. */
  title: string;
  /** Semantic heading level. Defaults to `h2`. */
  as?: HeadingProps['as'];
  /** Visual heading size. Defaults to `xl`. */
  size?: HeadingProps['size'];
  className?: string;
}

/**
 * Editorial chapter marker — replaces conventional Eyebrow + Heading pairs.
 *
 * Signals a major section transition using the typographic grammar of
 * long-form print journalism: a mono-spaced chapter label anchors left,
 * a hairline rule extends to the container edge, and the chapter title
 * sits below. One element; three jobs: orientation, rhythm, authority.
 *
 * Usage:
 * ```tsx
 * <ChapterMarker index="I" as="h2" title="The Capacity Journey" />
 * <ChapterMarker index="II" as="h2" size="lg" title="The Foundation" />
 * ```
 *
 * Do not use for minor sub-sections — reserve for major chapter-level
 * transitions only. Sub-sections within a chapter use `Heading` directly.
 */
export function ChapterMarker({
  index,
  title,
  as = 'h2',
  size = 'xl',
  className,
}: ChapterMarkerProps) {
  return (
    <div className={cn('flex flex-col gap-(--space-sm)', className)}>
      {/* Chapter label + full-width rule — the editorial provenance mark */}
      <div className="flex items-center gap-(--space-md)">
        <span className="shrink-0 font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Chapter {index}
        </span>
        <div className="flex-1 border-t border-border" aria-hidden />
      </div>

      <Heading as={as} size={size}>
        {title}
      </Heading>
    </div>
  );
}
