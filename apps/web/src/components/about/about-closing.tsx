import NextLink from 'next/link';
import { buttonVariants, Container, Heading, Section, Stack, Text } from '@tnsi/ui';
import { FadeIn } from '@/components/utility/fade-in';
import { aboutContent } from '@/content/about';

const { closing } = aboutContent;

export function AboutClosing() {
  return (
    <Section
      spacing="xl"
      className="bg-secondary py-(--space-4xl) sm:py-(--space-5xl)"
      aria-labelledby="about-closing-heading"
    >
      <Container size="md">
        <FadeIn>
          <Stack gap="lg" align="center" className="text-center">
            <Heading as="h2" id="about-closing-heading" size="2xl" className="text-4xl sm:text-5xl">
              {closing.headline}
            </Heading>
            <Text tone="muted" size="lg" className="max-w-2xl">
              {closing.supportingCopy}
            </Text>
            <NextLink
              href={closing.cta.href}
              className={buttonVariants({ variant: 'primary', size: 'lg' })}
            >
              {closing.cta.label}
            </NextLink>
            <Text size="sm" tone="muted">
              Or start lighter —{' '}
              <NextLink href="/assessment" className="interaction-text-link-underline font-medium">
                take the Capacity Assessment
              </NextLink>
            </Text>
          </Stack>
        </FadeIn>
      </Container>
    </Section>
  );
}
