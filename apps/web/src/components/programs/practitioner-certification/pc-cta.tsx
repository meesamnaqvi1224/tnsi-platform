import NextLink from 'next/link';
import { buttonVariants, Container, Section, Stack, Text } from '@tnsi/ui';
import { practitionerCertificationContent } from '@/content/practitioner-certification';

const { cta } = practitionerCertificationContent;

export function PcCta() {
  return (
    <Section spacing="xl" className="border-border border-t" aria-labelledby="pc-cta-heading">
      <Container size="xl">
        <div className="grid grid-cols-1 gap-(--space-3xl) lg:grid-cols-[1fr_2fr]">
          <div className="flex flex-col gap-(--space-sm) lg:pt-(--space-lg)">
            <span className="text-muted-foreground font-mono text-xs tracking-[0.2em] uppercase">
              Chapter {cta.chapter}
            </span>
            <div className="border-border w-12 border-t" aria-hidden />
          </div>

          <Stack gap="xl">
            <Stack gap="md">
              <h2
                id="pc-cta-heading"
                className="font-heading text-foreground text-3xl leading-[1.1] font-semibold tracking-tight sm:text-4xl lg:text-5xl"
              >
                {cta.headline}
              </h2>
              <Text tone="muted" className="max-w-prose leading-relaxed">
                {cta.supportingCopy}
              </Text>
            </Stack>

            <Stack direction="row" gap="sm" wrap="wrap">
              <NextLink
                href={cta.primaryCta.href}
                className={buttonVariants({ variant: 'primary', size: 'lg' })}
              >
                {cta.primaryCta.label}
              </NextLink>
              <NextLink
                href={cta.secondaryCta.href}
                className={buttonVariants({ variant: 'outline', size: 'lg' })}
              >
                {cta.secondaryCta.label}
              </NextLink>
            </Stack>
          </Stack>
        </div>
      </Container>
    </Section>
  );
}
