import { ChapterMarker, Container, Section, Stack, Text } from '@tnsi/ui';
import { executiveAdvisoryContent } from '@/content/executive-advisory';

const { challenge } = executiveAdvisoryContent;

export function EaChallenge() {
  return (
    <Section spacing="xl" className="border-border border-t" aria-label={challenge.heading}>
      <Container size="xl">
        <div className="grid grid-cols-1 gap-(--space-3xl) lg:grid-cols-[1fr_1.1fr] lg:gap-(--space-5xl)">
          <ChapterMarker
            index={challenge.chapter}
            as="h2"
            size="2xl"
            title={challenge.heading}
            className="lg:sticky lg:top-(--space-3xl) lg:self-start"
          />

          <Stack gap="xl" className="lg:pt-(--space-md)">
            {challenge.paragraphs.map((paragraph, index) => (
              <Text
                key={paragraph}
                tone={index === challenge.paragraphs.length - 1 ? 'default' : 'muted'}
                className={`leading-relaxed ${index === challenge.paragraphs.length - 1 ? 'text-foreground text-lg font-medium' : 'text-base'}`}
              >
                {paragraph}
              </Text>
            ))}
          </Stack>
        </div>
      </Container>
    </Section>
  );
}
