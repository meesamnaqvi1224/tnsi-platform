import { Container, Section } from '@tnsi/ui';
import { FadeIn } from '@/components/utility/fade-in';

/**
 * The page's thesis, as a typographic chapter of its own now that its
 * photograph is the hero: the existing statement at display scale, left
 * aligned in generous space. One sentence, one pause, before the argument
 * begins.
 */
export function MethodStatement() {
  return (
    <Section
      data-chapter
      aria-label="Editorial statement"
      className="border-border border-t py-(--space-5xl) sm:py-[9rem]"
    >
      <Container size="xl">
        <FadeIn>
          <p className="font-heading text-foreground max-w-5xl text-[clamp(2.25rem,5.2vw,4.5rem)] leading-[1.1] font-semibold tracking-tight">
            Healing doesn&apos;t begin when you think differently.
            <br />
            It begins when your nervous system experiences safety.
          </p>
        </FadeIn>
      </Container>
    </Section>
  );
}
