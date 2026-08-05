import { ChevronDown } from 'lucide-react';
import { ChapterMarker, Container, Section, Stack } from '@tnsi/ui';
import { practitionerCertificationContent } from '@/content/practitioner-certification';

const { faq } = practitionerCertificationContent;

export function PcFaq() {
  return (
    <Section spacing="xl" className="border-foreground/15 border-t" aria-label={faq.heading}>
      <Container size="xl">
        <Stack gap="2xl">
          <ChapterMarker index={faq.chapter} as="h2" title={faq.heading} />

          <div className="max-w-3xl">
            {faq.items.map(({ question, answer }) => (
              <details key={question} className="group border-foreground/15 border-t">
                <summary className="interaction-accordion-summary">
                  <span className="font-heading text-foreground text-base font-semibold tracking-tight">
                    {question}
                  </span>
                  <ChevronDown aria-hidden className="interaction-accordion-icon" />
                </summary>
                <div className="pb-(--space-xl)">
                  <p className="text-muted-foreground text-sm leading-relaxed">{answer}</p>
                </div>
              </details>
            ))}
            <div className="border-foreground/15 border-t" aria-hidden />
          </div>
        </Stack>
      </Container>
    </Section>
  );
}
