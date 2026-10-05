import { Container, Section, Stack, Text } from '@tnsi/ui';
import { MethodChapterHeading } from '@/components/method/method-chapter-heading';
import { FadeIn } from '@/components/utility/fade-in';
import { humanExpansionTheoryContent } from '@/content/human-expansion-theory';

const { whyNewFramework, centralProposition } = humanExpansionTheoryContent;

const bodyText = 'text-foreground/75 text-[1.0625rem] leading-[1.75] sm:text-lg';

export function MethodFoundation() {
  return (
    <>
      {/* Why a New Framework? — heading arrives first, the copy follows it. */}
      <Section
        id="why-a-new-framework"
        data-chapter
        className="border-border border-t py-(--space-4xl) sm:py-(--space-5xl)"
        aria-label={whyNewFramework.heading}
      >
        <Container size="xl">
          <div className="grid grid-cols-1 gap-(--space-2xl) lg:grid-cols-[5fr_7fr] lg:gap-(--space-4xl)">
            <FadeIn>
              <MethodChapterHeading title={whyNewFramework.heading} />
            </FadeIn>
            <FadeIn delayMs={200}>
              <Stack gap="lg" className="max-w-[62ch] lg:pt-(--space-lg)">
                {whyNewFramework.paragraphs.map((paragraph) => (
                  <Text key={paragraph} className={bodyText}>
                    {paragraph}
                  </Text>
                ))}
              </Stack>
            </FadeIn>
          </div>
        </Container>
      </Section>

      {/* The Central Proposition — an intellectual pause: heading, then the
          proposition itself at display scale, then the supporting copy. */}
      <Section
        data-chapter
        className="border-border bg-secondary border-t py-(--space-4xl) sm:py-(--space-5xl)"
        aria-label={centralProposition.heading}
      >
        <Container size="xl">
          <div className="grid grid-cols-1 gap-(--space-2xl) lg:grid-cols-[5fr_7fr] lg:gap-(--space-4xl)">
            <FadeIn className="lg:sticky lg:top-32 lg:self-start">
              <MethodChapterHeading title={centralProposition.heading} />
            </FadeIn>
            <Stack gap="xl">
              <FadeIn delayMs={150}>
                <p className="font-heading text-foreground max-w-[26ch] text-[clamp(1.75rem,3.2vw,2.75rem)] leading-[1.18] font-medium tracking-tight text-balance sm:max-w-none">
                  {centralProposition.statement}
                </p>
              </FadeIn>
              <FadeIn delayMs={350}>
                <Stack gap="lg" className="max-w-[62ch]">
                  {centralProposition.paragraphs.map((paragraph) => (
                    <Text key={paragraph} className={bodyText}>
                      {paragraph}
                    </Text>
                  ))}
                </Stack>
              </FadeIn>
            </Stack>
          </div>
        </Container>
      </Section>
    </>
  );
}
