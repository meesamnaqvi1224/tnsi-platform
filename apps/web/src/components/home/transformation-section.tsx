import { Container, Eyebrow, Section } from '@tnsi/ui';
import { FadeIn } from '@/components/utility/fade-in';

const outcomes = [
  'You recover more quickly.',
  'Relationships feel less exhausting.',
  'Rest no longer feels unsafe.',
  'Work becomes more sustainable.',
  'Life requires less survival.',
] as const;

export function TransformationSection() {
  return (
    <Section spacing="xl" aria-labelledby="transformation-heading" className="text-center">
      <Container size="md">
        <FadeIn>
          <Eyebrow className="mb-(--space-2xl)">What Changes</Eyebrow>
        </FadeIn>

        <div className="flex flex-col items-center">
          {outcomes.map((outcome, index) => (
            <FadeIn key={outcome} delayMs={index * 90} className="flex flex-col items-center">
              <p
                id={index === 0 ? 'transformation-heading' : undefined}
                className="font-heading text-foreground text-2xl font-medium tracking-tight sm:text-3xl"
              >
                {outcome}
              </p>
              {index < outcomes.length - 1 && (
                <span aria-hidden className="text-muted-foreground my-(--space-lg) text-lg">
                  ↓
                </span>
              )}
            </FadeIn>
          ))}
        </div>
      </Container>
    </Section>
  );
}
