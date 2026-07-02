import { ChevronDown } from 'lucide-react';
import { ChapterMarker, Container, Section } from '@tnsi/ui';
import { contactContent } from '@/content/contact';

const { faq } = contactContent;

export function FAQAccordion() {
  return (
    <Section spacing="xl" className="border-border border-t" aria-label={faq.heading}>
      <Container size="xl">
        <div className="grid grid-cols-1 gap-(--space-3xl) lg:grid-cols-[1fr_1.5fr]">
          <ChapterMarker
            index={faq.chapter}
            as="h2"
            title={faq.heading}
            className="lg:sticky lg:top-(--space-3xl) lg:self-start"
          />

          <div>
            {faq.items.map(({ question, answer }) => (
              <details key={question} className="group border-border border-t">
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
            <div className="border-border border-t" aria-hidden />
          </div>
        </div>
      </Container>
    </Section>
  );
}
