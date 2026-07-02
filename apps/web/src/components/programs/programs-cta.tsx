import NextLink from 'next/link';
import { buttonVariants, Container, Section, Stack, Text } from '@tnsi/ui';

export function ProgramsCta() {
  return (
    <Section spacing="xl" className="border-border border-t" aria-labelledby="programs-cta-heading">
      <Container size="xl">
        <div className="grid grid-cols-1 gap-(--space-3xl) lg:grid-cols-[1fr_2fr]">
          {/* Left — editorial offset */}
          <div />

          {/* Right — CTA content */}
          <Stack gap="xl">
            <Stack gap="md">
              <h2
                id="programs-cta-heading"
                className="font-heading text-foreground text-3xl leading-[1.1] font-semibold tracking-tight sm:text-4xl lg:text-5xl"
              >
                Not sure where to begin?
              </h2>
              <Text tone="muted" className="max-w-prose leading-relaxed">
                Book a complimentary discovery call and together we will identify the most
                appropriate starting point for your journey. No obligation, no pressure — a
                conversation to help you find the right pathway.
              </Text>
            </Stack>

            <Stack direction="row" gap="sm" wrap="wrap">
              <NextLink
                href="/book-a-call"
                className={buttonVariants({ variant: 'primary', size: 'lg' })}
              >
                Book a Discovery Call
              </NextLink>
              <NextLink
                href="/contact"
                className={buttonVariants({ variant: 'outline', size: 'lg' })}
              >
                Contact Us
              </NextLink>
            </Stack>
          </Stack>
        </div>
      </Container>
    </Section>
  );
}
