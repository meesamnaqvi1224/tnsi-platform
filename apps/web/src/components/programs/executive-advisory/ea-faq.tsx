import { ChevronDown } from 'lucide-react';
import { ChapterMarker, Container, Section } from '@tnsi/ui';
import { executiveAdvisoryContent } from '@/content/executive-advisory';

const { faq } = executiveAdvisoryContent;

export function EaFaq() {
  return (
    <Section
      spacing="xl"
      className="border-border bg-secondary/40 border-t"
      aria-label={faq.heading}
    >
      <Container size="xl">
        <div className="grid grid-cols-1 gap-(--space-3xl) lg:grid-cols-[1fr_1.5fr]">
          <ChapterMarker index={faq.chapter} as="h2" title={faq.heading} />

          <div>
            {faq.items.map(({ question, answer }) => (
              <details key={question} className="group border-border border-t">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-(--space-lg) py-(--space-xl) [&::-webkit-details-marker]:hidden">
                  <span className="font-heading text-foreground text-base font-semibold tracking-tight">
                    {question}
                  </span>
                  <ChevronDown
                    aria-hidden
                    className="text-muted-foreground size-4 shrink-0 transition-transform duration-300 group-open:rotate-180"
                  />
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
