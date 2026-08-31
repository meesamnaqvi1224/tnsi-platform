import { ChapterMarker, Container, Section, Stack, Text } from '@tnsi/ui';
import { humanExpansionTheoryContent } from '@/content/human-expansion-theory';

const { protectionParticipation } = humanExpansionTheoryContent;

export function MethodProtectionParticipation() {
  return (
    <Section
      spacing="xl"
      className="border-border bg-secondary border-t"
      aria-label={protectionParticipation.heading}
    >
      <Container size="xl">
        <Stack gap="2xl">
          <Stack gap="lg" className="max-w-2xl">
            <ChapterMarker
              index={protectionParticipation.chapter}
              as="h2"
              title={protectionParticipation.heading}
            />
            <Text tone="muted" className="leading-relaxed">
              {protectionParticipation.intro}
            </Text>
          </Stack>

          <div className="grid grid-cols-1 gap-(--space-2xl) lg:grid-cols-2 lg:gap-(--space-4xl)">
            <div className="border-foreground/15 border-t pt-(--space-lg)">
              <p className="font-heading text-foreground mb-(--space-sm) text-xl font-semibold tracking-tight">
                {protectionParticipation.protection.title}
              </p>
              <Text tone="muted" className="leading-relaxed">
                {protectionParticipation.protection.description}
              </Text>
            </div>
            <div className="border-foreground/15 border-t pt-(--space-lg)">
              <p className="font-heading text-foreground mb-(--space-sm) text-xl font-semibold tracking-tight">
                {protectionParticipation.participation.title}
              </p>
              <Text tone="muted" className="leading-relaxed">
                {protectionParticipation.participation.description}
              </Text>
            </div>
          </div>

          <Text className="text-foreground max-w-2xl text-lg leading-relaxed font-medium">
            {protectionParticipation.closing}
          </Text>
        </Stack>
      </Container>
    </Section>
  );
}
