import NextLink from 'next/link';
import { buttonVariants, Container, Section, Stack, Text } from '@tnsi/ui';
import { discoveryCallContent } from '@/content/discovery-call';

const { closing } = discoveryCallContent;

export function DiscoveryClosing() {
  return (
    <Section
      spacing="xl"
      className="border-border border-t bg-[color-mix(in_oklch,var(--secondary)_15%,var(--background))]"
      aria-labelledby="discovery-closing-heading"
    >
      <Container size="xl" className="py-(--space-2xl) lg:py-(--space-4xl)">
        <Stack gap="3xl" className="mx-auto max-w-3xl text-center">
          <div className="flex flex-col items-center gap-(--space-sm)">
            <span className="text-muted-foreground font-mono text-xs tracking-[0.2em] uppercase">
              Chapter {closing.chapter}
            </span>
            <div className="border-border/60 w-16 border-t" aria-hidden />
          </div>

          <Stack gap="lg" className="items-center">
            <h2
              id="discovery-closing-heading"
              className="font-heading text-foreground text-4xl leading-[1.15] font-semibold tracking-tight lg:text-5xl"
            >
              {closing.headline}
            </h2>
            <Text tone="muted" className="max-w-xl text-base leading-[1.8]">
              {closing.supportingCopy}
            </Text>
          </Stack>

          <Stack direction="row" gap="md" wrap="wrap" className="justify-center">
            <NextLink
              href={closing.primaryCta.href}
              className={buttonVariants({ variant: 'primary', size: 'lg' })}
            >
              {closing.primaryCta.label}
            </NextLink>
            <NextLink
              href={closing.secondaryCta.href}
              className={buttonVariants({ variant: 'outline', size: 'lg' })}
            >
              {closing.secondaryCta.label}
            </NextLink>
          </Stack>
        </Stack>
      </Container>
    </Section>
  );
}
