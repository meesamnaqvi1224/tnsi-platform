import NextLink from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ChapterMarker, Container, Section, Stack, Text } from '@tnsi/ui';
import { executiveAdvisoryContent } from '@/content/executive-advisory';

const { areas } = executiveAdvisoryContent;

export function EaAreas() {
  return (
    <Section spacing="xl" className="border-border border-t" aria-label={areas.heading}>
      <Container size="xl">
        <Stack gap="3xl">
          <ChapterMarker index={areas.chapter} as="h2" title={areas.heading} />

          <div className="flex flex-col">
            {areas.panels.map((panel, index) => {
              const isReversed = index % 2 === 1;
              return (
                <article
                  key={panel.id}
                  className="border-border grid grid-cols-1 items-start gap-(--space-xl) border-t py-(--space-3xl) lg:grid-cols-2 lg:gap-(--space-4xl)"
                >
                  <div className={isReversed ? 'lg:order-2 lg:pt-(--space-md)' : ''}>
                    <h3 className="font-heading text-foreground text-2xl font-semibold tracking-tight sm:text-3xl lg:text-4xl">
                      {panel.title}
                    </h3>
                  </div>

                  <Stack gap="lg" className={isReversed ? 'lg:order-1' : 'lg:pt-(--space-md)'}>
                    <Text tone="muted" className="max-w-prose leading-relaxed">
                      {panel.description}
                    </Text>
                    <NextLink
                      href={panel.href}
                      className="interaction-text-link text-foreground group inline-flex items-center gap-(--space-sm) text-sm font-medium tracking-wide"
                    >
                      Learn More
                      <ArrowRight aria-hidden className="interaction-arrow size-4" />
                    </NextLink>
                  </Stack>
                </article>
              );
            })}
          </div>
        </Stack>
      </Container>
    </Section>
  );
}
