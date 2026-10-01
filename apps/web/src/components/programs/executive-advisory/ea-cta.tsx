import NextLink from 'next/link';
import { buttonVariants, cn, Container, Section, Stack, Text } from '@tnsi/ui';
import { FadeIn } from '@/components/utility/fade-in';
import { executiveAdvisoryContent } from '@/content/executive-advisory';

const { cta, hero } = executiveAdvisoryContent;

export function EaCta() {
  return (
    <Section
      spacing="xl"
      className="border-border bg-foreground text-background border-t py-(--space-4xl) sm:py-(--space-5xl)"
      aria-labelledby="ea-cta-heading"
    >
      <Container size="xl">
        <FadeIn>
          <Stack gap="lg" className="mx-auto max-w-3xl items-center text-center">
            <p className="text-background/50 font-mono text-xs tracking-[0.25em] uppercase">
              {hero.eyebrow}
            </p>

            <h2
              id="ea-cta-heading"
              className="font-heading text-4xl leading-[1.05] font-semibold tracking-tight sm:text-5xl lg:text-6xl xl:text-[4.5rem]"
            >
              {cta.headline}
            </h2>
            <Text className="text-background/70 max-w-prose text-base leading-relaxed sm:text-lg">
              {cta.supportingCopy}
            </Text>

            <Stack direction="row" gap="sm" wrap="wrap" className="justify-center pt-(--space-md)">
              <NextLink
                href={cta.primaryCta.href}
                className={cn(
                  buttonVariants({ variant: 'primary', size: 'lg' }),
                  'bg-background text-foreground hover:bg-background/90',
                )}
              >
                {cta.primaryCta.label}
              </NextLink>
              <NextLink
                href={cta.secondaryCta.href}
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'lg' }),
                  'border-background/30 text-background hover:bg-background/10 bg-transparent',
                )}
              >
                {cta.secondaryCta.label}
              </NextLink>
            </Stack>
          </Stack>
        </FadeIn>
      </Container>
    </Section>
  );
}
