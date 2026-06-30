import { ChapterMarker, Container, Section, Stack } from '@tnsi/ui';
import { executiveAdvisoryContent } from '@/content/executive-advisory';

const { outcomes } = executiveAdvisoryContent;

function OutcomeColumn({
  label,
  items,
  variant,
}: {
  label: string;
  items: readonly string[];
  variant: 'before' | 'after';
}) {
  return (
    <div className="flex flex-col gap-(--space-2xl)">
      <p className="text-muted-foreground font-mono text-[0.625rem] tracking-[0.2em] uppercase">
        {label}
      </p>
      <ul className="flex flex-col gap-(--space-xl)" role="list">
        {items.map((item) => (
          <li
            key={item}
            className={`font-heading leading-snug font-semibold tracking-tight ${
              variant === 'after'
                ? 'text-foreground text-2xl lg:text-3xl'
                : 'text-muted-foreground text-xl lg:text-2xl'
            }`}
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function EaOutcomes() {
  return (
    <Section spacing="xl" className="border-border border-t" aria-label={outcomes.heading}>
      <Container size="xl">
        <Stack gap="3xl">
          <ChapterMarker index={outcomes.chapter} as="h2" title={outcomes.heading} />

          <div className="border-border grid grid-cols-1 gap-(--space-4xl) border-t pt-(--space-3xl) lg:grid-cols-2">
            <OutcomeColumn
              label={outcomes.before.label}
              items={outcomes.before.items}
              variant="before"
            />
            <OutcomeColumn
              label={outcomes.after.label}
              items={outcomes.after.items}
              variant="after"
            />
          </div>
        </Stack>
      </Container>
    </Section>
  );
}
