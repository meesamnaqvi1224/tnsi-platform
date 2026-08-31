import { ChapterMarker, Container, Section, Stack, Text } from '@tnsi/ui';
import { humanExpansionTheoryContent } from '@/content/human-expansion-theory';

const { theoryToPractice, evolving } = humanExpansionTheoryContent;

export function MethodPractice() {
  return (
    <>
      <Section
        spacing="xl"
        className="border-border border-t"
        aria-label={theoryToPractice.heading}
      >
        <Container size="xl">
          <Stack gap="2xl">
            <Stack gap="lg" className="max-w-2xl">
              <ChapterMarker
                index={theoryToPractice.chapter}
                as="h2"
                title={theoryToPractice.heading}
              />
              {theoryToPractice.paragraphs.map((paragraph) => (
                <Text key={paragraph} tone="muted" className="leading-relaxed">
                  {paragraph}
                </Text>
              ))}
            </Stack>

            <div className="grid grid-cols-1 gap-(--space-lg) sm:grid-cols-2">
              {theoryToPractice.pathways.map((pathway) => (
                <div
                  key={pathway.title}
                  className="border-foreground/15 flex flex-col gap-(--space-sm) border-t pt-(--space-lg)"
                >
                  <p className="font-heading text-foreground text-lg font-semibold tracking-tight">
                    {pathway.title}
                  </p>
                  <Text size="sm" tone="muted" className="leading-relaxed">
                    {pathway.description}
                  </Text>
                </div>
              ))}
            </div>
          </Stack>
        </Container>
      </Section>

      <Section spacing="xl" className="border-border border-t" aria-label={evolving.heading}>
        <Container size="xl">
          <div className="grid grid-cols-1 gap-(--space-3xl) lg:grid-cols-2 lg:gap-(--space-4xl)">
            <ChapterMarker index={evolving.chapter} as="h2" title={evolving.heading} />
            <Stack gap="lg" className="lg:pt-(--space-2xl)">
              {evolving.paragraphs.map((paragraph) => (
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
