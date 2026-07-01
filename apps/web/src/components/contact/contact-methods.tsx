import NextLink from 'next/link';
import { ChapterMarker, Container, Section, Stack, Text } from '@tnsi/ui';
import { contactContent } from '@/content/contact';

const { methods } = contactContent;

export function ContactMethods() {
  return (
    <Section spacing="xl" className="border-border border-t" aria-label={methods.heading}>
      <Container size="xl">
        <Stack gap="3xl">
          <ChapterMarker index={methods.chapter} as="h2" title={methods.heading} />

          <div className="grid grid-cols-1 gap-(--space-lg) md:grid-cols-2">
            {methods.items.map((item) => (
              <article
                key={item.id}
                className="border-border/70 hover:bg-secondary/20 flex flex-col gap-(--space-lg) border p-(--space-2xl) transition-colors duration-300"
              >
                <Stack gap="sm">
                  <h3 className="font-heading text-foreground text-lg font-semibold tracking-tight">
                    {item.title}
                  </h3>
                  <NextLink
                    href={item.href}
                    className="text-foreground hover:text-muted-foreground text-base font-medium transition-colors duration-200"
                  >
                    {item.email}
                  </NextLink>
                </Stack>
                <Text tone="muted" className="text-sm leading-relaxed">
                  {item.description}
                </Text>
                <p className="text-muted-foreground font-mono text-xs tracking-wide uppercase">
                  {item.responseTime}
                </p>
              </article>
            ))}
          </div>
        </Stack>
      </Container>
    </Section>
  );
}
