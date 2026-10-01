import { Container, Heading, Section, Text } from '@tnsi/ui';
import { EditorialImage } from '@/components/utility/editorial-image';
import { FadeIn } from '@/components/utility/fade-in';
import { executiveAdvisoryContent } from '@/content/executive-advisory';

const { audience } = executiveAdvisoryContent;

/**
 * Numbered editorial objects rather than a service grid — large index
 * numerals carry the visual weight the titles used to carry alone, and the
 * portrait alongside gives the section its one quiet photographic moment
 * instead of ending on four bare lines of text.
 */
export function EaAudience() {
  return (
    <Section
      spacing="lg"
      className="border-border bg-secondary/40 border-t"
      aria-label={audience.heading}
    >
      <Container size="xl">
        <div className="grid grid-cols-1 gap-(--space-3xl) lg:grid-cols-[3fr_2fr] lg:gap-(--space-5xl)">
          <div>
            <FadeIn>
              <Heading as="h2" size="xl" className="mb-(--space-2xl)">
                {audience.heading}
              </Heading>
            </FadeIn>

            <div role="list" aria-label="Who we work with">
              {audience.cards.map((card, index) => (
                <FadeIn key={card.title} delayMs={index * 80}>
                  <article
                    role="listitem"
                    className="border-foreground/15 group grid grid-cols-[3rem_1fr] gap-(--space-lg) border-t py-(--space-xl) sm:grid-cols-[4rem_1fr]"
                  >
                    <span className="font-heading text-foreground/25 interaction-transform duration-slow ease-standard text-3xl font-semibold tracking-tight group-hover:-translate-y-0.5 sm:text-4xl">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div className="interaction-transform duration-slow ease-standard flex flex-col gap-(--space-xs) group-hover:translate-x-1">
                      <h3 className="font-heading text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
                        {card.title}
                      </h3>
                      <Text
                        tone="muted"
                        size="sm"
                        className="interaction-colors duration-slow ease-standard group-hover:text-foreground max-w-md leading-relaxed"
                      >
                        {card.description}
                      </Text>
                    </div>
                  </article>
                </FadeIn>
              ))}
            </div>
          </div>

          <FadeIn delayMs={160} className="hidden lg:block">
            <EditorialImage
              src="/images/programs/nav-executive.webp"
              alt="An executive pauses in thought beside a window, a stack of books on the sill."
              aspect="portrait"
              className="h-full rounded-lg"
              sizes="33vw"
            />
          </FadeIn>
        </div>
      </Container>
    </Section>
  );
}
