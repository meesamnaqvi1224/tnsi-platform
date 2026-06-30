import NextLink from 'next/link';
import { buttonVariants, Container, Section, Stack, Text } from '@tnsi/ui';
import { resourcesContent } from '@/content/resources';

const { closing } = resourcesContent;

export function ResourcesClosing() {
  return (
    <Section
      spacing="xl"
      className="border-border border-t"
      aria-labelledby="resources-closing-heading"
    >
      <Container size="xl">
        <Stack gap="3xl" className="mx-auto max-w-4xl text-center">
          <div className="flex flex-col items-center gap-(--space-sm)">
            <span className="text-muted-foreground font-mono text-xs tracking-[0.2em] uppercase">
              Chapter {closing.chapter}
            </span>
            <div className="border-border w-12 border-t" aria-hidden />
          </div>

          <Stack gap="lg" className="items-center">
            <h2
              id="resources-closing-heading"
              className="font-heading text-foreground text-4xl leading-[1.1] font-semibold tracking-tight lg:text-5xl"
            >
              {closing.headline}
            </h2>
            <Text tone="muted" className="max-w-2xl leading-relaxed">
              {closing.supportingCopy}
            </Text>
          </Stack>

          <Stack direction="row" gap="sm" wrap="wrap" className="justify-center">
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
