import NextLink from 'next/link';
import { buttonVariants, Container, Heading, Section, Stack, Text } from '@tnsi/ui';
import { FadeIn } from '@/components/utility/fade-in';
import { humanExpansionTheoryContent } from '@/content/human-expansion-theory';

const { finalCta } = humanExpansionTheoryContent;

export function MethodFinalCta() {
  return (
    <Section
      spacing="xl"
      className="bg-secondary py-(--space-4xl) sm:py-(--space-5xl)"
      aria-labelledby="method-final-cta-heading"
    >
      <Container size="md">
        <FadeIn>
          <Stack gap="lg" align="center" className="text-center">
            <Heading
              as="h2"
              id="method-final-cta-heading"
              size="2xl"
              className="text-4xl sm:text-5xl"
            >
              {finalCta.heading}
            </Heading>
            <Text tone="muted" size="lg" className="max-w-2xl">
              {finalCta.supportingCopy}
            </Text>
            <NextLink
              href={finalCta.cta.href}
              className={buttonVariants({ variant: 'primary', size: 'lg' })}
            >
              {finalCta.cta.label}
            </NextLink>
          </Stack>
        </FadeIn>
      </Container>
    </Section>
  );
}
