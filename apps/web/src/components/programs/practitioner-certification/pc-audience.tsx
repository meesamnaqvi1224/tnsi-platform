import { ChapterMarker, Container, Section, Stack, Text } from '@tnsi/ui';
import { practitionerCertificationContent } from '@/content/practitioner-certification';

const { audience } = practitionerCertificationContent;

export function PcAudience() {
  return (
    <Section spacing="xl" className="border-border border-t" aria-label={audience.heading}>
      <Container size="xl">
        <Stack gap="2xl">
          <ChapterMarker index={audience.chapter} as="h2" title={audience.heading} />

          <div
            className="grid grid-cols-1 gap-(--space-md) sm:grid-cols-2 lg:grid-cols-3"
            role="list"
            aria-label="Professional audiences"
          >
            {audience.professions.map((profession, index) => (
              <article
                key={profession}
                role="listitem"
                className="border-border flex flex-col gap-(--space-sm) border-t px-(--space-md) pt-(--space-xl) pb-(--space-lg)"
              >
                <span className="text-muted-foreground font-mono text-xs tabular-nums">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="font-heading text-foreground text-xl font-semibold tracking-tight">
                  {profession}
                </h3>
              </article>
            ))}
          </div>

          <Text tone="muted" className="max-w-3xl leading-relaxed">
            {audience.closingCopy}
          </Text>
        </Stack>
      </Container>
    </Section>
  );
}
