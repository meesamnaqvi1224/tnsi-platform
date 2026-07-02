import NextLink from 'next/link';
import { buttonVariants, Container, Section, Stack, Text } from '@tnsi/ui';
import { contactContent } from '@/content/contact';

const { collaboration } = contactContent;

export function CollaborationCTA() {
  return (
    <Section
      spacing="xl"
      className="border-border bg-secondary/20 border-t"
      aria-labelledby="collaboration-heading"
    >
      <Container size="xl">
        <Stack gap="2xl" className="mx-auto max-w-3xl text-center">
          <div className="flex flex-col items-center gap-(--space-sm)">
            <span className="text-muted-foreground font-mono text-xs tracking-[0.2em] uppercase">
              Chapter {collaboration.chapter}
            </span>
            <div className="border-border w-12 border-t" aria-hidden />
          </div>

          <h2
            id="collaboration-heading"
            className="font-heading text-foreground text-2xl font-semibold tracking-tight sm:text-3xl lg:text-4xl"
          >
            {collaboration.heading}
          </h2>

          <Text tone="muted" className="max-w-2xl leading-relaxed">
            {collaboration.supportingCopy}
          </Text>

          <Stack direction="row" gap="sm" wrap="wrap" className="justify-center">
            <NextLink
              href={collaboration.primaryCta.href}
              className={buttonVariants({ variant: 'primary', size: 'lg' })}
            >
              {collaboration.primaryCta.label}
            </NextLink>
            <NextLink
              href={collaboration.secondaryCta.href}
              className={buttonVariants({ variant: 'outline', size: 'lg' })}
            >
              {collaboration.secondaryCta.label}
            </NextLink>
          </Stack>
        </Stack>
      </Container>
    </Section>
  );
}
