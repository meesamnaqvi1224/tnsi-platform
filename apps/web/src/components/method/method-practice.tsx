import { Container, Section, Stack, Text } from '@tnsi/ui';
import { MethodChapterHeading } from '@/components/method/method-chapter-heading';
import { MethodImageSection } from '@/components/method/method-image-section';
import { FadeIn } from '@/components/utility/fade-in';
import { humanExpansionTheoryContent } from '@/content/human-expansion-theory';

const { theoryToPractice, evolving } = humanExpansionTheoryContent;

const onImageBodyText = 'text-foreground text-[1.0625rem] leading-[1.75] sm:text-lg';
const bodyText = 'text-foreground/75 text-[1.0625rem] leading-[1.75] sm:text-lg';

export function MethodPractice() {
  return (
    <>
      {/* From Theory to Practice — the framework on the left stays in view
          while the pathways it informs arrive one after another on the right. */}
      <Section
        data-chapter
        className="border-border border-t py-(--space-4xl) sm:py-(--space-5xl)"
        aria-label={theoryToPractice.heading}
      >
        <Container size="xl">
          <div className="grid grid-cols-1 gap-(--space-3xl) lg:grid-cols-[5fr_7fr] lg:gap-(--space-4xl)">
            <FadeIn className="lg:sticky lg:top-32 lg:self-start">
              <MethodChapterHeading title={theoryToPractice.heading} />
              <Stack gap="lg" className="mt-(--space-lg) max-w-[44ch]">
                {theoryToPractice.paragraphs.map((paragraph) => (
                  <Text key={paragraph} className={bodyText}>
                    {paragraph}
                  </Text>
                ))}
              </Stack>
            </FadeIn>

            <ul className="list-none">
              {theoryToPractice.pathways.map((pathway, index) => (
                <li key={pathway.title}>
                  <FadeIn
                    delayMs={index === 0 ? 0 : 100}
                    className="border-foreground/20 flex flex-col gap-(--space-sm) border-t py-(--space-xl) first:pt-(--space-xl)"
                  >
                    <p className="font-heading text-foreground text-[clamp(1.5rem,2.4vw,2rem)] leading-[1.15] font-semibold tracking-tight">
                      {pathway.title}
                    </p>
                    <Text className={`${bodyText} max-w-[52ch]`}>{pathway.description}</Text>
                  </FadeIn>
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </Section>

      {/* An Evolving Body of Work — a large heading over the library
          photograph with plenty of air, the supporting copy following it. */}
      <MethodImageSection
        src="/images/resources/hero.webp"
        scrim="bg-black/[0.82]"
        aria-label={evolving.heading}
      >
        <Container size="xl">
          <div className="grid grid-cols-1 gap-(--space-2xl) lg:grid-cols-[6fr_6fr] lg:gap-(--space-4xl)">
            <FadeIn>
              <MethodChapterHeading title={evolving.heading} size="major" />
            </FadeIn>
            <FadeIn delayMs={250}>
              <Stack gap="lg" className="max-w-[56ch] lg:pt-(--space-xl)">
                {evolving.paragraphs.map((paragraph) => (
                  <Text key={paragraph} className={onImageBodyText}>
                    {paragraph}
                  </Text>
                ))}
              </Stack>
            </FadeIn>
          </div>
        </Container>
      </MethodImageSection>
    </>
  );
}
