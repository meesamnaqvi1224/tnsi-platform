import { ChapterMarker, Container, Section, Stack, Text } from '@tnsi/ui';
import { facultyContent } from '@/content/faculty';

const { teachingPhilosophy } = facultyContent;

export function TeachingPhilosophy() {
  return (
    <Section
      spacing="xl"
      className="border-border bg-secondary/25 border-t"
      aria-label={teachingPhilosophy.headline}
    >
      <Container size="xl">
        <Stack gap="3xl">
          <ChapterMarker index={teachingPhilosophy.chapter} as="h2" title="Teaching Philosophy" />

          <h3 className="font-heading text-foreground max-w-4xl text-3xl leading-[1.1] font-semibold tracking-tight sm:text-4xl lg:text-5xl">
            {teachingPhilosophy.headline}
          </h3>

          <Stack gap="lg" className="max-w-3xl">
            {teachingPhilosophy.paragraphs.map((paragraph) => (
              <Text key={paragraph} tone="muted" className="text-base leading-relaxed lg:text-lg">
                {paragraph}
              </Text>
            ))}
          </Stack>
        </Stack>
      </Container>
    </Section>
  );
}
