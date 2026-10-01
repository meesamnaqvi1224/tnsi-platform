import { Container, Section, Stack, Text } from '@tnsi/ui';
import { FadeIn } from '@/components/utility/fade-in';
import { executiveAdvisoryContent } from '@/content/executive-advisory';

const { challenge } = executiveAdvisoryContent;

/**
 * The page's single philosophical statement — interrupts the normal
 * heading+paragraph rhythm on purpose. Left: the statement. Right: the
 * supporting paragraphs, arriving just after. Section id doubles as the
 * first anchor-nav target ("The Approach").
 */
export function EaChallenge() {
  return (
    <Section
      id="ea-approach"
      className="border-border scroll-mt-36 border-t py-(--space-4xl) sm:py-(--space-5xl)"
      aria-label={challenge.heading}
    >
      <Container size="xl">
        <div className="grid grid-cols-1 gap-(--space-3xl) lg:grid-cols-[3fr_2fr] lg:gap-(--space-5xl)">
          <FadeIn>
            <h2 className="font-heading text-foreground max-w-xl text-4xl leading-[1.08] font-semibold tracking-tight text-balance sm:text-5xl lg:text-[3.75rem] xl:text-[4.25rem]">
              {challenge.heading}
            </h2>
          </FadeIn>

          <FadeIn delayMs={200}>
            <Stack gap="lg" className="lg:pt-(--space-sm)">
              {challenge.paragraphs.map((paragraph) => (
                <Text key={paragraph} tone="muted" className="leading-relaxed">
                  {paragraph}
                </Text>
              ))}
            </Stack>
          </FadeIn>
        </div>
      </Container>
    </Section>
  );
}
