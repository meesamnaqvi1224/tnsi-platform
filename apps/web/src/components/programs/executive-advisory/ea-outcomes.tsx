import { Container, Heading, Section } from '@tnsi/ui';
import { FadeIn } from '@/components/utility/fade-in';
import { executiveAdvisoryContent } from '@/content/executive-advisory';

const { outcomes } = executiveAdvisoryContent;

export function EaOutcomes() {
  return (
    <Section
      id="ea-outcomes"
      spacing="xl"
      className="border-border scroll-mt-36 border-t py-(--space-4xl) sm:py-(--space-5xl)"
      aria-label={outcomes.heading}
    >
      <Container size="xl">
        <FadeIn>
          <Heading as="h2" size="xl" className="mb-(--space-3xl)">
            {outcomes.heading}
          </Heading>
        </FadeIn>

        <div className="grid grid-cols-1 gap-(--space-4xl) lg:grid-cols-[1fr_2fr] lg:gap-(--space-5xl)">
          {/* The pattern this addresses — quieter, smaller, a premise rather than the point. */}
          <FadeIn>
            <p className="text-muted-foreground mb-(--space-md) font-mono text-xs tracking-[0.2em] uppercase">
              {outcomes.before.label}
            </p>
            <ul className="flex flex-col gap-(--space-sm)" role="list">
              {outcomes.before.items.map((item) => (
                <li key={item} className="text-muted-foreground text-sm leading-relaxed">
                  {item}
                </li>
              ))}
            </ul>
          </FadeIn>

          {/* The actual outcomes — large numbered statements, the real payoff of the section. */}
          <ol className="flex flex-col">
            {outcomes.after.items.map((item, index) => (
              <FadeIn key={item} delayMs={index * 70}>
                <li className="border-foreground/10 grid grid-cols-[3rem_1fr] gap-(--space-lg) border-t py-(--space-xl) first:border-t-0 sm:grid-cols-[4rem_1fr]">
                  <span className="font-heading text-foreground/25 text-3xl font-semibold tracking-tight sm:text-4xl">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <p className="font-heading text-foreground text-xl leading-[1.25] font-semibold tracking-tight sm:text-2xl lg:text-[1.75rem]">
                    {item}
                  </p>
                </li>
              </FadeIn>
            ))}
          </ol>
        </div>
      </Container>
    </Section>
  );
}
