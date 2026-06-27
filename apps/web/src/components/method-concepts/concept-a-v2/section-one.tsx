import { Container } from '@tnsi/ui';

/**
 * Concept A v2 — Section One: Pull Quote as Standalone Emotional Transition
 *
 * In v1 this section combined the pull quote and three columns.
 * In v2 they are separated so each carries its full weight independently.
 *
 * This section is one idea, one sentence, one breath.
 * py-5xl (128px each side) + min-h-[45vh] guarantees the reader
 * experiences it as a distinct moment — not a caption passing by.
 *
 * The full-width border-t above is the only structural element.
 * Typography does everything else.
 */
export function ConceptAV2SectionOne() {
  return (
    <section
      aria-label="Editorial quote"
      className="border-border flex min-h-[45vh] items-center border-t py-[var(--space-5xl)]"
    >
      <Container size="xl">
        <div className="mx-auto max-w-4xl text-center">
          {/* Full-width rule above quote — a second beat before the words land */}
          <div className="border-border mx-auto mb-(--space-2xl) w-16 border-t" />

          <p
            id="ca-v2-s1-quote"
            className="font-heading text-foreground text-3xl leading-[1.3] font-semibold tracking-tight lg:text-4xl xl:text-5xl"
          >
            &ldquo;Healing doesn&apos;t begin when you think differently.
            <br className="hidden sm:block" /> It begins when your nervous system experiences
            safety.&rdquo;
          </p>

          <div className="border-border mx-auto mt-(--space-2xl) mb-(--space-2xl) w-16 border-t" />

          <p className="text-muted-foreground text-sm">Caroline Reed — Founder &amp; Director</p>
        </div>
      </Container>
    </section>
  );
}
