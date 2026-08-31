import { ChapterMarker, Container, Section, Stack, Text } from '@tnsi/ui';
import { humanExpansionTheoryContent } from '@/content/human-expansion-theory';

const { whyNewFramework, centralProposition } = humanExpansionTheoryContent;

export function MethodFoundation() {
  return (
    <>
      <Section
        id="why-a-new-framework"
        spacing="xl"
        className="border-border border-t"
        aria-label={whyNewFramework.heading}
      >
        <Container size="xl">
          <div className="grid grid-cols-1 gap-(--space-3xl) lg:grid-cols-2 lg:gap-(--space-4xl)">
            <ChapterMarker
              index={whyNewFramework.chapter}
              as="h2"
              size="2xl"
              title={whyNewFramework.heading}
            />
            <Stack gap="lg" className="lg:pt-(--space-2xl)">
              {whyNewFramework.paragraphs.map((paragraph) => (
                <Text key={paragraph} tone="muted" className="text-base leading-relaxed">
                  {paragraph}
                </Text>
              ))}
            </Stack>
          </div>
        </Container>
      </Section>

      <Section
        spacing="xl"
        className="border-border bg-secondary border-t"
        aria-label={centralProposition.heading}
      >
        <Container size="xl">
          <div className="grid grid-cols-1 gap-(--space-3xl) lg:grid-cols-[1fr_1.1fr] lg:gap-(--space-5xl)">
            <ChapterMarker
              index={centralProposition.chapter}
              as="h2"
              title={centralProposition.heading}
              className="lg:sticky lg:top-(--space-3xl) lg:self-start"
            />
            <Stack gap="xl" className="lg:pt-(--space-md)">
              <Text className="text-foreground text-lg leading-relaxed font-medium">
                {centralProposition.statement}
              </Text>
              {centralProposition.paragraphs.map((paragraph) => (
                <Text key={paragraph} tone="muted" className="text-base leading-relaxed">
                  {paragraph}
                </Text>
              ))}
            </Stack>
          </div>
        </Container>
      </Section>
    </>
  );
}
