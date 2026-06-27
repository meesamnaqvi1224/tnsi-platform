import { Container, Eyebrow, Section, Stack, Text } from '@tnsi/ui';

/**
 * Concept B — Section One: Full-width Statement Strip + Asymmetric Science Content
 * A two-part section: a tinted statement band arrests the eye,
 * then an asymmetric 1/3 + 2/3 grid explains the science.
 * Very little decoration — whitespace and type carry the weight.
 */
export function ConceptBSectionOne() {
  return (
    <>
      {/* Full-width statement strip — warm sand background, large centered prose */}
      <div className="border-border bg-secondary border-y py-(--space-3xl)">
        <Container size="xl">
          <p className="font-heading text-foreground mx-auto max-w-4xl text-center text-2xl leading-relaxed font-semibold tracking-tight lg:text-3xl">
            Nervous system dysregulation is not a personal failing. It is the predictable outcome of
            environments designed to override physiological signals in service of output.
          </p>
        </Container>
      </div>

      {/* Asymmetric two-column: short label heading left, body content right */}
      <Section spacing="xl" aria-labelledby="cb-s1-heading">
        <Container size="xl">
          <div className="grid grid-cols-1 gap-(--space-3xl) lg:grid-cols-[1fr_2fr]">
            <Stack gap="sm">
              <Eyebrow>The Science</Eyebrow>
              <h2
                id="cb-s1-heading"
                className="font-heading text-foreground text-3xl font-semibold tracking-tight"
              >
                Why this
                <br />
                approach
                <br />
                works.
              </h2>
            </Stack>

            <Stack gap="lg">
              <Text tone="muted" className="max-w-prose">
                Polyvagal theory gives us a map of the autonomic nervous system that explains why
                purely cognitive approaches are insufficient. When the body is in a threat state,
                the prefrontal cortex — the seat of reason, language, and insight — goes offline.
                Understanding that cannot reach below the brainstem.
              </Text>
              <Text tone="muted" className="max-w-prose">
                The Life Beyond Trauma method integrates top-down education (understanding the
                science) with bottom-up somatic approaches (working directly with the body&apos;s
                signals), creating change at the level where the pattern lives — not where we wish
                it did.
              </Text>
            </Stack>
          </div>
        </Container>
      </Section>
    </>
  );
}
