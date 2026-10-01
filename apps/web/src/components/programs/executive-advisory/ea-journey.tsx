import { Container, Section, Text } from '@tnsi/ui';
import { FadeIn } from '@/components/utility/fade-in';
import { executiveAdvisoryContent } from '@/content/executive-advisory';
import { EaJourneyPhases } from './ea-journey-phases';

const { journey } = executiveAdvisoryContent;

/**
 * The signature section of the page. Same dark brand treatment as before —
 * only the internal composition changes, from a static stacked list to a
 * sticky rail (desktop) that tracks which phase is in view. See
 * `EaJourneyPhases` for the scroll-tracking itself.
 */
export function EaJourney() {
  return (
    <Section
      id="ea-phases"
      spacing="xl"
      className="border-border bg-foreground text-background scroll-mt-36 border-t"
      aria-label={journey.heading}
    >
      <Container size="xl">
        <FadeIn className="mx-auto mb-(--space-4xl) max-w-2xl text-center">
          <h2 className="font-heading text-3xl leading-[1.1] font-semibold tracking-tight sm:text-4xl lg:text-5xl">
            {journey.heading}
          </h2>
          <Text className="text-background/70 mt-(--space-lg) leading-relaxed">
            {journey.intro}
          </Text>
        </FadeIn>

        <EaJourneyPhases steps={journey.steps} />
      </Container>
    </Section>
  );
}
