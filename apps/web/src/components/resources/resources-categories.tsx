import NextLink from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ChapterMarker, Container, Section, Stack, Text } from '@tnsi/ui';
import { resourcesContent } from '@/content/resources';

const { categories } = resourcesContent;

const categoryTones = [
  'bg-background',
  'bg-secondary/50',
  'bg-background',
  'bg-secondary/30',
] as const;

export function ResourcesCategories() {
  return (
    <Section
      id="categories"
      spacing="xl"
      className="border-border border-t"
      aria-label={categories.heading}
    >
      <Container size="xl">
        <Stack gap="3xl">
          <ChapterMarker index={categories.chapter} as="h2" title={categories.heading} />

          <div className="flex flex-col">
            {categories.items.map((category, index) => (
              <article
                key={category.id}
                className={`border-border grid grid-cols-1 gap-(--space-xl) border-t px-(--space-xl) py-(--space-4xl) sm:px-(--space-2xl) lg:grid-cols-[1fr_2fr] lg:items-end lg:gap-(--space-5xl) ${categoryTones[index % categoryTones.length]}`}
              >
                <div className="flex flex-col gap-(--space-md)">
                  <h3 className="font-heading text-foreground text-4xl font-semibold tracking-tight lg:text-5xl">
                    {category.title}
                  </h3>
                  <span className="text-muted-foreground font-mono text-xs tracking-[0.2em] uppercase">
                    {category.count}
                  </span>
                </div>

                <Stack gap="lg">
                  <Text tone="muted" className="max-w-prose leading-relaxed">
                    {category.description}
                  </Text>
                  <NextLink
                    href={category.href}
                    className="text-foreground group inline-flex items-center gap-(--space-sm) text-sm font-medium tracking-wide"
                  >
                    Explore
                    <ArrowRight
                      aria-hidden
                      className="size-4 transition-transform duration-200 group-hover:translate-x-1"
                    />
                  </NextLink>
                </Stack>
              </article>
            ))}
          </div>
        </Stack>
      </Container>
    </Section>
  );
}
