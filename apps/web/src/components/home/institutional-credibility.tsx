import { Container, Heading, Section } from '@tnsi/ui';
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
          <Heading
            as="h2"
            id="credibility-heading"
            size="lg"
            className="mx-auto max-w-2xl text-center text-3xl sm:text-4xl"
          >
            Fifteen years of clinical observation. One coherent framework.
          </Heading>
        </FadeIn>

        <FadeIn className="mt-(--space-2xl)">
          {/* Same visual grammar as `InstitutionalEvidence` in @tnsi/ui (hairline rules,
              label + statement, no cards) but hand-rolled at 4 columns — that component's
              grid tops out at 3 and is shared with /method, so it isn't touched here. */}
          <div className="border-border border-y py-(--space-2xl)">
            <div className="grid grid-cols-1 gap-(--space-2xl) sm:grid-cols-2 lg:grid-cols-4">
              {evidence.map((item) => (
                <div key={item.label} className="flex flex-col gap-(--space-xs)">
                  <span className="text-muted-foreground text-xs tracking-widest uppercase">
                    {item.label}
                  </span>
                  <p className="text-muted-foreground text-sm leading-relaxed">{item.statement}</p>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      </Container>
    </Section>
  );
}
