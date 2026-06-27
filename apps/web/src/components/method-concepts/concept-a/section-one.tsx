import { Container, Section, Stack, Text } from '@tnsi/ui';

/**
 * Concept A — Section One: Centered Pull-Quote + Three Editorial Columns
 * A broadsheet-style structure: ruled horizontal lines create editorial
 * rhythm. The pull-quote sits between rules, then the body fans into
 * three equal columns below — each a standalone perspective.
 */
export function ConceptASectionOne() {
  return (
    <Section spacing="xl" aria-labelledby="ca-s1-heading">
      <Container size="xl">
        {/* Centered pull-quote between rules */}
        <div className="border-border border-t pt-(--space-xl)">
          <div className="mx-auto max-w-3xl py-(--space-2xl) text-center">
            <p
              id="ca-s1-heading"
              className="font-heading text-foreground text-3xl leading-snug font-semibold tracking-tight lg:text-4xl"
            >
              &ldquo;High performance and nervous system dysregulation are not a trade-off. They are
              two descriptions of the same problem.&rdquo;
            </p>
            <Text size="sm" tone="muted" className="mt-(--space-md)">
              Caroline Reed — Founder &amp; Director
            </Text>
          </div>
        </div>

        {/* Three-column editorial body — ruled top */}
        <div className="border-border grid grid-cols-1 gap-(--space-2xl) border-t pt-(--space-2xl) lg:grid-cols-3">
          <Stack gap="sm">
            <Text
              as="span"
              size="sm"
              tone="muted"
              weight="semibold"
              className="tracking-widest uppercase"
            >
              The Problem
            </Text>
            <Text tone="muted">
              Achievement culture teaches us to treat physiological signals as noise to override.
              The result is a generation of high performers who have succeeded themselves into
              exhaustion.
            </Text>
          </Stack>

          <Stack gap="sm">
            <Text
              as="span"
              size="sm"
              tone="muted"
              weight="semibold"
              className="tracking-widest uppercase"
            >
              The Insight
            </Text>
            <Text tone="muted">
              The nervous system is not a metaphor. It is the biological substrate through which
              every thought, decision, and relationship is mediated. Changing it requires education,
              not willpower.
            </Text>
          </Stack>

          <Stack gap="sm">
            <Text
              as="span"
              size="sm"
              tone="muted"
              weight="semibold"
              className="tracking-widest uppercase"
            >
              The Method
            </Text>
            <Text tone="muted">
              Fifteen years of clinical practice synthesised into a structured educational
              framework: grounded in polyvagal theory, attachment research, and somatic approaches —
              designed to be rigorous, not reductive.
            </Text>
          </Stack>
        </div>
      </Container>
    </Section>
  );
}
