import NextLink from 'next/link';
import { ChapterMarker, Container, Section, Stack, Text } from '@tnsi/ui';
import { discoveryCallContent } from '@/content/discovery-call';

const { alternativeContact } = discoveryCallContent;

function ContactCard({
  title,
  value,
  href,
  description,
}: {
  title: string;
  value: string;
  href?: string;
  description: string;
}) {
  const valueContent = href ? (
    <NextLink
      href={href}
      className="interaction-text-link text-foreground hover:text-muted-foreground text-lg font-medium"
    >
      {value}
    </NextLink>
  ) : (
    <p className="text-foreground text-lg font-medium">{value}</p>
  );

  return (
    <article className="interaction-card-surface interaction-focus bg-background/50 hover:bg-background flex flex-1 flex-col gap-(--space-lg) rounded-lg border p-(--space-2xl)">
      <Stack gap="sm">
        <h3 className="font-heading text-foreground text-lg font-semibold tracking-tight">
          {title}
        </h3>
        {valueContent}
        <Text tone="muted" className="text-sm leading-relaxed">
          {description}
        </Text>
      </Stack>
    </article>
  );
}

export function AlternativeContact() {
  return (
    <Section
      spacing="xl"
      className="border-border border-t bg-[color-mix(in_oklch,var(--secondary)_12%,var(--background))]"
      aria-label={alternativeContact.heading}
    >
      <Container size="xl">
        <Stack gap="3xl">
          <ChapterMarker
            index={alternativeContact.chapter}
            as="h2"
            title={alternativeContact.heading}
            className="mx-auto max-w-2xl text-center lg:mx-0 lg:text-left"
          />

          <div className="grid grid-cols-1 gap-(--space-lg) md:grid-cols-3">
            {alternativeContact.items.map((item) => (
              <ContactCard key={item.id} {...item} />
            ))}
          </div>
        </Stack>
      </Container>
    </Section>
  );
}
