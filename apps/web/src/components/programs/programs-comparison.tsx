import NextLink from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Container, Section, Stack, Text } from '@tnsi/ui';
import { programsOverviewContent } from '@/content/programs';

const { comparison } = programsOverviewContent;

const attributes = [
  { key: 'audience' as const, label: 'Best for' },
  { key: 'format' as const, label: 'Format' },
  { key: 'duration' as const, label: 'Duration' },
  { key: 'outcome' as const, label: 'Outcome' },
];

function ComparisonCard({
  title,
  audience,
  format,
  duration,
  outcome,
  href,
}: (typeof comparison)[number]) {
  const values = { audience, format, duration, outcome };

  return (
    <article className="border-border flex h-full flex-col border p-(--space-xl)">
      <Stack gap="xl" className="flex-1">
        <h3 className="font-heading text-foreground text-xl font-semibold tracking-tight lg:text-2xl">
          {title}
        </h3>

        <Stack gap="md">
          {attributes.map(({ key, label }) => (
            <div key={key} className="border-border border-t pt-(--space-md)">
              <p className="text-muted-foreground mb-(--space-2xs) text-xs tracking-[0.15em] uppercase">
                {label}
              </p>
              <Text size="sm" tone="muted" className="leading-relaxed">
                {values[key]}
              </Text>
            </div>
          ))}
        </Stack>
      </Stack>

      <NextLink
        href={href}
        className="interaction-text-link text-foreground hover:text-muted-foreground mt-(--space-xl) inline-flex items-center gap-(--space-xs) text-sm font-medium"
      >
        Explore
        <ArrowRight aria-hidden className="size-4" />
      </NextLink>
    </article>
  );
}

export function ProgramsComparison() {
  return (
    <Section
      spacing="xl"
      className="border-border bg-secondary border-t"
      aria-labelledby="comparison-heading"
    >
      <Container size="xl">
        <p
          id="comparison-heading"
          className="text-muted-foreground mb-(--space-3xl) text-xs tracking-[0.15em] uppercase"
        >
          Compare pathways
        </p>

        <div className="grid grid-cols-1 gap-(--space-lg) md:grid-cols-3">
          {comparison.map((program) => (
            <ComparisonCard key={program.title} {...program} />
          ))}
        </div>
      </Container>
    </Section>
  );
}
