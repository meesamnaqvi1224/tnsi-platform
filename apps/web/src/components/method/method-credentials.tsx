import { Container, EditorialFigure, InstitutionalEvidence, Section, Stack, Text } from '@tnsi/ui';

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
          <Stack gap="lg" className="max-w-2xl">
            <p className="text-muted-foreground text-xs tracking-[0.15em] uppercase">
              The evidence base
            </p>
            <p className="font-heading text-foreground text-2xl leading-[1.2] font-semibold tracking-tight sm:text-3xl lg:text-4xl">
              Fifteen years of clinical observation.
              <br />
              One coherent framework.
            </p>
            <Text tone="muted" className="max-w-prose">
              The Life Beyond Trauma method was not assembled from popular frameworks. It emerged
              from clinical work — from the patterns Caroline Reed observed, repeatedly, across
              thousands of hours with high-achieving clients who had already tried everything else.
            </Text>
          </Stack>

          <InstitutionalEvidence items={credentials} />

          <EditorialFigure
            number={1}
            caption="The Polyvagal Hierarchy — three levels of the autonomic nervous system and their corresponding physiological and behavioural states. The method is designed to cultivate reliable access to the ventral vagal system (social engagement), not to eliminate the mobilisation or shutdown responses, which remain necessary adaptive capacities."
            source="Porges, S.W. (2011). The Polyvagal Theory: Neurophysiological Foundations of Emotions, Attachment, Communication, and Self-Regulation. W.W. Norton."
          />
        </Stack>
      </Container>
    </Section>
  );
}
