import { ChapterMarker, Container, Section, Stack, Text } from '@tnsi/ui';
import { practitionerCertificationContent } from '@/content/practitioner-certification';

const { curriculum } = practitionerCertificationContent;

export function PcCurriculum() {
  return (
    <Section spacing="xl" className="border-foreground/15 border-t" aria-label={curriculum.heading}>
      <Container size="xl">
        <Stack gap="2xl">
          <Stack gap="lg" className="max-w-2xl">
            <ChapterMarker index={curriculum.chapter} as="h2" title={curriculum.heading} />
            <Text tone="muted" className="leading-relaxed">
              {curriculum.intro}
            </Text>
          </Stack>

          <ol
            className="relative flex flex-col gap-0"
            aria-label="Certification curriculum modules"
          >
            {curriculum.modules.map((module, index) => {
              const isLast = index === curriculum.modules.length - 1;
              return (
                <li
                  key={module.number}
                  className="border-foreground/15 relative grid grid-cols-[auto_minmax(0,1fr)] gap-(--space-lg) border-t py-(--space-xl) sm:grid-cols-[80px_minmax(0,1fr)]"
                >
                  {!isLast && (
                    <div
                      className="bg-border absolute top-(--space-xl) left-[15px] h-[calc(100%-var(--space-xl))] w-px sm:left-[39px]"
                      aria-hidden
                    />
                  )}

                  <div className="relative z-10 flex flex-col items-center gap-(--space-xs)">
                    <span className="bg-background border-foreground/15 text-muted-foreground flex size-8 items-center justify-center border font-mono text-xs tabular-nums">
                      {String(module.number).padStart(2, '0')}
                    </span>
                  </div>

                  <div className="flex min-w-0 flex-col justify-center gap-(--space-xs)">
                    <span className="text-muted-foreground font-mono text-[0.625rem] tracking-[0.15em] uppercase">
                      Module {module.number}
                    </span>
                    <p className="font-heading text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
                      {module.title}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </Stack>
      </Container>
    </Section>
  );
}
