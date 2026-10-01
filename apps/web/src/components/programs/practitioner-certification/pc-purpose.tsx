import { ChapterMarker, Container, Section, Stack, Text } from '@tnsi/ui';
import { FadeIn } from '@/components/utility/fade-in';
import { practitionerCertificationContent } from '@/content/practitioner-certification';

const { purpose } = practitionerCertificationContent;

export function PcPurpose() {
  return (
    <Section spacing="lg" className="border-foreground/15 border-t" aria-label={purpose.heading}>
      <Container size="xl">
        <div className="grid grid-cols-1 gap-(--space-3xl) lg:grid-cols-2 lg:gap-(--space-4xl)">
          <FadeIn>
            <ChapterMarker index={purpose.chapter} as="h2" size="2xl" title={purpose.heading} />
          </FadeIn>

          <FadeIn delayMs={100}>
            <Stack gap="lg" className="lg:pt-(--space-2xl)">
              {purpose.paragraphs.map((paragraph) => (
                <Text key={paragraph} tone="muted" size="lg" className="leading-[1.7]">
                  {paragraph}
                </Text>
              ))}
            </Stack>
          </FadeIn>
        </div>
      </Container>
    </Section>
  );
}
