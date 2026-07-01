import { ChapterMarker, Container, Section, Stack, Text } from '@tnsi/ui';
import { researchContent } from '@/content/research';

const { philosophy } = researchContent;

export function ResearchPhilosophy() {
  return (
    <Section
      id={philosophy.id}
      spacing="xl"
      className="border-border border-t"
      aria-label={philosophy.heading}
    >
      <Container size="xl">
        <div className="grid grid-cols-1 gap-(--space-3xl) lg:grid-cols-[1fr_1.2fr] lg:gap-(--space-5xl)">
          <ChapterMarker
            index={philosophy.chapter}
            as="h2"
            size="2xl"
            title={philosophy.heading}
            className="lg:sticky lg:top-(--space-3xl) lg:self-start"
          />

          <Stack gap="lg">
            {philosophy.paragraphs.map((paragraph) => (
              <Text key={paragraph} tone="muted" className="text-base leading-relaxed">
                {paragraph}
              </Text>
            ))}
            <Text className="text-foreground border-border mt-(--space-md) border-t pt-(--space-xl) text-lg leading-relaxed font-medium italic">
              {philosophy.closing}
            </Text>
          </Stack>
        </div>
      </Container>
    </Section>
  );
}
