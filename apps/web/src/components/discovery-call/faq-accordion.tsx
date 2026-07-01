import { ChevronDown } from 'lucide-react';
import { ChapterMarker, Container, Section } from '@tnsi/ui';
import { discoveryCallContent } from '@/content/discovery-call';

const { faq } = discoveryCallContent;

export function FAQAccordion() {
  return (
    <Section
      spacing="xl"
      className="border-border border-t bg-[color-mix(in_oklch,var(--secondary)_10%,var(--background))]"
      aria-label={faq.heading}
    >
      <Container size="xl">
        <div className="mx-auto max-w-2xl">
          <ChapterMarker
            index={faq.chapter}
            as="h2"
            title={faq.heading}
            className="mb-(--space-3xl) text-center"
          />

          <div>
            {faq.items.map(({ question, answer }) => (
              <details
                key={question}
                className="group border-border/80 border-t transition-opacity duration-200 first:border-t"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-(--space-lg) py-(--space-xl) [&::-webkit-details-marker]:hidden">
                  <span className="font-heading text-foreground text-base font-medium tracking-tight">
                    {question}
                  </span>
                  <ChevronDown
                    aria-hidden
                    className="text-muted-foreground size-4 shrink-0 transition-transform duration-300 group-open:rotate-180"
                  />
                </summary>
                <div className="pb-(--space-xl)">
                  <p className="text-muted-foreground text-sm leading-[1.8]">{answer}</p>
                </div>
              </details>
            ))}
            <div className="border-border/80 border-t" aria-hidden />
          </div>
        </div>
      </Container>
    </Section>
  );
}
