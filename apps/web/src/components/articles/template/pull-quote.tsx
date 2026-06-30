export interface PullQuoteProps {
  quote: string;
  attribution?: string;
}

export function PullQuote({ quote, attribution }: PullQuoteProps) {
  return (
    <figure className="border-border my-(--space-3xl) border-y py-(--space-2xl)">
      <blockquote>
        <p className="font-heading text-foreground text-2xl leading-snug font-semibold tracking-tight lg:text-3xl">
          &ldquo;{quote}&rdquo;
        </p>
        {attribution && (
          <figcaption className="text-muted-foreground mt-(--space-md) text-sm">
            — {attribution}
          </figcaption>
        )}
      </blockquote>
    </figure>
  );
}
