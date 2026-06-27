import type * as React from 'react';
import { cn } from '../lib/cn';

export interface EditorialFigureProps {
  /**
   * Figure identifier — rendered as "Figure {number}." before the caption.
   * Use arabic numerals (1, 2, 3) for sequenced figures, or letters (A, B)
   * for sub-figures within a larger exhibit.
   */
  number: string | number;
  /**
   * Full caption sentence(s). Written in editorial style: complete sentences,
   * active voice, explaining what the figure shows and why it matters.
   * Not a title — a description.
   */
  caption: string;
  /**
   * Optional source citation — author, publication, year, or URL.
   * Format: "Porges, S.W. (2011). The Polyvagal Theory. W.W. Norton."
   * Omit for original Institute diagrams and illustrations.
   */
  source?: string;
  /**
   * The figure content — typically an `<img>`, `<svg>`, or a diagram
   * component. When omitted, a labelled placeholder is rendered; replace
   * with real content before shipping.
   */
  children?: React.ReactNode;
  className?: string;
}

/**
 * Publication-style figure component for diagrams, illustrations, and
 * scientific visuals.
 *
 * Follows the figure conventions of academic journals and quality editorial
 * publications: figure number + caption flow as a single paragraph below a
 * hairline rule; source citation sits beneath in smaller type. The content
 * area (image/diagram) is bordered but not decorated.
 *
 * The component does not impose an aspect ratio — that is the content's
 * responsibility (pass a sized `<img>` or a diagram with a defined height).
 * When no children are provided, a labelled placeholder is shown so layout
 * can be established before assets are available.
 *
 * Usage:
 * ```tsx
 * // With real content
 * <EditorialFigure
 *   number={1}
 *   caption="The Polyvagal Hierarchy: three levels of the autonomic nervous
 *            system and their corresponding states of physiological engagement."
 *   source="Porges, S.W. (2011). The Polyvagal Theory. W.W. Norton."
 * >
 *   <img src="/diagrams/polyvagal-hierarchy.svg" alt="..." />
 * </EditorialFigure>
 *
 * // Placeholder during development
 * <EditorialFigure
 *   number={1}
 *   caption="The Polyvagal Hierarchy."
 * />
 * ```
 *
 * Accessibility: use descriptive `alt` text on any `<img>` children.
 * The caption is not a substitute for `alt` — they serve different purposes.
 */
export function EditorialFigure({
  number,
  caption,
  source,
  children,
  className,
}: EditorialFigureProps) {
  return (
    <figure className={cn('', className)}>
      {/* Figure content area */}
      {children ? (
        <div className="overflow-hidden rounded-sm border border-border">{children}</div>
      ) : (
        /* Development placeholder — replace before shipping */
        <div className="flex min-h-[200px] items-center justify-center rounded-sm border border-border bg-secondary">
          <span className="text-sm text-muted-foreground">Figure {number} — placeholder</span>
        </div>
      )}

      {/* Caption bar — figure number + caption + optional source */}
      <figcaption className="mt-(--space-md) border-t border-border pt-(--space-sm)">
        <p className="text-sm leading-relaxed text-muted-foreground">
          <span className="font-mono text-xs">Figure {number}.</span> {caption}
        </p>
        {source && (
          <p className="mt-(--space-xs) text-xs text-muted-foreground">Source: {source}</p>
        )}
      </figcaption>
    </figure>
  );
}
