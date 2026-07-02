import NextLink from 'next/link';
import { buttonVariants, cn, Container, Section, Stack, Text } from '@tnsi/ui';
import { executiveAdvisoryContent } from '@/content/executive-advisory';

const { cta } = executiveAdvisoryContent;

export function EaCta() {
  return (
    <Section
      spacing="xl"
      className="border-border bg-foreground text-background border-t"
      aria-labelledby="ea-cta-heading"
    >
      <Container size="xl">
        <Stack gap="3xl" className="mx-auto max-w-3xl text-center">
          <div className="flex flex-col items-center gap-(--space-sm)">
            <span className="text-background/50 font-mono text-xs tracking-[0.2em] uppercase">
              Chapter {cta.chapter}
            </span>
            <div className="border-background/20 w-12 border-t" aria-hidden />
          </div>

          <Stack gap="lg" className="items-center">
            <h2
              id="ea-cta-heading"
              className="font-heading text-foreground text-4xl leading-[1.1] font-semibold tracking-tight lg:text-5xl"
            >
              {cta.headline}
            </h2>
            <Text className="text-background/70 max-w-prose leading-relaxed">
              {cta.supportingCopy}
            </Text>
          </Stack>

          <Stack direction="row" gap="sm" wrap="wrap" className="justify-center">
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
                'border-background/30 text-background hover:bg-background/10',
              )}
            >
              {cta.secondaryCta.label}
            </NextLink>
          </Stack>
        </Stack>
      </Container>
    </Section>
  );
}
