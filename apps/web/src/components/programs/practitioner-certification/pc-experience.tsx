import { ChapterMarker, Container, Section, Stack, Text } from '@tnsi/ui';
import { practitionerCertificationContent } from '@/content/practitioner-certification';

const { experience } = practitionerCertificationContent;

export function PcExperience() {
  return (
    <Section spacing="xl" className="border-border border-t" aria-label={experience.heading}>
      <Container size="xl">
        <Stack gap="2xl">
          <ChapterMarker index={experience.chapter} as="h2" title={experience.heading} />

          <div className="grid grid-cols-1 gap-(--space-2xl) sm:grid-cols-2">
            {experience.features.map((feature) => (
              <article
                key={feature.title}
                className="border-border flex flex-col gap-(--space-lg) border-t pt-(--space-xl)"
              >
                <h3 className="font-heading text-foreground text-2xl font-semibold tracking-tight">
                  {feature.title}
                </h3>
                <Text tone="muted" size="sm" className="max-w-prose leading-relaxed">
                  {feature.description}
                </Text>
              </article>
            ))}
          </div>
        </Stack>
      </Container>
    </Section>
  );
}
