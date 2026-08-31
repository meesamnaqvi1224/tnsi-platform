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
              Find Your Pathway
            </Heading>
            <Text tone="muted" size="lg" className="max-w-xl">
              Every journey through The Nervous System Institute is different. Whether you&apos;re
              seeking personal development, advancing your professional practice, or exploring how
              Human Expansion Theory™ can inform your organization, we&apos;ll help you find the
              pathway that&apos;s right for you.
            </Text>
            <Stack direction="row" gap="sm" wrap="wrap" className="justify-center">
              <NextLink
                href="/programs"
                className={buttonVariants({ variant: 'primary', size: 'lg' })}
              >
                Explore Our Pathways
              </NextLink>
              <NextLink
                href="/book-a-call"
                className={buttonVariants({ variant: 'outline', size: 'lg' })}
              >
                Book a Discovery Call
              </NextLink>
            </Stack>
          </Stack>
        </FadeIn>
      </Container>
    </Section>
  );
}
