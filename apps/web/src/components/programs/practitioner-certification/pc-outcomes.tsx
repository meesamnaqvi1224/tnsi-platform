import { ChapterMarker, Container, Section, Stack } from '@tnsi/ui';
import { practitionerCertificationContent } from '@/content/practitioner-certification';

const { outcomes } = practitionerCertificationContent;

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
    <div className="border-foreground/15 flex flex-col gap-(--space-xl) border-t pt-(--space-xl)">
      <p className="text-muted-foreground font-mono text-xs tracking-[0.2em] uppercase">{label}</p>
      <ul className="flex flex-col gap-(--space-lg)" role="list">
        {items.map((item) => (
          <li
            key={item}
            className={`font-heading text-base font-semibold tracking-tight sm:text-lg ${
              variant === 'after' ? 'text-foreground' : 'text-muted-foreground'
            }`}
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PcOutcomes() {
  return (
    <Section spacing="xl" className="border-foreground/15 border-t" aria-label={outcomes.heading}>
      <Container size="xl">
        <Stack gap="2xl">
          <ChapterMarker index={outcomes.chapter} as="h2" title={outcomes.heading} />

          <div className="grid grid-cols-1 gap-(--space-3xl) lg:grid-cols-2 lg:gap-(--space-4xl)">
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
