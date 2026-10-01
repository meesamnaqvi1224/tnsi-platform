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
            className="mx-auto mt-(--space-sm) max-w-3xl text-center text-4xl sm:text-5xl lg:text-[3.25rem]"
          >
            Fifteen years of clinical observation. One coherent framework.
          </Heading>
        </FadeIn>

        <FadeIn delayMs={100} className="mt-(--space-3xl)">
          <div
            className="border-border grid grid-cols-1 gap-(--space-xl) border-t pt-(--space-xl) sm:grid-cols-2 lg:grid-cols-4"
            role="list"
          >
            {evidence.map((item, index) => (
              <div key={item.label} role="listitem" className="flex flex-col gap-(--space-sm)">
                <span className="text-muted-foreground/50 font-mono text-xs tabular-nums">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="text-foreground text-sm font-semibold tracking-wide uppercase">
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
