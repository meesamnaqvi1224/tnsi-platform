import { Container, Section } from '@tnsi/ui';
import { FadeIn } from '@/components/utility/fade-in';
import { humanExpansionTheoryContent } from '@/content/human-expansion-theory';

const { quote } = humanExpansionTheoryContent;

/**
 * The existing quotation as a quiet editorial pause: display-scale italic
 * serif, centred in generous whitespace, revealed once as it enters (the
 * whole quotation together — never word by word). Same typographic voice as
 * the shared `PageQuote`, scaled up for this page.
 */
export function MethodPullQuote() {
  return (
    <Section
      data-chapter
      className="border-border border-t py-(--space-5xl) sm:py-[10rem]"
      aria-label="Quotation"
    >
      <Container size="xl">
        <FadeIn>
          <blockquote className="mx-auto max-w-4xl text-center">
            <p className="font-heading text-foreground text-[clamp(1.75rem,3.6vw,3.25rem)] leading-[1.25] font-medium tracking-tight text-balance italic">
              &ldquo;{quote.quote}&rdquo;
            </p>
            <footer className="mt-(--space-xl)">
              <cite className="text-foreground/70 text-sm tracking-[0.04em] not-italic">
                — {quote.author}
              </cite>
            </footer>
          </blockquote>
        </FadeIn>
      </Container>
    </Section>
  );
}
