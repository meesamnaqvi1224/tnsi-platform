import { ChapterMarker, Container, Section, Stack, Text } from '@tnsi/ui';
import { contactContent } from '@/content/contact';

const { visit } = contactContent;

export function VisitSection() {
  return (
    <Section spacing="xl" className="border-border border-t" aria-label={visit.heading}>
      <Container size="xl">
        <div className="grid grid-cols-1 gap-(--space-3xl) lg:grid-cols-2 lg:gap-(--space-5xl)">
          <Stack gap="2xl">
            <ChapterMarker index={visit.chapter} as="h2" title={visit.heading} />
            <Text tone="muted" className="max-w-prose text-base leading-relaxed">
              {visit.description}
            </Text>

            <dl className="flex flex-col gap-(--space-lg)">
              {visit.placeholders.map(({ label, value }) => (
                <div
                  key={label}
                  className="border-border flex flex-col gap-(--space-xs) border-t pt-(--space-lg)"
                >
                  <dt className="text-muted-foreground font-mono text-xs tracking-[0.15em] uppercase">
                    {label}
                  </dt>
                  <dd className="text-foreground text-sm leading-relaxed">{value}</dd>
                </div>
              ))}
            </dl>
          </Stack>

          <div
            aria-label={visit.mapAlt}
            className="border-border/70 bg-secondary/30 relative flex min-h-[20rem] items-center justify-center border lg:min-h-full"
          >
            <Text size="sm" tone="muted" className="max-w-[14rem] text-center">
              Map placeholder — Institute location forthcoming
            </Text>
          </div>
        </div>
      </Container>
    </Section>
  );
}
