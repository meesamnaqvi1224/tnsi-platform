import { ChapterMarker, Container, EditorialFigure, Section, Stack, Text } from '@tnsi/ui';
import { humanExpansionTheoryContent } from '@/content/human-expansion-theory';

const { developmentalConditions, polyvagalFigure } = humanExpansionTheoryContent;

export function MethodJourney() {
  return (
    <Section spacing="xl" className="border-border border-t">
      <Container size="xl">
        <Stack gap="2xl">
          <ChapterMarker
            index={developmentalConditions.chapter}
            as="h2"
            size="xl"
            title={developmentalConditions.heading}
          />

          <Text tone="muted" className="max-w-2xl">
            {developmentalConditions.intro}
          </Text>

          <div className="grid grid-cols-1 gap-(--space-lg) pt-(--space-lg) lg:grid-cols-2 xl:grid-cols-3">
            {developmentalConditions.items.map(({ title, description }) => (
              <div
                key={title}
                className="bg-secondary border-border rounded-sm border p-(--space-lg)"
              >
                <p className="font-heading text-foreground mb-(--space-sm) text-sm font-semibold tracking-tight">
                  {title}
                </p>
                <Text size="sm" tone="muted">
                  {description}
                </Text>
              </div>
            ))}
          </div>

          {/*
            No approved Polyvagal Hierarchy diagram exists in the repository —
            confirmed by search (see implementation report). EditorialFigure
            renders its built-in "Figure — placeholder" box when no children
            are supplied, so this uses Caroline's exact supplied caption and
            source without fabricating a diagram.
          */}
          <EditorialFigure
            number={1}
            caption={polyvagalFigure.caption}
            source={polyvagalFigure.source}
          />
        </Stack>
      </Container>
    </Section>
  );
}
