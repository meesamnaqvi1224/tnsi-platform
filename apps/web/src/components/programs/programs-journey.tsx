import { CapacityJourney, Container, Section, Stack } from '@tnsi/ui';

export function ProgramsJourney() {
  return (
    <Section spacing="xl" className="border-border border-t" aria-label="The Capacity Journey">
      <Container size="xl">
        <Stack gap="2xl">
          <h2 className="font-heading text-foreground text-2xl font-semibold tracking-tight sm:text-3xl lg:text-4xl">
            The Capacity Journey
          </h2>
          <CapacityJourney />
        </Stack>
      </Container>
    </Section>
  );
}
