import NextLink from 'next/link';
import { buttonVariants, ChapterMarker, Container, Section, Stack, Text } from '@tnsi/ui';
import { facultyContent } from '@/content/faculty';

const { speaking } = facultyContent;

export function SpeakingSection() {
  return (
    <Section
      spacing="xl"
      className="border-border bg-secondary/20 border-t"
      aria-label={speaking.heading}
    >
      <Container size="xl">
        <div className="grid grid-cols-1 items-start gap-(--space-3xl) lg:grid-cols-2 lg:gap-(--space-5xl)">
          <Stack gap="2xl">
            <ChapterMarker index={speaking.chapter} as="h2" title={speaking.heading} />

            <Text tone="muted" className="text-base leading-relaxed">
              {speaking.intro}
            </Text>

            <Stack direction="row" gap="sm" wrap="wrap">
              <NextLink
                href={speaking.primaryCta.href}
                className={buttonVariants({ variant: 'primary', size: 'lg' })}
              >
                {speaking.primaryCta.label}
              </NextLink>
              <NextLink
                href={speaking.secondaryCta.href}
                className={buttonVariants({ variant: 'outline', size: 'lg' })}
              >
                {speaking.secondaryCta.label}
              </NextLink>
            </Stack>
          </Stack>

          <Stack
            gap="xl"
            className="border-border border-t pt-(--space-2xl) lg:border-t-0 lg:border-l lg:pt-0 lg:pl-(--space-4xl)"
          >
            <ul className="flex flex-col gap-(--space-md)">
              {speaking.audiences.map((audience) => (
                <li
                  key={audience}
                  className="font-heading text-foreground text-xl font-medium tracking-tight"
                >
                  {audience}
                </li>
              ))}
            </ul>
            <Text tone="muted" className="text-sm leading-relaxed">
              {speaking.supportingCopy}
            </Text>
          </Stack>
        </div>
      </Container>
    </Section>
  );
}
