import { Container, Section, Stack, Text } from '@tnsi/ui';
import { executiveAdvisoryContent } from '@/content/executive-advisory';

const { journey } = executiveAdvisoryContent;

export function EaJourney() {
  return (
    <Section
      spacing="xl"
      className="border-border bg-foreground text-background border-t"
      aria-label={journey.heading}
    >
      <Container size="xl">
        <Stack gap="3xl">
          <div className="max-w-2xl">
            <div className="flex flex-col gap-(--space-sm)">
              <span className="text-background/50 font-mono text-xs tracking-[0.2em] uppercase">
                Chapter {journey.chapter}
              </span>
              <div className="border-background/20 border-t" aria-hidden />
            </div>
            <h2 className="font-heading mt-(--space-sm) text-4xl font-semibold tracking-tight">
              {journey.heading}
            </h2>
            <Text className="text-background/70 mt-(--space-lg) leading-relaxed">
              {journey.intro}
            </Text>
          </div>

          <ol
            className="mx-auto flex w-full max-w-xl flex-col items-center"
            aria-label="Advisory engagement steps"
          >
            {journey.steps.map((step, index) => {
              const isLast = index === journey.steps.length - 1;
              return (
                <li key={step.title} className="flex w-full flex-col items-center">
                  <div className="flex w-full flex-col items-center gap-(--space-sm) py-(--space-xl) text-center">
                    <span className="text-background/40 font-mono text-[0.625rem] tracking-[0.2em] uppercase">
                      Phase {String(index + 1).padStart(2, '0')}
                    </span>
                    <p className="font-heading text-2xl font-semibold tracking-tight">
                      {step.title}
                    </p>
                    <Text size="sm" className="text-background/60 max-w-sm leading-relaxed">
                      {step.description}
                    </Text>
                  </div>
                  {!isLast && (
                    <span
                      aria-hidden
                      className="text-background/30 pb-(--space-md) font-mono text-lg"
                    >
                      ↓
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </Stack>
      </Container>
    </Section>
  );
}
