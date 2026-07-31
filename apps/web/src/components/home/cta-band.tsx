import NextLink from 'next/link';
import { buttonVariants, Container, Heading, Section, Stack, Text } from '@tnsi/ui';
import { FadeIn } from '@/components/utility/fade-in';

export function CtaBand() {
  return (
    <Section
      spacing="xl"
      className="bg-secondary py-(--space-4xl) sm:py-(--space-5xl)"
      aria-labelledby="cta-heading"
    >
      <Container size="md">
        <FadeIn>
          <Stack gap="lg" align="center" className="text-center">
            <Heading as="h2" id="cta-heading" size="2xl" className="text-4xl sm:text-5xl">
              Ready to begin?
            </Heading>
            <Text tone="muted" size="lg" className="max-w-md">
              Not everyone needs the same pathway. Let&apos;s discover where yours begins.
            </Text>
            <NextLink
              href="/book-a-call"
              className={buttonVariants({ variant: 'primary', size: 'lg' })}
            >
              Book a Discovery Call
            </NextLink>
          </Stack>
        </FadeIn>
      </Container>
    </Section>
  );
}
