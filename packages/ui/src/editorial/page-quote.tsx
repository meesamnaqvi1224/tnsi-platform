import { cn } from '../lib/cn';

export interface PageQuoteProps {
  quote: string;
  /** Attribution — name and role. Omit for anonymous or self-evident sources. */
  author?: string;
  className?: string;
}

/**
 * Quiet recurring page quote — the colophon of a section.
 *
 * Always positioned after the intellectual content of a section, never at
 * the top. Its quietness is intentional: small italic serif, hairline rule
 * above, narrow centered column. It does not announce itself. It waits for
 * the reader who is still paying attention.
 *
 * The typographic equivalent of a margin note in a well-read book. When
 * placed before `SiteFooter`, it creates a moment of stillness before the
 * page ends — a breath, not a summary.
 *
 * Usage:
 * ```tsx
 * <PageQuote
 *   quote="The body has always known what it needed. We are simply learning to listen."
 *   author="Caroline Reed — Founder & Director"
 * />
 * ```
 *
 * Do not use as a marketing testimonial — for social proof, build a
 * separate testimonial component. This component is for the Institute's
 * own philosophy, not for external validation.
 */
export function PageQuote({ quote, author, className }: PageQuoteProps) {
  return (
    <div className={cn('border-t border-border py-(--space-2xl)', className)}>
      <div className="mx-auto max-w-xl text-center">
        <blockquote>
          <p className="font-heading text-xl font-semibold italic leading-relaxed tracking-tight text-foreground">
            &ldquo;{quote}&rdquo;
          </p>
          {author && (
            <footer className="mt-(--space-md)">
              <cite className="not-italic text-xs text-muted-foreground">— {author}</cite>
            </footer>
          )}
        </blockquote>
      </div>
    </div>
  );
}
