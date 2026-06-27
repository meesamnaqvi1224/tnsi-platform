import { ChapterMarker, Container, Section, Stack, Text } from '@tnsi/ui';

export function ProgramsWhy() {
  return (
    <Section spacing="xl" className="border-border border-t" aria-label="Why programs exist">
      <Container size="xl">
        <Stack gap="2xl">
          <ChapterMarker index="I" as="h2" size="xl" title="Different journeys. One philosophy." />

          <div className="grid grid-cols-1 gap-(--space-3xl) lg:grid-cols-[1fr_2fr]">
            {/* Left column — intentionally empty; the editorial offset creates the rhythm */}
            <div />

            {/* Right column — editorial body copy */}
            <Stack gap="lg" className="max-w-prose">
              <Text tone="muted">
                Every person arrives with different experiences, responsibilities and goals. Some
                people begin with personal healing. Others want to become practitioners. Some are
                leading organisations.
              </Text>
              <Text tone="muted">
                While every journey is different, they all share the same foundation: understanding
                the nervous system, building capacity and creating lasting transformation.
              </Text>
              <Text tone="muted">
                The programs at the Institute are not designed to be attended in sequence. They are
                designed to meet you where you are — and to carry you as far as you are ready to go.
              </Text>
            </Stack>
          </div>
        </Stack>
      </Container>
    </Section>
  );
}
