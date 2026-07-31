import { Container, Eyebrow } from '@tnsi/ui';
import { FadeIn } from '@/components/utility/fade-in';
import { ResponsiveImage } from '@/components/utility/responsive-image';

const outcomes = [
  'You recover more quickly.',
  'Relationships feel less exhausting.',
  'Rest no longer feels unsafe.',
  'Work becomes more sustainable.',
  'Life requires less survival.',
] as const;

export function TransformationSection() {
  return (
    <section aria-labelledby="transformation-heading" className="relative overflow-hidden">
      <ResponsiveImage
        src="/images/research/hero.webp"
        alt=""
        fill
        className="object-cover"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-black/60" aria-hidden />

      <div className="dark text-foreground relative py-(--space-4xl)">
        <Container size="md" className="text-center">
          <FadeIn>
            <Eyebrow className="text-muted-foreground mb-(--space-2xl)">What Changes</Eyebrow>
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
      </div>
    </section>
  );
}
