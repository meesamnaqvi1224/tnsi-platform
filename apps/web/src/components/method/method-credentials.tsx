import { Container, EditorialFigure, Section, Stack, Text } from '@tnsi/ui';
import { ResponsiveImage } from '@/components/utility/responsive-image';

const credentials = [
  {
    label: 'Clinical Practice',
    statement:
      'Fifteen years in private practice working with high-achieving women and senior executives across Europe and North America — observing, at the individual level, the patterns that underpin collective burnout and sustainable leadership.',
  },
  {
    label: 'Post-Graduate Training',
    statement:
      'Advanced certification in polyvagal theory, attachment-informed therapy, and somatic approaches to nervous system regulation. Training grounded in clinical application, not theoretical survey.',
  },
  {
    label: 'Research Foundation',
    statement:
      'Methodology built from peer-reviewed neuroscience and fifteen years of clinical observation. The Institute teaches what the evidence supports — not what is currently popular in the wellness or coaching industries.',
  },
  {
    label: 'Academic Teaching',
    statement:
      'Faculty experience delivering trauma-informed nervous system education to practitioners, psychologists, and healthcare professionals seeking structured, certifiable training.',
  },
] as const;

export function MethodCredentials() {
  return (
    <Section
      spacing="xl"
      className="border-border border-t"
      aria-label="The science and evidence base"
    >
      <Container size="xl">
        <Stack gap="2xl">
          {/* Headline block over photography — same dark token-scope pattern used
              elsewhere for image-backed sections (see MethodQuote). */}
          <div className="relative overflow-hidden rounded-sm">
            <ResponsiveImage
              src="/images/contact/office.webp"
              alt=""
              fill
              className="object-cover"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-black/55" aria-hidden />

            <div className="dark text-foreground relative">
              <Stack
                gap="lg"
                className="max-w-2xl px-(--space-xl) py-(--space-3xl) sm:px-(--space-2xl)"
              >
                <p className="text-muted-foreground text-xs tracking-[0.15em] uppercase">
                  The evidence base
                </p>
                <p className="font-heading text-foreground text-2xl leading-[1.2] font-semibold tracking-tight sm:text-3xl lg:text-4xl">
                  Fifteen years of clinical observation.
                  <br />
                  One coherent framework.
                </p>
                <Text tone="muted" className="max-w-prose">
                  The Life Beyond Trauma method was not assembled from popular frameworks. It
                  emerged from clinical work — from the patterns Caroline Reed observed, repeatedly,
                  across thousands of hours with high-achieving clients who had already tried
                  everything else.
                </Text>
              </Stack>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-(--space-lg) sm:grid-cols-2 lg:grid-cols-4">
            {credentials.map((item) => (
              <div
                key={item.label}
                className="bg-secondary border-border rounded-sm border p-(--space-lg)"
              >
                <span className="text-muted-foreground text-xs tracking-widest uppercase">
                  {item.label}
                </span>
                <p className="text-muted-foreground mt-(--space-xs) text-sm leading-relaxed">
                  {item.statement}
                </p>
              </div>
            ))}
          </div>

          <EditorialFigure
            number={1}
            caption="The Polyvagal Hierarchy — three levels of the autonomic nervous system and their corresponding physiological and behavioural states. The method is designed to cultivate reliable access to the ventral vagal system (social engagement), not to eliminate the mobilisation or shutdown responses, which remain necessary adaptive capacities."
            source="Porges, S.W. (2011). The Polyvagal Theory: Neurophysiological Foundations of Emotions, Attachment, Communication, and Self-Regulation. W.W. Norton."
          >
            <ResponsiveImage
              src="/images/research/area-regulation.webp"
              alt="An open notebook with hand-drawn nervous system and vagus nerve regulation sketches, beside neuroscience textbooks on a wooden desk."
              width={1600}
              height={1000}
              className="h-auto w-full object-cover"
              sizes="(max-width: 1024px) 100vw, 80vw"
            />
          </EditorialFigure>
        </Stack>
      </Container>
    </Section>
  );
}
