import { AlertCircle, Check } from 'lucide-react';
import { ChapterMarker, Container, Section, Text } from '@tnsi/ui';
import { discoveryCallContent } from '@/content/discovery-call';

const { eligibility } = discoveryCallContent;

export function EligibilitySection() {
  return (
    <Section
      id={eligibility.id}
      spacing="xl"
      className="border-border border-t bg-[color-mix(in_oklch,var(--secondary)_12%,var(--background))]"
      aria-label={eligibility.heading}
    >
      <Container size="xl">
        <div className="grid grid-cols-1 gap-(--space-3xl) lg:grid-cols-[1fr_1.4fr] lg:gap-(--space-5xl)">
          <ChapterMarker
            index={eligibility.chapter}
            as="h2"
            title={eligibility.heading}
            className="lg:sticky lg:top-(--space-3xl) lg:self-start"
          />

          <div className="grid grid-cols-1 gap-(--space-2xl) md:grid-cols-2">
            <div className="flex flex-col gap-(--space-lg)">
              <h3 className="font-heading text-foreground text-lg font-semibold tracking-tight">
                {eligibility.idealHeading}
              </h3>
              <ul className="flex flex-col gap-(--space-md)">
                {eligibility.idealItems.map((item) => (
                  <li key={item} className="flex gap-(--space-md)">
                    <Check
                      aria-hidden
                      className="text-foreground mt-0.5 size-4 shrink-0 opacity-70"
                      strokeWidth={1.5}
                    />
                    <Text tone="muted" className="text-sm leading-relaxed">
                      {item}
                    </Text>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-(--space-lg)">
              <h3 className="font-heading text-foreground text-lg font-semibold tracking-tight">
                {eligibility.notAppropriateHeading}
              </h3>
              <ul className="flex flex-col gap-(--space-md)">
                {eligibility.notAppropriateItems.map((item) => (
                  <li key={item} className="flex gap-(--space-md)">
                    <span
                      aria-hidden
                      className="text-muted-foreground mt-0.5 size-4 shrink-0 text-center text-sm leading-none"
                    >
                      •
                    </span>
                    <Text tone="muted" className="text-sm leading-relaxed">
                      {item}
                    </Text>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div
          role="note"
          className="border-border/70 bg-background/50 mt-(--space-3xl) flex gap-(--space-md) rounded-lg border p-(--space-xl) lg:mt-(--space-4xl)"
        >
          <AlertCircle
            aria-hidden
            className="text-muted-foreground mt-0.5 size-4 shrink-0"
            strokeWidth={1.5}
          />
          <Text tone="muted" className="text-sm leading-relaxed">
            {eligibility.crisisNotice}
          </Text>
        </div>
      </Container>
    </Section>
  );
}
