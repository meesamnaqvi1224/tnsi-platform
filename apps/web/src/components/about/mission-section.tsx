import { Container, Eyebrow, Heading, Section, Stack, Text } from '@tnsi/ui';

export function MissionSection() {
  return (
    <Section spacing="xl" aria-labelledby="mission-heading">
      <Container size="xl">
        <div className="grid grid-cols-1 items-center gap-[var(--space-2xl)] lg:grid-cols-2 lg:gap-[var(--space-3xl)]">
          <Stack gap="md">
            <Eyebrow>The Institute</Eyebrow>
            <Heading as="h2" id="mission-heading" size="xl">
              Why TNSI exists.
            </Heading>
            <Text tone="muted" className="max-w-prose">
              Achievement culture rewards performance at any physiological cost. The women and
              leaders who reach us have often succeeded by every external measure — and are
              exhausted, dysregulated, or quietly burning out behind their accomplishments.
            </Text>
            <Text tone="muted" className="max-w-prose">
              Our Institute was founded on a single premise: that sustainable success is only
              possible from a regulated nervous system. We translate the science — polyvagal theory,
              attachment research, somatic approaches — into structured education that creates
              lasting change rather than temporary relief.
            </Text>
          </Stack>

          {/* TODO: swap for approved editorial still-life asset once added to apps/web/public */}
          <div className="border-border bg-secondary relative aspect-[4/3] w-full overflow-hidden rounded-lg border">
            <div className="absolute inset-0 flex items-center justify-center">
              <Text size="sm" tone="muted">
                Editorial image placeholder
              </Text>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
