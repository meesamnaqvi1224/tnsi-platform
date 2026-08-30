import { Container, Heading, Section, Stack, Text } from '@tnsi/ui';

/**
 * Shown when no published assessment document exists yet for this route's
 * slug. Deliberately generic, non-error copy — this is an expected state
 * before real assessment content is authored in Sanity, not a failure.
 */
export function AssessmentUnavailable() {
  return (
    <Section spacing="xl">
      <Container size="xl">
        <Stack gap="md" className="mx-auto max-w-2xl">
          <Heading as="h1" size="xl">
            This assessment isn’t available yet
          </Heading>
          <Text tone="muted" className="max-w-prose leading-relaxed">
            Please check back soon, or get in touch if you’d like to be notified when it launches.
          </Text>
        </Stack>
      </Container>
    </Section>
  );
}
