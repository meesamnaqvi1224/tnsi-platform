import { ChapterMarker, Container, Section, Stack, Text } from '@tnsi/ui';
import { FadeIn } from '@/components/utility/fade-in';
import { practitionerCertificationContent } from '@/content/practitioner-certification';

const { experience } = practitionerCertificationContent;

export function PcExperience() {
  return (
    <Section spacing="lg" className="border-foreground/15 border-t" aria-label={experience.heading}>
      <Container size="xl">
        <Stack gap="2xl">
          <FadeIn>
            <ChapterMarker index={experience.chapter} as="h2" title={experience.heading} />
          </FadeIn>

          <FadeIn delayMs={100}>
            <div className="grid grid-cols-1 gap-(--space-2xl) sm:grid-cols-2">
              {experience.features.map((feature) => (
                <article
                  key={feature.title}
                  className="border-foreground/15 flex flex-col gap-(--space-lg) border-t pt-(--space-xl)"
                >
                  <h3 className="font-heading text-foreground text-2xl font-semibold tracking-tight lg:text-3xl">
                    {feature.title}
                  </h3>
                  <Text tone="muted" className="max-w-prose leading-relaxed">
                    {feature.description}
                  </Text>
                </article>
              ))}
            </div>
          </FadeIn>
        </Stack>
      </Container>
    </Section>
  );
}
