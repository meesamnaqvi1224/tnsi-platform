import { ChevronDown } from 'lucide-react';
import { Container, Section, Stack } from '@tnsi/ui';

const faqs = [
  {
    question: 'Which program should I begin with?',
    answer:
      'For most people, Life Beyond Trauma is the natural starting point. It is designed for individuals who are ready to understand their nervous system, build lasting regulation and move beyond chronic stress, burnout or survival patterns. If you are a practitioner looking to integrate this work into your professional practice, the Practitioner Certification is the appropriate pathway. For leaders and organisations, Executive Advisory is designed to meet that context specifically. If you are still unsure, a complimentary Discovery Call will help identify the most appropriate starting point.',
  },
  {
    question: 'Can I join if I am already working with a therapist?',
    answer:
      'Yes. Institute programs are education-led rather than therapy-led and are designed to complement, not replace, therapeutic work. Many participants find that the nervous system education they receive through our programs deepens and accelerates the work they are doing in individual therapy. We encourage you to inform your therapist that you are joining and to use both in an integrated way.',
  },
  {
    question: 'Do I need previous experience?',
    answer:
      'No. Life Beyond Trauma is designed to begin at the foundation — no prior knowledge of neuroscience, polyvagal theory or somatic practice is required. The program builds from first principles. Practitioner Certification assumes professional experience in a relevant field (therapy, coaching, healthcare or a related discipline) but does not require prior knowledge of nervous system science specifically.',
  },
  {
    question: 'Which program is right for me?',
    answer:
      'The right program depends on where you are and what you are seeking. If you are navigating personal stress, burnout, overwhelm or survival patterns, Life Beyond Trauma is designed for you. If you are a professional wanting to bring this work into your client practice, Practitioner Certification provides the structure, supervision and credentialing to do that. If you are leading a team or organisation and want to address the physiological dimension of leadership and culture, Executive Advisory is the appropriate pathway. If any of these descriptions feel approximate rather than certain, a Discovery Call will help clarify.',
  },
] as const;

export function ProgramsFaq() {
  return (
    <Section spacing="xl" className="border-border border-t" aria-labelledby="faq-heading">
      <Container size="xl">
        <Stack gap="sm" className="mb-(--space-3xl) max-w-2xl">
          <p className="text-muted-foreground text-xs tracking-widest uppercase">
            Frequently asked questions
          </p>
          <h2
            id="faq-heading"
            className="font-heading text-foreground text-4xl font-semibold tracking-tight"
          >
            Common questions.
          </h2>
        </Stack>

        <div className="max-w-3xl">
          {faqs.map(({ question, answer }) => (
            <details key={question} className="group border-border border-t">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-(--space-lg) py-(--space-lg) [&::-webkit-details-marker]:hidden">
                <span className="font-heading text-foreground text-base font-semibold tracking-tight">
                  {question}
                </span>
                <ChevronDown
                  aria-hidden
                  className="text-muted-foreground size-4 shrink-0 transition-transform duration-200 group-open:rotate-180"
                />
              </summary>
              <div className="pb-(--space-xl)">
                <p className="text-muted-foreground text-sm leading-relaxed">{answer}</p>
              </div>
            </details>
          ))}
          {/* Closing rule after the last item */}
          <div className="border-border border-t" aria-hidden />
        </div>
      </Container>
    </Section>
  );
}
