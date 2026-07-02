import NextLink from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ChapterMarker, Container, Section, Stack, Text } from '@tnsi/ui';
import { resourcesContent } from '@/content/resources';

const { guides } = resourcesContent;

export function ResourcesGuides() {
  return (
    <Section spacing="xl" className="border-border border-t" aria-label={guides.heading}>
      <Container size="xl">
        <div className="grid grid-cols-1 gap-(--space-4xl) lg:grid-cols-2 lg:gap-(--space-5xl)">
          <Stack gap="xl">
            <ChapterMarker index={guides.chapter} as="h2" title={guides.heading} />
            <Text tone="muted" className="max-w-prose leading-relaxed">
              {guides.intro}
            </Text>
          </Stack>

          <div className="flex flex-col gap-(--space-xl)">
            {guides.items.map((guide, index) => (
              <article
                key={guide.id}
                className="border-border flex flex-col gap-(--space-md) border-t pt-(--space-xl)"
              >
                <div className="flex items-baseline gap-(--space-md)">
                  <span className="text-muted-foreground font-mono text-xs tabular-nums">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <h3 className="font-heading text-foreground text-2xl font-semibold tracking-tight lg:text-3xl">
                    {guide.title}
                  </h3>
                </div>
                <Text tone="muted" size="sm" className="leading-relaxed">
                  {guide.description}
                </Text>
                <NextLink
                  href={guide.href}
                  className="text-foreground group inline-flex items-center gap-(--space-sm) text-sm font-medium tracking-wide"
                >
                  Download PDF
                  <ArrowRight
                    aria-hidden
                    className="size-4 transition-transform duration-200 group-hover:translate-x-1"
                  />
                </NextLink>
              </article>
            ))}
          </div>
        </div>
      </Container>
    </Section>
  );
}
