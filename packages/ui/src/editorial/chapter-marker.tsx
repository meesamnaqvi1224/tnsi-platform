import { cn } from '../lib/cn';
import { Heading } from '../primitives/heading';
import type { HeadingProps } from '../primitives/heading';

export interface ChapterMarkerProps {
  /**
   * Short chapter identifier — roman numeral, arabic, or word. Retained on
   * the type for call-site compatibility; no longer rendered (site-wide
   * "chapter" labelling removed per Caroline Reed's revision feedback,
   * 2026-09). The hairline rule below still marks the section transition.
   */
  index: string;
  /** The chapter title, rendered as the primary heading. */
  title: string;
  /** Semantic heading level. Defaults to `h2`. */
  as?: HeadingProps['as'];
  /** Visual heading size. Defaults to `xl`. */
  size?: HeadingProps['size'];
  /** Optional id for the chapter title heading — use with `aria-labelledby` on parent sections. */
  headingId?: string;
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
  title,
  as = 'h2',
  size = 'xl',
  headingId,
  className,
}: ChapterMarkerProps) {
  return (
    <div className={cn('flex flex-col gap-(--space-sm)', className)}>
      {/* Full-width rule — the editorial section-transition mark */}
      <div className="border-t border-border" aria-hidden />

      <Heading as={as} id={headingId} size={size}>
        {title}
      </Heading>
    </div>
  );
}
