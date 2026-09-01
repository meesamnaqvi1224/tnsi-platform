import { Container, Eyebrow, Heading, Section } from '@tnsi/ui';
import { FadeIn } from '@/components/utility/fade-in';

const evidence = [
  {
    label: 'Polyvagal Theory',
    statement: 'Evidence-informed understanding of physiological regulation.',
  },
  {
    label: 'Attachment Science',
    statement: 'How relationships shape lifelong nervous system patterns.',
  },
  {
    label: 'Somatic Practice',
    statement: 'Body-based approaches supporting sustainable change.',
  },
  {
    label: 'Neuroscience',
    statement: 'Research that informs every aspect of our methodology.',
  },
] as const;

export function InstitutionalCredibility() {
  return (
    <Section spacing="lg" aria-labelledby="credibility-heading">
      <Container size="xl">
        <FadeIn>
          <Eyebrow className="text-center">Evidence &amp; Expertise</Eyebrow>
          <Heading
            as="h2"
            id="credibility-heading"
            size="lg"
            className="mx-auto mt-(--space-xs) max-w-2xl text-center text-3xl sm:text-4xl"
          >
            Fifteen years of clinical observation. One coherent framework.
          </Heading>
        </FadeIn>

        <FadeIn className="mt-(--space-2xl)">
          {/* Same card treatment as `TrustBar` above — bordered, filled boxes, not the
              hairline-rule grammar `InstitutionalEvidence` in @tnsi/ui uses elsewhere
              (e.g. /method); that shared component tops out at 3 columns, so this stays
              hand-rolled at 4. */}
          <div className="grid grid-cols-1 gap-(--space-md) sm:grid-cols-2 lg:grid-cols-4">
            {evidence.map((item) => (
              <div
                key={item.label}
                className="border-border bg-card flex flex-col gap-(--space-xs) rounded-sm border px-(--space-lg) py-(--space-lg)"
              >
                <span className="text-muted-foreground text-xs tracking-widest uppercase">
                  {item.label}
                </span>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.statement}</p>
              </div>
            ))}
          </div>
        </FadeIn>
      </Container>
    </Section>
  );
}
