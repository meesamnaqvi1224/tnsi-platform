import { ChapterMarker, Container, Section, Stack, Text } from '@tnsi/ui';
import { executiveAdvisoryContent } from '@/content/executive-advisory';

const { audience } = executiveAdvisoryContent;

export function EaAudience() {
  return (
    <Section
      spacing="xl"
      className="border-border bg-secondary/40 border-t"
      aria-label={audience.heading}
    >
      <Container size="xl">
        <Stack gap="3xl">
          <ChapterMarker index={audience.chapter} as="h2" title={audience.heading} />

          <div
            className="grid grid-cols-1 gap-(--space-2xl) md:grid-cols-2 lg:grid-cols-3"
            role="list"
            aria-label="Executive audiences"
          >
            {audience.cards.map((card) => (
              <article
                key={card.title}
                role="listitem"
                className="flex flex-col gap-(--space-lg) py-(--space-md)"
              >
                <h3 className="font-heading text-foreground text-2xl font-semibold tracking-tight lg:text-3xl">
                  {card.title}
                </h3>
                <Text tone="muted" size="sm" className="leading-relaxed">
                  {card.description}
                </Text>
              </article>
            ))}
          </div>
        </Stack>
      </Container>
    </Section>
  );
}
