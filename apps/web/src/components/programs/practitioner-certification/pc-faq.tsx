import { ChapterMarker, Container, Section, Stack } from '@tnsi/ui';
import { FadeIn } from '@/components/utility/fade-in';
import { practitionerCertificationContent } from '@/content/practitioner-certification';
import { PcFaqItem } from './pc-faq-item';

const { faq } = practitionerCertificationContent;

export function PcFaq() {
  return (
    <Section spacing="lg" className="border-foreground/15 border-t" aria-label={faq.heading}>
      <Container size="xl">
        <Stack gap="2xl">
          <FadeIn>
            <ChapterMarker index={faq.chapter} as="h2" title={faq.heading} />
          </FadeIn>

          <FadeIn delayMs={100}>
            <div className="max-w-3xl">
              {faq.items.map(({ question, answer }) => (
                <PcFaqItem key={question} question={question} answer={answer} />
              ))}
              <div className="border-foreground/15 border-t" aria-hidden />
            </div>
          </FadeIn>
        </Stack>
      </Container>
    </Section>
  );
}
