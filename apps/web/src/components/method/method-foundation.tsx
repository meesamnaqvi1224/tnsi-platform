import { Container, Section } from '@tnsi/ui';

const columns = [
  {
    id: 'challenge',
    label: 'The Challenge',
    body: `Achievement culture does not create dysregulation. It selects for it.
The people most rewarded by this culture are often those who have learned most
efficiently to override their physiological signals — which is not resilience.
It is delay.`,
  },
  {
    id: 'science',
    label: 'The Science',
    body: `Polyvagal theory describes three physiological states: social engagement,
mobilisation, and shutdown. Sustainable performance requires access to the first.
Most high-achieving adults spend their productive years cycling between the
second and third, mistaking activation for capacity.`,
  },
  {
    id: 'transformation',
    label: 'The Transformation',
    body: `Change at this level is not psychological. It is physiological — new neural
pathways built through structured education, not insight alone. The method does
not teach you to manage the pattern. It teaches the nervous system to no longer
need it.`,
  },
] as const;

export function MethodFoundation() {
  return (
    <Section
      id="method-foundation"
      spacing="xl"
      className="border-border border-t"
      aria-labelledby="method-foundation-heading"
    >
      <Container size="xl">
        <p className="text-muted-foreground mb-(--space-3xl) text-xs tracking-widest uppercase">
          Three perspectives
        </p>

        <div className="grid grid-cols-1 gap-(--space-3xl) lg:grid-cols-3">
          {columns.map((col) => (
            <div key={col.id} className="border-border border-t pt-(--space-xl)">
              <h2
                id={col.id === 'challenge' ? 'method-foundation-heading' : undefined}
                className="font-heading text-foreground mb-(--space-lg) text-base font-semibold tracking-tight"
              >
                {col.label}
              </h2>
              <p className="text-muted-foreground text-base leading-relaxed whitespace-pre-line">
                {col.body}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
