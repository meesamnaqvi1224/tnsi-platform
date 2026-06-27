import NextLink from 'next/link';
import { buttonVariants, Container, Heading, Section, Stack, Text } from '@tnsi/ui';

export function CtaBand() {
  return (
    <Section spacing="lg" className="bg-secondary" aria-labelledby="cta-heading">
      <Container size="xl">
        <Stack direction="row" align="center" justify="between" wrap="wrap" gap="lg">
          <Stack gap="sm" className="max-w-xl">
            <Heading as="h2" id="cta-heading" size="xl">
              Ready to recalibrate?
            </Heading>
            <Text tone="muted">
              A thirty-minute Discovery Call to explore which program best fits your current needs
              and goals.
            </Text>
          </Stack>
          <NextLink
            href="/book-a-call"
            className={buttonVariants({ variant: 'primary', size: 'lg' })}
          >
            Book a Discovery Call
          </NextLink>
        </Stack>
      </Container>
    </Section>
  );
}
