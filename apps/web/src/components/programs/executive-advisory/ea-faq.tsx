import { Container, Heading, Section } from '@tnsi/ui';
import { FadeIn } from '@/components/utility/fade-in';
import { executiveAdvisoryContent } from '@/content/executive-advisory';
import { EaFaqItem } from './ea-faq-item';

const { faq } = executiveAdvisoryContent;

export function EaFaq() {
  return (
    <Section
      id="ea-faq"
      spacing="xl"
      className="border-border bg-secondary/40 scroll-mt-36 border-t"
      aria-label={faq.heading}
    >
      <Container size="xl">
        <div className="grid grid-cols-1 gap-(--space-3xl) lg:grid-cols-[1fr_1.5fr]">
          <FadeIn>
            <Heading as="h2" size="xl">
              {faq.heading}
            </Heading>
          </FadeIn>

          <FadeIn delayMs={100}>
            <div>
              {faq.items.map(({ question, answer }) => (
                <EaFaqItem key={question} question={question} answer={answer} />
              ))}
              <div className="border-foreground/15 border-t" aria-hidden />
            </div>
          </FadeIn>
        </div>
      </Container>
    </Section>
  );
}
