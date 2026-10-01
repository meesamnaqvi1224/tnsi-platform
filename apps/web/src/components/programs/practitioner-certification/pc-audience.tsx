import { ChapterMarker, Container, Section, Stack, Text } from '@tnsi/ui';
import { FadeIn } from '@/components/utility/fade-in';
import { practitionerCertificationContent } from '@/content/practitioner-certification';

const { audience } = practitionerCertificationContent;

export function PcAudience() {
  return (
    <Section spacing="lg" className="border-foreground/15 border-t" aria-label={audience.heading}>
      <Container size="xl">
        <Stack gap="2xl">
          <FadeIn>
            <ChapterMarker index={audience.chapter} as="h2" size="2xl" title={audience.heading} />
          </FadeIn>

          <FadeIn delayMs={100}>
            <div
              className="grid grid-cols-1 gap-(--space-md) sm:grid-cols-2 lg:grid-cols-4"
              role="list"
              aria-label="Professional audiences"
            >
              {audience.professions.map((profession, index) => (
                <article
                  key={profession}
                  role="listitem"
                  className="border-foreground/15 flex flex-col gap-(--space-sm) border-t px-(--space-md) pt-(--space-xl) pb-(--space-lg)"
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
          </FadeIn>

          <FadeIn delayMs={160}>
            <Text tone="muted" size="lg" className="max-w-3xl leading-[1.7]">
              {audience.closingCopy}
            </Text>
          </FadeIn>
        </Stack>
      </Container>
    </Section>
  );
}
